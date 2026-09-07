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
