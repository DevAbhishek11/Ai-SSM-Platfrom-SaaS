import type { AiProvider, BrandVoice, Platform } from "@ssm/domain";

export type AiCompletionSpec = {
  brief: string;
  platforms: Platform[];
  tone: string;
  objective: string;
  brandVoice?: BrandVoice;
};

export type AiCompletionRequest = {
  spec: AiCompletionSpec;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
};

export type AiCompletionResult = {
  provider: AiProvider;
  model: string;
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type AiProviderDescription = {
  credentialSource: string;
  credentialPresent: boolean;
  notes: string;
};

export interface AiProviderAdapter {
  readonly provider: AiProvider;
  readonly model: string;
  readonly baseUrl?: string;
  isConfigured(): boolean;
  describe(): AiProviderDescription;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
  probe?(timeoutMs: number): Promise<boolean>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class AiProviderError extends Error {
  constructor(
    readonly provider: AiProvider,
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** Runs a fetch with an abort-based timeout so a slow provider never blocks a request. */
export async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  provider: AiProvider
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderError(provider, `Request timed out after ${timeoutMs}ms`);
    }
    throw new AiProviderError(provider, error instanceof Error ? error.message : "Unknown transport error");
  } finally {
    clearTimeout(timer);
  }
}

/** Reads a response body defensively; provider errors must never leak credentials. */
export async function readErrorBody(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return body.slice(0, 300);
  } catch {
    return "";
  }
}
