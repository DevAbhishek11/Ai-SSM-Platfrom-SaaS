import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_BASE_URL: z.url().default("http://localhost:3000"),
  API_BASE_URL: z.url().default("http://localhost:4000/api"),
  DATABASE_URL: z.string().min(1).default("postgres://ssm:ssm@localhost:5432/ssm"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ISSUER: z.string().min(1).default("ssm-local"),
  JWT_AUDIENCE: z.string().min(1).default("ssm-web"),
  JWT_ACCESS_SECRET: z.string().min(16).default("local-development-access-secret-change-me"),
  DATABASE_HEALTHCHECK: z.enum(["metadata", "strict"]).default("metadata"),
  DEMO_USER_PASSWORD: z.string().min(8).default("demo-password-change-me")
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}
