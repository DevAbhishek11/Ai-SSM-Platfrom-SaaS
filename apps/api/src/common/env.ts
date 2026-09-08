import { z } from "zod";
import { aiProviderSelectionModes } from "@ssm/domain";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  WEB_BASE_URL: z.url().default("http://localhost:3000"),
  API_BASE_URL: z.url().default("http://localhost:4000/api"),
  DATABASE_URL: z.string().min(1).default("postgres://ssm:ssm@localhost:5432/ssm"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ISSUER: z.string().min(1).default("ssm-local"),
  JWT_AUDIENCE: z.string().min(1).default("ssm-web"),
  JWT_ACCESS_SECRET: z.string().min(16).default("local-development-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16).default("local-development-refresh-secret-change-me"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(86_400).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
  /**
   * Inactivity window. A session that has not been used within this many minutes is
   * dead even though its absolute expiry is still in the future - the control that
   * limits the blast radius of a stolen refresh token on a shared machine.
   */
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().max(43_200).default(720),
  /**
   * Grace period during which re-presenting a just-rotated refresh token
   * returns the *same* replacement instead of being treated as theft.
   *
   * Rotation is single-use, but a browser legitimately fires several requests
   * at once -- two tabs waking up, a link prefetch racing a navigation, three
   * panels loading in parallel. Without a grace window the first request
   * rotates the token and the rest look like a replay attack, so the family is
   * revoked and the user is signed out for doing nothing wrong. Replays after
   * this window still trip detection, which is what actually catches a stolen
   * token. Set to 0 to disable the grace entirely.
   */
  REFRESH_ROTATION_GRACE_SECONDS: z.coerce.number().int().min(0).max(300).default(30),
  /** Concurrent live sessions per user; the oldest is evicted past this bound. */
  SESSION_MAX_PER_USER: z.coerce.number().int().positive().max(100).default(10),
  /** Consecutive failed sign-ins before an account is temporarily locked. */
  AUTH_MAX_FAILED_LOGINS: z.coerce.number().int().positive().max(100).default(10),
  AUTH_LOCKOUT_MINUTES: z.coerce.number().int().positive().max(1_440).default(15),
  /** Hard ceiling on how long a single request may run before returning 504. */
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** Maximum accepted request body size, passed straight to the body parser. */
  REQUEST_BODY_LIMIT: z.string().default("1mb"),
  AUTH_REGISTRATION_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  /**
   * Test/CI escape hatch that lets `x-user-role` / `x-workspace-id` headers stand in for a
   * signed session. Never honoured when NODE_ENV=production.
   */
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  THROTTLE_DISABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AUTH_ALLOW_DEV_HEADERS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_HEALTHCHECK: z.enum(["metadata", "strict"]).default("metadata"),
  DEMO_USER_PASSWORD: z.string().min(8).default("demo-password-change-me"),
  AI_PROVIDER: z.enum(aiProviderSelectionModes).default("auto"),
  AI_PROVIDER_PRIORITY: z.string().optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(900),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().default("https://api.anthropic.com"),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),
  ANTHROPIC_VERSION: z.string().default("2023-06-01"),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().default("llama3.1")
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}
