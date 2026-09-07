import { aiProviderCredentialKeys, defaultAiProviderModels } from "@ssm/domain";
import { composeVariants } from "./composer.js";
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderAdapter,
  AiProviderDescription
} from "./types.js";

/**
 * Deterministic composer used when no remote provider is configured or every
 * remote provider fails. It emits the same JSON contract as remote providers so
 * downstream parsing, safety, and scoring paths stay identical.
 */
export class LocalProvider implements AiProviderAdapter {
  readonly provider = "local" as const;
  readonly model = defaultAiProviderModels.local;

  isConfigured(): boolean {
    return true;
  }

  describe(): AiProviderDescription {
    return {
      credentialSource: aiProviderCredentialKeys.local,
      credentialPresent: true,
      notes: "Always-on deterministic fallback. Requires no credentials and never leaves the process."
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const variants = composeVariants(request.spec);

    return {
      provider: this.provider,
      model: this.model,
      text: JSON.stringify({ variants }),
      inputTokens: Math.ceil(request.prompt.length / 3.8),
      outputTokens: Math.ceil(variants.reduce((total, variant) => total + variant.text.length, 0) / 3.8)
    };
  }

  async probe(): Promise<boolean> {
    return true;
  }
}
