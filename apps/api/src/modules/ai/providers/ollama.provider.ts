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

type OllamaChatResponse = {
  message?: { content?: string };
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
};

/** Self-hosted Ollama adapter (llama3.x, qwen, mistral, deepseek, ...). */
export class OllamaProvider implements AiProviderAdapter {
  readonly provider = "ollama" as const;

  constructor(
    private readonly config: { baseUrl?: string; model: string },
    private readonly fetchImpl: FetchLike
  ) {}

  get model(): string {
    return this.config.model;
  }

  get baseUrl(): string | undefined {
    return this.config.baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl);
  }

  describe(): AiProviderDescription {
    return {
      credentialSource: aiProviderCredentialKeys.ollama,
      credentialPresent: this.isConfigured(),
      notes: this.isConfigured()
        ? "Self-hosted Ollama inference enabled (no API key required)."
        : "Set OLLAMA_BASE_URL (for example http://localhost:11434) to enable local inference."
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.config.baseUrl) {
      throw new AiProviderError(this.provider, "OLLAMA_BASE_URL is not configured");
    }

    const response = await fetchWithTimeout(
      this.fetchImpl,
      `${this.config.baseUrl}/api/chat`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          stream: false,
          format: "json",
          options: {
            temperature: request.temperature,
            num_predict: request.maxOutputTokens
          },
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
        `Ollama responded with ${response.status}: ${await readErrorBody(response)}`,
        response.status
      );
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const text = (payload.message?.content ?? payload.response ?? "").trim();

    if (!text) {
      throw new AiProviderError(this.provider, "Ollama returned an empty completion");
    }

    return {
      provider: this.provider,
      model: this.config.model,
      text,
      inputTokens: payload.prompt_eval_count,
      outputTokens: payload.eval_count
    };
  }

  async probe(timeoutMs: number): Promise<boolean> {
    if (!this.config.baseUrl) {
      return false;
    }

    try {
      const response = await fetchWithTimeout(
        this.fetchImpl,
        `${this.config.baseUrl}/api/tags`,
        { method: "GET" },
        timeoutMs,
        this.provider
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
