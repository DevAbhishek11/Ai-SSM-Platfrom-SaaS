import { z } from "zod";
import {
  aiProviders,
  aiProviderSelectionModes,
  defaultAiProviderModels,
  defaultAiProviderPriority,
  type AiProvider,
  type AiProviderSelectionMode
} from "@ssm/domain";

export const AI_CONFIG = "AI_CONFIG";
export const AI_FETCH = "AI_FETCH";

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const aiEnvSchema = z.object({
  AI_PROVIDER: z.enum(aiProviderSelectionModes).default("auto"),
  AI_PROVIDER_PRIORITY: optionalTrimmedString,
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(600_000).default(20_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(32_000).default(900),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),

  OPENAI_API_KEY: optionalTrimmedString,
  OPENAI_BASE_URL: z.string().trim().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().trim().default(defaultAiProviderModels.openai),

  ANTHROPIC_API_KEY: optionalTrimmedString,
  ANTHROPIC_BASE_URL: z.string().trim().default("https://api.anthropic.com"),
  ANTHROPIC_MODEL: z.string().trim().default(defaultAiProviderModels.anthropic),
  ANTHROPIC_VERSION: z.string().trim().default("2023-06-01"),

  OLLAMA_BASE_URL: optionalTrimmedString,
  OLLAMA_MODEL: z.string().trim().default(defaultAiProviderModels.ollama)
});

export type AiRuntimeConfig = {
  mode: AiProviderSelectionMode;
  priority: AiProvider[];
  timeoutMs: number;
  maxOutputTokens: number;
  temperature: number;
  openai: { apiKey?: string; baseUrl: string; model: string };
  anthropic: { apiKey?: string; baseUrl: string; model: string; version: string };
  ollama: { baseUrl?: string; model: string };
};

function parsePriority(raw: string | undefined): AiProvider[] {
  if (!raw) {
    return [...defaultAiProviderPriority];
  }

  const parsed = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is AiProvider => (aiProviders as readonly string[]).includes(value))
    .filter((value) => value !== "local");

  const unique = [...new Set(parsed)];
  return unique.length > 0 ? unique : [...defaultAiProviderPriority];
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Builds the AI runtime configuration from environment variables.
 * Providers are enabled purely by credential presence:
 * - `OLLAMA_BASE_URL` enables self-hosted inference
 * - `ANTHROPIC_API_KEY` enables Claude
 * - `OPENAI_API_KEY` enables OpenAI
 * The deterministic local composer is always available as the final fallback.
 */
export function loadAiConfig(source: NodeJS.ProcessEnv = process.env): AiRuntimeConfig {
  const env = aiEnvSchema.parse(source);

  return {
    mode: env.AI_PROVIDER,
    priority: parsePriority(env.AI_PROVIDER_PRIORITY),
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
    temperature: env.AI_TEMPERATURE,
    openai: {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: stripTrailingSlash(env.OPENAI_BASE_URL),
      model: env.OPENAI_MODEL
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      baseUrl: stripTrailingSlash(env.ANTHROPIC_BASE_URL),
      model: env.ANTHROPIC_MODEL,
      version: env.ANTHROPIC_VERSION
    },
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL ? stripTrailingSlash(env.OLLAMA_BASE_URL) : undefined,
      model: env.OLLAMA_MODEL
    }
  };
}
