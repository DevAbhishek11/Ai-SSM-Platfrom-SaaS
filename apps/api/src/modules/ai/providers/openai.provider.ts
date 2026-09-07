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

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

/** OpenAI (or any OpenAI-compatible gateway) chat completions adapter. */
export class OpenAiProvider implements AiProviderAdapter {
  readonly provider = "openai" as const;

  constructor(
    private readonly config: { apiKey?: string; baseUrl: string; model: string },
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
      credentialSource: aiProviderCredentialKeys.openai,
      credentialPresent: this.isConfigured(),
      notes: this.isConfigured()
        ? "OpenAI chat completions enabled."
        : "Set OPENAI_API_KEY to enable OpenAI routing."
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.config.apiKey) {
      throw new AiProviderError(this.provider, "OPENAI_API_KEY is not configured");
    }

    const response = await fetchWithTimeout(
      this.fetchImpl,
      `${this.config.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: request.temperature,
          max_tokens: request.maxOutputTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.prompt }
          ]
        })
      },
      request.timeoutMs,
      this.provider
    );

    if (!response.ok) {
      throw new AiProviderError(
        this.provider,
        `OpenAI responded with ${response.status}: ${await readErrorBody(response)}`,
        response.status
      );
    }

    const payload = (await response.json()) as OpenAiChatResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new AiProviderError(this.provider, "OpenAI returned an empty completion");
    }

    return {
      provider: this.provider,
      model: this.config.model,
      text,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens
    };
  }

  async probe(timeoutMs: number): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        `${this.config.baseUrl}/models`,
        { method: "GET", headers: { authorization: `Bearer ${this.config.apiKey}` } },
        timeoutMs,
        this.provider
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
