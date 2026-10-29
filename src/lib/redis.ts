import { Redis } from "@upstash/redis";

let client: Redis | null = null;

// Lazy for the same reason as the db client: the env only exists at runtime
// on Workers, and `next build` imports every route.
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    client ??= Redis.fromEnv();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
