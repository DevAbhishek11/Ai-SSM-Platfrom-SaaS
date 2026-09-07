import { aiProviderCredentialKeys } from "@ssm/domain";
import {
  AiProviderError,
  fetchWithTimeout,
  readErrorBody,
  type AiCompletionRequest,
  type AiCompletionResult,
  type AiProviderAdapter,
  type AiProviderDescription,
  type FetchLike
} from "./types.js";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

/** Anthropic Claude messages API adapter. */
export class AnthropicProvider implements AiProviderAdapter {
  readonly provider = "anthropic" as const;

  constructor(
    private readonly config: { apiKey?: string; baseUrl: string; model: string; version: string },
    private readonly fetchImpl: FetchLike
  ) {}

  get model(): string {
    return this.config.model;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  describe(): AiProviderDescription {
    return {
      credentialSource: aiProviderCredentialKeys.anthropic,
      credentialPresent: this.isConfigured(),
      notes: this.isConfigured()
        ? "Anthropic Claude messages API enabled."
        : "Set ANTHROPIC_API_KEY to enable Claude routing."
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.config.apiKey) {
      throw new AiProviderError(this.provider, "ANTHROPIC_API_KEY is not configured");
    }

    const response = await fetchWithTimeout(
      this.fetchImpl,
      `${this.config.baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": this.config.version
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature,
          system: request.system,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: request.prompt }]
            }
          ]
        })
      },
      request.timeoutMs,
      this.provider
    );

    if (!response.ok) {
      throw new AiProviderError(
        this.provider,
        `Anthropic responded with ${response.status}: ${await readErrorBody(response)}`,
        response.status
      );
    }

    const payload = (await response.json()) as AnthropicMessageResponse;
    const text = (payload.content ?? [])
      .filter((block) => (block.type ?? "text") === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();

    if (!text) {
      throw new AiProviderError(this.provider, "Anthropic returned an empty completion");
    }

    return {
      provider: this.provider,
      model: this.config.model,
      text,
      inputTokens: payload.usage?.input_tokens,
      outputTokens: payload.usage?.output_tokens
    };
  }

  async probe(timeoutMs: number): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        `${this.config.baseUrl}/v1/models`,
        {
          method: "GET",
          headers: {
            "x-api-key": this.config.apiKey,
            "anthropic-version": this.config.version
          }
        },
        timeoutMs,
        this.provider
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
