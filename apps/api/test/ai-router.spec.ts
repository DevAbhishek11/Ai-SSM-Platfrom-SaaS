import { describe, expect, it } from "vitest";
import { loadAiConfig, type AiRuntimeConfig } from "../src/modules/ai/ai.config.js";
import { ModelRouterService } from "../src/modules/ai/model-router.service.js";
import { extractJsonObject } from "../src/modules/ai/ai.service.js";
import type { AiCompletionSpec, FetchLike } from "../src/modules/ai/providers/types.js";

const spec: AiCompletionSpec = {
  brief: "Announce the new AI social workflow for B2B marketing teams.",
  platforms: ["linkedin", "x"],
  tone: "practical and confident",
  objective: "engagement"
};

type RecordedCall = { url: string; init?: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function variantsPayload(platforms: string[]) {
  return JSON.stringify({
    variants: platforms.map((platform) => ({
      platform,
      text: `Remote copy for ${platform} about AI social workflows.`,
      hashtags: ["#SocialOps", "AI"]
    }))
  });
}

function fakeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: RecordedCall[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { impl, calls };
}

function routerFor(env: NodeJS.ProcessEnv, fetchImpl: FetchLike) {
  const config: AiRuntimeConfig = loadAiConfig(env);
  return new ModelRouterService(config, fetchImpl);
}

const parse = (text: string) => JSON.parse(extractJsonObject(text)) as { variants: unknown[] };

describe("ModelRouterService provider selection", () => {
  it("falls back to the deterministic local provider when no credentials are present", async () => {
    const { impl, calls } = fakeFetch(() => jsonResponse({}, 500));
    const router = routerFor({}, impl);

    expect(router.candidateOrder()).toEqual(["local"]);
    expect(router.activeProvider()).toBe("local");

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("local");
    expect(routed.fallbackUsed).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("uses OpenAI when only OPENAI_API_KEY is present", async () => {
    const { impl, calls } = fakeFetch((url) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      return jsonResponse({
        choices: [{ message: { content: variantsPayload(["linkedin", "x"]) } }],
        usage: { prompt_tokens: 120, completion_tokens: 240 }
      });
    });
    const router = routerFor({ OPENAI_API_KEY: "sk-test" }, impl);

    expect(router.activeProvider()).toBe("openai");

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("openai");
    expect(routed.model).toBe("gpt-4o-mini");
    expect(routed.inputTokens).toBe(120);
    expect(calls[0]?.init?.headers).toMatchObject({ authorization: "Bearer sk-test" });
  });

  it("uses Anthropic Claude when only ANTHROPIC_API_KEY is present", async () => {
    const { impl, calls } = fakeFetch((url) => {
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      return jsonResponse({
        content: [{ type: "text", text: variantsPayload(["linkedin", "x"]) }],
        usage: { input_tokens: 90, output_tokens: 180 }
      });
    });
    const router = routerFor({ ANTHROPIC_API_KEY: "sk-ant-test" }, impl);

    expect(router.activeProvider()).toBe("anthropic");

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("anthropic");
    expect(calls[0]?.init?.headers).toMatchObject({
      "x-api-key": "sk-ant-test",
      "anthropic-version": "2023-06-01"
    });
  });

  it("prefers self-hosted Ollama when its base URL is configured", async () => {
    const { impl } = fakeFetch(() =>
      jsonResponse({ message: { content: variantsPayload(["linkedin", "x"]) } })
    );
    const router = routerFor(
      {
        OLLAMA_BASE_URL: "http://localhost:11434/",
        ANTHROPIC_API_KEY: "sk-ant-test",
        OPENAI_API_KEY: "sk-test"
      },
      impl
    );

    expect(router.candidateOrder()).toEqual(["ollama", "anthropic", "openai", "local"]);

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("ollama");
  });

  it("honours an explicit AI_PROVIDER pin", async () => {
    const { impl } = fakeFetch((url) => {
      expect(url).toContain("api.openai.com");
      return jsonResponse({ choices: [{ message: { content: variantsPayload(["linkedin", "x"]) } }] });
    });
    const router = routerFor(
      { AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test", OLLAMA_BASE_URL: "http://localhost:11434" },
      impl
    );

    expect(router.candidateOrder()).toEqual(["openai", "local"]);
    expect((await router.route(spec, parse)).provider).toBe("openai");
  });

  it("falls back to the local composer when a pinned provider has no credentials", async () => {
    const { impl, calls } = fakeFetch(() => jsonResponse({}, 500));
    const router = routerFor({ AI_PROVIDER: "anthropic" }, impl);

    expect(router.activeProvider()).toBe("local");
    expect((await router.route(spec, parse)).provider).toBe("local");
    expect(calls).toHaveLength(0);
  });

  it("respects a custom AI_PROVIDER_PRIORITY order", async () => {
    const { impl } = fakeFetch(() =>
      jsonResponse({ content: [{ type: "text", text: variantsPayload(["linkedin", "x"]) }] })
    );
    const router = routerFor(
      {
        AI_PROVIDER_PRIORITY: "anthropic,ollama,openai",
        OLLAMA_BASE_URL: "http://localhost:11434",
        ANTHROPIC_API_KEY: "sk-ant-test"
      },
      impl
    );

    expect(router.candidateOrder()).toEqual(["anthropic", "ollama", "local"]);
    expect((await router.route(spec, parse)).provider).toBe("anthropic");
  });
});

describe("ModelRouterService resilience", () => {
  it("cascades to the next provider when one fails and records the attempts", async () => {
    const { impl } = fakeFetch((url) => {
      if (url.includes("11434")) {
        return jsonResponse({ error: "model not found" }, 404);
      }
      if (url.includes("anthropic")) {
        throw new Error("network unreachable");
      }
      return jsonResponse({ choices: [{ message: { content: variantsPayload(["linkedin", "x"]) } }] });
    });
    const router = routerFor(
      {
        OLLAMA_BASE_URL: "http://localhost:11434",
        ANTHROPIC_API_KEY: "sk-ant-test",
        OPENAI_API_KEY: "sk-test"
      },
      impl
    );

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("openai");
    expect(routed.fallbackUsed).toBe(true);
    expect(routed.attempts.map((attempt) => `${attempt.provider}:${attempt.status}`)).toEqual([
      "ollama:failed",
      "anthropic:failed",
      "openai:succeeded"
    ]);
    expect(routed.attempts[0]?.error).toContain("404");
  });

  it("degrades to the deterministic provider when every remote provider fails", async () => {
    const { impl } = fakeFetch(() => jsonResponse({ error: "upstream down" }, 503));
    const router = routerFor({ ANTHROPIC_API_KEY: "sk-ant-test", OPENAI_API_KEY: "sk-test" }, impl);

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("local");
    expect(routed.fallbackUsed).toBe(true);
    expect(routed.attempts.filter((attempt) => attempt.status === "failed")).toHaveLength(2);
  });

  it("treats unparsable provider output as a failure and moves on", async () => {
    const { impl } = fakeFetch((url) =>
      url.includes("anthropic")
        ? jsonResponse({ content: [{ type: "text", text: "I cannot help with that." }] })
        : jsonResponse({ choices: [{ message: { content: variantsPayload(["linkedin", "x"]) } }] })
    );
    const router = routerFor({ ANTHROPIC_API_KEY: "sk-ant-test", OPENAI_API_KEY: "sk-test" }, impl);

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("openai");
    expect(routed.attempts[0]).toMatchObject({ provider: "anthropic", status: "failed" });
  });

  it("times out a hanging provider and falls back", async () => {
    const impl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    const router = routerFor({ OPENAI_API_KEY: "sk-test", AI_REQUEST_TIMEOUT_MS: "25" }, impl);

    const routed = await router.route(spec, parse);

    expect(routed.provider).toBe("local");
    expect(routed.attempts[0]?.error).toContain("timed out");
  });
});

describe("ModelRouterService status", () => {
  it("reports provider readiness without leaking credentials", async () => {
    const { impl } = fakeFetch(() => jsonResponse({ models: [] }));
    const router = routerFor(
      { OPENAI_API_KEY: "sk-secret-value", OLLAMA_BASE_URL: "http://localhost:11434" },
      impl
    );

    const status = await router.status();
    const serialized = JSON.stringify(status);

    expect(serialized).not.toContain("sk-secret-value");
    expect(status.mode).toBe("auto");
    expect(status.activeProvider).toBe("ollama");
    expect(status.fallbackProvider).toBe("local");
    expect(status.providers.map((provider) => provider.provider)).toEqual([
      "ollama",
      "openai",
      "local",
      "anthropic"
    ]);
    expect(status.providers.find((provider) => provider.provider === "anthropic")).toMatchObject({
      configured: false,
      credentialSource: "ANTHROPIC_API_KEY",
      reachable: "unknown"
    });
  });

  it("probes reachability when asked", async () => {
    const { impl, calls } = fakeFetch((url) =>
      url.includes("11434") ? jsonResponse({ models: [] }) : jsonResponse({}, 401)
    );
    const router = routerFor(
      { OLLAMA_BASE_URL: "http://localhost:11434", OPENAI_API_KEY: "sk-test" },
      impl
    );

    const status = await router.status(true);

    expect(calls.map((call) => call.url)).toEqual([
      "http://localhost:11434/api/tags",
      "https://api.openai.com/v1/models"
    ]);
    expect(status.providers.find((provider) => provider.provider === "ollama")?.reachable).toBe("yes");
    expect(status.providers.find((provider) => provider.provider === "openai")?.reachable).toBe("no");
  });
});

describe("extractJsonObject", () => {
  it("unwraps fenced and prose-wrapped JSON", () => {
    expect(extractJsonObject('```json\n{"variants":[]}\n```')).toBe('{"variants":[]}');
    expect(extractJsonObject('Sure! {"variants":[]} Hope that helps.')).toBe('{"variants":[]}');
    expect(() => extractJsonObject("no json here")).toThrow(/JSON object/);
  });
});
