import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://ssm:ssm@localhost:5432/ssm"
  },
  casing: "snake_case",
  strict: true,
  verbose: true
});
