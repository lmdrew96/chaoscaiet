import { cookies } from "next/headers";
import { redis } from "./redis";

/**
 * Single-owner login, ported from Kindling / Tangle / personal-context-mcp.
 *
 * It's a diary, so everything is gated: every page sits under the (app)
 * layout's owner check and every API route calls ownerGate. Only the address
 * in OWNER_EMAIL can ever hold a session. There is no sign-up route; the one
 * account is written by `pnpm seed:owner`.
 *
 * No third-party auth provider: email plus password, PBKDF2 via Web Crypto,
 * and opaque session ids in Redis behind an httpOnly cookie.
 */

// ─── Key space ───────────────────────────────────────────────────────────────

const accountKey = (email: string): string => `caiet:account:${email}`;
const sessionKey = (sid: string): string => `caiet:session:${sid}`;
const rateKey = (scope: string, id: string): string => `caiet:rl:${scope}:${id}`;

export const SESSION_COOKIE = "caiet_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Account {
  email: string;
  passwordHash: string; // base64
  salt: string; // base64
  iterations: number;
  hash: string; // e.g. "SHA-256"
  createdAt: string;
}

// ─── Owner allowlist ────────────────────────────────────────────────────────

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** False when OWNER_EMAIL is unset, so a missing secret locks the diary rather than opening it. */
export const isOwnerEmail = (email: string): boolean => {
  const owner = process.env.OWNER_EMAIL;
  return Boolean(owner) && normalizeEmail(owner!) === normalizeEmail(email);
};

// ─── Password hashing ────────────────────────────────────────────────────────

// Kindling uses 600k, but workerd refuses PBKDF2 above 100k iterations
// ("Pbkdf2 failed: iteration counts above 100000 are not supported").
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export const MIN_PASSWORD_LENGTH = 10;

const toB64 = (buf: ArrayBuffer): string => Buffer.from(new Uint8Array(buf)).toString("base64");

const fromB64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));

const derive = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
  hash: string,
): Promise<ArrayBuffer> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash },
    keyMaterial,
    KEY_BYTES * 8,
  );
};

export const hashPassword = async (
  password: string,
): Promise<Pick<Account, "passwordHash" | "salt" | "iterations" | "hash">> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await derive(password, salt, PBKDF2_ITERATIONS, PBKDF2_HASH);
  return {
    passwordHash: toB64(bits),
    salt: toB64(salt.buffer as ArrayBuffer),
    iterations: PBKDF2_ITERATIONS,
    hash: PBKDF2_HASH,
  };
};

/** Length-independent compare, so a wrong password can't be timed out character by character. */
const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

export const verifyPassword = async (account: Account, password: string): Promise<boolean> => {
  const bits = await derive(
    password,
    fromB64(account.salt),
    // Read off the record rather than the constant, so changing the cost later
    // doesn't lock out an existing account.
    account.iterations ?? PBKDF2_ITERATIONS,
    account.hash ?? PBKDF2_HASH,
  );
  return timingSafeEqual(new Uint8Array(bits), fromB64(account.passwordHash));
};

// ─── Accounts ────────────────────────────────────────────────────────────────

export const getAccount = async (email: string): Promise<Account | null> =>
  (await redis.get<Account>(accountKey(email))) ?? null;

export const putAccount = async (account: Account): Promise<void> => {
  await redis.set(accountKey(account.email), account);
};

// ─── Sessions ────────────────────────────────────────────────────────────────

const randomB64Url = (bytes: number): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");

export const createSession = async (email: string): Promise<string> => {
  const sid = randomB64Url(32);
  await redis.set(sessionKey(sid), email, { ex: SESSION_TTL_SECONDS });
  return sid;
};

export const readSession = async (sid: string | undefined): Promise<string | null> => {
  if (!sid) return null;
  return (await redis.get<string>(sessionKey(sid))) ?? null;
};

export const destroySession = async (sid: string | undefined): Promise<void> => {
  if (sid) await redis.del(sessionKey(sid));
};

export const sessionCookie = (sid: string): string =>
  `${SESSION_COOKIE}=${sid}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;

export const clearedCookie = (): string =>
  `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

/** Parsed off the raw header rather than next/headers, so this works in any route handler. */
export const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
};

/**
 * The owner's email for a request, or null. Re-checks the allowlist on every
 * call, so changing OWNER_EMAIL revokes an old session immediately.
 */
export const requireOwner = async (req: Request): Promise<string | null> => {
  const email = await readSession(readCookie(req, SESSION_COOKIE));
  return email && isOwnerEmail(email) ? email : null;
};

/**
 * For owner API routes: null when the request is the owner's, otherwise the
 * response to send. A session-store failure is a 503 with a readable message,
 * not a crash, so the editor can say what went wrong.
 */
export const ownerGate = async (req: Request): Promise<Response | null> => {
  try {
    if (await requireOwner(req)) return null;
    return Response.json({ error: "Log in first." }, { status: 401 });
  } catch (err) {
    console.error("owner session check failed", err);
    return Response.json({ error: "Couldn't reach the login service. Try again in a moment." }, { status: 503 });
  }
};

/** Same check for a server component, which has the cookie jar rather than the Request. */
export const ownerFromCookies = async (): Promise<string | null> => {
  const jar = await cookies();
  const email = await readSession(jar.get(SESSION_COOKIE)?.value);
  return email && isOwnerEmail(email) ? email : null;
};

// ─── Rate limiting ───────────────────────────────────────────────────────────

/** Hashed so a raw IP or email never becomes a Redis key name. */
const rateId = async (id: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return Buffer.from(new Uint8Array(digest)).toString("hex").slice(0, 32);
};

export const clientIp = (req: Request): string =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  "unknown";

/**
 * Fails OPEN. A Redis blip should not lock the owner out of signing in; the
 * error is logged rather than swallowed.
 */
export const isRateLimited = async (
  scope: string,
  id: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> => {
  try {
    const k = rateKey(scope, await rateId(id));
    const n = await redis.incr(k);
    if (n === 1) {
      await redis.expire(k, windowSeconds);
    } else if ((await redis.ttl(k)) < 0) {
      // INCR created the key but the EXPIRE never landed. Without this repair
      // the counter never resets and the caller is locked out permanently.
      await redis.expire(k, windowSeconds);
    }
    return n > max;
  } catch (err) {
    console.error("rate limit check failed", err);
    return false;
  }
};

export const clearRateLimit = async (scope: string, id: string): Promise<void> => {
  try {
    await redis.del(rateKey(scope, await rateId(id)));
  } catch (err) {
    console.error("rate limit clear failed", err);
  }
};
