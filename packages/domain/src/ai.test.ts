import { describe, expect, it } from "vitest";
import {
  aiProviderCredentialKeys,
  aiProviderLabels,
  aiProviders,
  aiProviderTokenCostPer1k,
  defaultAiProviderModels,
  defaultAiProviderPriority
} from "./constants.js";
import { aiProviderCompletionSchema, aiRouterStatusSchema } from "./schemas.js";

describe("AI provider catalogue", () => {
  it("describes every provider with a credential source, label, model, and cost", () => {
    for (const provider of aiProviders) {
      expect(aiProviderLabels[provider]).toBeTruthy();
      expect(aiProviderCredentialKeys[provider]).toBeTruthy();
      expect(defaultAiProviderModels[provider]).toBeTruthy();
      expect(aiProviderTokenCostPer1k[provider]).toBeGreaterThanOrEqual(0);
    }
  });

  it("prefers self-hosted inference, then Claude, then OpenAI, and never routes to local first", () => {
    expect(defaultAiProviderPriority).toEqual(["ollama", "anthropic", "openai"]);
    expect(defaultAiProviderPriority).not.toContain("local");
  });

  it("validates the structured provider completion contract", () => {
    const parsed = aiProviderCompletionSchema.parse({
      variants: [{ platform: "linkedin", text: "Launch copy" }]
    });

    expect(parsed.variants[0]?.hashtags).toEqual([]);
    expect(() => aiProviderCompletionSchema.parse({ variants: [] })).toThrow();
    expect(() =>
      aiProviderCompletionSchema.parse({ variants: [{ platform: "myspace", text: "nope" }] })
    ).toThrow();
  });

  it("validates router status payloads", () => {
    const status = aiRouterStatusSchema.parse({
      mode: "auto",
      priority: ["ollama", "local"],
      activeProvider: "ollama",
      fallbackProvider: "local",
      timeoutMs: 20000,
      maxOutputTokens: 900,
      temperature: 0.7,
      providers: [
        {
          provider: "ollama",
          label: aiProviderLabels.ollama,
          configured: true,
          credentialSource: "OLLAMA_BASE_URL",
          credentialPresent: true,
          model: "llama3.1",
          priority: 0,
          notes: "enabled"
        }
      ]
    });

    expect(status.providers[0]?.reachable).toBe("unknown");
  });
});
