import {
  aiProviderLabels,
  aiProviderCredentialKeys,
  defaultAiProviderModels,
  defaultAiProviderPriority,
  type AiRouterStatus
} from "@ssm/domain";
import { authorizedFetch } from "./session";

/**
 * Fetches live model-router status from the API. Falls back to a "no credentials
 * configured" view so the dashboard renders before the API is running.
 */
export async function getAiRouterStatus(): Promise<AiRouterStatus> {
  try {
    const response = await authorizedFetch("/ai/providers", {
      headers: { accept: "application/json" }
    });

    if (response.ok) {
      return (await response.json()) as AiRouterStatus;
    }
  } catch {
    // Fall through to the local default below.
  }

  return localRouterStatus();
}

export function localRouterStatus(): AiRouterStatus {
  return {
    mode: "auto",
    priority: ["local"],
    activeProvider: "local",
    fallbackProvider: "local",
    timeoutMs: 20_000,
    maxOutputTokens: 900,
    temperature: 0.7,
    providers: [
      {
        provider: "local",
        label: aiProviderLabels.local,
        configured: true,
        credentialSource: aiProviderCredentialKeys.local,
        credentialPresent: true,
        model: defaultAiProviderModels.local,
        priority: 0,
        reachable: "unknown",
        notes: "Always-on deterministic fallback."
      },
      ...defaultAiProviderPriority.map((provider, index) => ({
        provider,
        label: aiProviderLabels[provider],
        configured: false,
        credentialSource: aiProviderCredentialKeys[provider],
        credentialPresent: false,
        model: defaultAiProviderModels[provider],
        priority: index + 1,
        reachable: "unknown" as const,
        notes: `Set ${aiProviderCredentialKeys[provider]} to enable ${aiProviderLabels[provider]}.`
      }))
    ]
  };
}
