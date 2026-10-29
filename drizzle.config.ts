import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local the way Next does.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (CI): DATABASE_URL comes from the environment.
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
