import {
  SESSION_COOKIE,
  clearRateLimit,
  clearedCookie,
  clientIp,
  createSession,
  destroySession,
  getAccount,
  isOwnerEmail,
  isRateLimited,
  normalizeEmail,
  readCookie,
  requireOwner,
  sessionCookie,
  verifyPassword,
} from "@/lib/auth";

const fail = (error: string, status = 400): Response => Response.json({ error }, { status });

/**
 * Identical for "not the owner", "no account" and "wrong password", so this
 * endpoint never reveals which address is the owner's.
 */
const BAD_CREDENTIALS = "Email or password is incorrect.";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const handle = async (req: Request): Promise<Response> => {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("Malformed request.");
  }

  const action = String(body.action ?? "");

  if (action === "me") {
    return Response.json({ owner: await requireOwner(req) });
  }

  if (action === "logout") {
    await destroySession(readCookie(req, SESSION_COOKIE));
    return Response.json({ owner: null }, { headers: { "Set-Cookie": clearedCookie() } });
  }

  if (action === "login") {
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const ip = clientIp(req);

    if (!EMAIL_RE.test(email)) return fail("Enter a valid email address.");

    // Two windows: a wide one per IP, a tighter one per address, so the one
    // account cannot be ground down from many IPs.
    if (await isRateLimited("login-ip", ip, 20, 900)) {
      return fail("Too many attempts. Try again in a few minutes.", 429);
    }
    if (await isRateLimited("login-email", email, 8, 900)) {
      return fail("Too many attempts for that account. Try again in a few minutes.", 429);
    }
    if (!isOwnerEmail(email)) return fail(BAD_CREDENTIALS, 401);

    const account = await getAccount(email);
    if (!account) return fail(BAD_CREDENTIALS, 401);
    if (!(await verifyPassword(account, password))) return fail(BAD_CREDENTIALS, 401);

    await clearRateLimit("login-email", email);

    const sid = await createSession(email);
    return Response.json({ owner: email }, { headers: { "Set-Cookie": sessionCookie(sid) } });
  }

  return fail("Unknown action.");
};

/** Redis or network failures come back as a readable error instead of an empty 500. */
export const POST = async (req: Request): Promise<Response> => {
  try {
    return await handle(req);
  } catch (err) {
    console.error("auth request failed", err);
    return fail("Couldn't reach the login service. Try again in a moment.", 503);
  }
};
