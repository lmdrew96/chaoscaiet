/**
 * Sets (or resets) the one account's password. Run it yourself in a terminal:
 *
 *   pnpm seed:owner
 *
 * It reads OWNER_EMAIL and the Upstash credentials from .env.local (or the
 * environment), asks for the password without echoing it, and writes the
 * hashed account to Redis. The password never touches a file or a log.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { MIN_PASSWORD_LENGTH, hashPassword, normalizeEmail, putAccount, type Account } from "../src/lib/auth";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: everything comes from the environment.
}

/** Prompts with echo off, so the password doesn't show on screen or in scrollback. */
const askHidden = (question: string): Promise<string> =>
  new Promise((resolve) => {
    let muted = false;
    const output = new Writable({
      write: (chunk, _enc, done) => {
        if (!muted) process.stdout.write(chunk);
        done();
      },
    });
    const rl = createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });

const main = async (): Promise<void> => {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) throw new Error("OWNER_EMAIL isn't set (.env.local or the environment).");
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't set.");
  }

  const email = normalizeEmail(owner);
  console.log(`Setting the password for ${email}.`);
  const password = await askHidden("Password: ");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if ((await askHidden("Again: ")) !== password) throw new Error("Those didn't match.");

  const account: Account = {
    email,
    ...(await hashPassword(password)),
    createdAt: new Date().toISOString(),
  };
  await putAccount(account);
  console.log("Saved. Sign in at /login.");
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
