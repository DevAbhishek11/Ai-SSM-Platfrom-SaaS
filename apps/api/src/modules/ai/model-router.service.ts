import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  aiProviderLabels,
  type AiProvider,
  type AiProviderStatus,
  type AiRouterStatus,
  type AiRoutingAttempt
} from "@ssm/domain";
import { AI_CONFIG, AI_FETCH, type AiRuntimeConfig } from "./ai.config.js";
import { AnthropicProvider } from "./providers/anthropic.provider.js";
import { LocalProvider } from "./providers/local.provider.js";
import { OllamaProvider } from "./providers/ollama.provider.js";
import { OpenAiProvider } from "./providers/openai.provider.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import type { AiCompletionSpec, AiProviderAdapter, FetchLike } from "./providers/types.js";

export type RoutedGeneration<T> = {
  value: T;
  provider: AiProvider;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
  attempts: AiRoutingAttempt[];
  inputTokens?: number;
  outputTokens?: number;
  prompt: string;
};

const PROBE_TIMEOUT_MS = 2_000;

/**
 * Chooses an AI provider based on which credentials are present and degrades
 * gracefully: Ollama -> Claude -> OpenAI -> deterministic local composer
 * (order configurable through AI_PROVIDER / AI_PROVIDER_PRIORITY).
 */
@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private readonly adapters: Record<AiProvider, AiProviderAdapter>;

  constructor(
    @Inject(AI_CONFIG) private readonly config: AiRuntimeConfig,
    @Inject(AI_FETCH) fetchImpl: FetchLike
  ) {
    this.adapters = {
      ollama: new OllamaProvider(config.ollama, fetchImpl),
      anthropic: new AnthropicProvider(config.anthropic, fetchImpl),
      openai: new OpenAiProvider(config.openai, fetchImpl),
      local: new LocalProvider()
    };
  }

  /** Configured selection mode (auto or a pinned provider). */
  mode(): AiRouterStatus["mode"] {
    return this.config.mode;
  }

  /** Providers that will be attempted for the current configuration, in order. */
  candidateOrder(): AiProvider[] {
    if (this.config.mode !== "auto") {
      return this.config.mode === "local" ? ["local"] : [this.config.mode, "local"];
    }

    const configured = this.config.priority.filter((provider) => this.adapters[provider].isConfigured());
    return [...configured, "local"];
  }

  /** The provider that would serve the next generation request. */
  activeProvider(): AiProvider {
    const [first] = this.candidateOrder();
    if (this.config.mode !== "auto" && first && !this.adapters[first].isConfigured()) {
      return "local";
    }
    return first ?? "local";
  }

  async route<T>(spec: AiCompletionSpec, parse: (text: string) => T): Promise<RoutedGeneration<T>> {
    const system = buildSystemPrompt();
    const prompt = buildUserPrompt(spec);
    const attempts: AiRoutingAttempt[] = [];
    const startedAt = Date.now();
    const order = this.candidateOrder();

    for (const provider of order) {
      const adapter = this.adapters[provider];

      if (!adapter.isConfigured()) {
        attempts.push({
          provider,
          model: adapter.model,
          status: "skipped",
          latencyMs: 0,
          error: adapter.describe().notes
        });
        continue;
      }

      const attemptStartedAt = Date.now();

      try {
        const completion = await adapter.complete({
          spec,
          system,
          prompt,
          maxOutputTokens: this.config.maxOutputTokens,
          temperature: this.config.temperature,
          timeoutMs: this.config.timeoutMs
        });

        const value = parse(completion.text);
        const latencyMs = Date.now() - attemptStartedAt;
        attempts.push({ provider, model: completion.model, status: "succeeded", latencyMs });

        return {
          value,
          provider,
          model: completion.model,
          fallbackUsed: attempts.some((attempt) => attempt.status === "failed"),
          latencyMs: Date.now() - startedAt,
          attempts,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          prompt
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown provider error";
        attempts.push({
          provider,
          model: adapter.model,
          status: "failed",
          latencyMs: Date.now() - attemptStartedAt,
          error: message
        });
        this.logger.warn(`AI provider "${provider}" failed, falling back: ${message}`);
      }
    }

    // The local adapter cannot fail, so this path is only reachable if the parser
    // rejects deterministic output. Compose the safest possible response instead.
    throw new Error(
      `All AI providers failed: ${attempts
        .map((attempt) => `${attempt.provider}:${attempt.status}`)
        .join(", ")}`
    );
  }

  async status(probe = false): Promise<AiRouterStatus> {
    const order = this.candidateOrder();
    const providers: AiProviderStatus[] = [];

    for (const provider of ["ollama", "anthropic", "openai", "local"] as AiProvider[]) {
      const adapter = this.adapters[provider];
      const description = adapter.describe();
      const priority = order.indexOf(provider);

      providers.push({
        provider,
        label: aiProviderLabels[provider],
        configured: adapter.isConfigured(),
        credentialSource: description.credentialSource,
        credentialPresent: description.credentialPresent,
        model: adapter.model,
        baseUrl: adapter.baseUrl,
        priority: priority === -1 ? 99 : priority,
        reachable:
          probe && adapter.isConfigured() && adapter.probe
            ? (await adapter.probe(PROBE_TIMEOUT_MS))
              ? "yes"
              : "no"
            : "unknown",
        notes: description.notes
      });
    }

    return {
      mode: this.config.mode,
      priority: order,
      activeProvider: this.activeProvider(),
      fallbackProvider: "local",
      timeoutMs: this.config.timeoutMs,
      maxOutputTokens: this.config.maxOutputTokens,
      temperature: this.config.temperature,
      providers: providers.sort((a, b) => a.priority - b.priority)
    };
  }
}
