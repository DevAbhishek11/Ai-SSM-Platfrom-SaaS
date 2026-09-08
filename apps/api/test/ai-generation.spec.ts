import "reflect-metadata";
import "./env.js";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { AI_CONFIG, AI_FETCH, loadAiConfig } from "../src/modules/ai/ai.config.js";
import type { FetchLike } from "../src/modules/ai/providers/types.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";

/**
 * Simulated Claude endpoint. It returns oversized copy for X and omits the
 * Instagram variant so the repair path (clamping + deterministic fill) is exercised.
 */
const claudeFetch: FetchLike = async (url) => {
  if (!url.includes("/v1/messages")) {
    return new Response(JSON.stringify({ models: [] }), { status: 200 });
  }

  const payload = {
    variants: [
      {
        platform: "linkedin",
        text: "Claude drafted this LinkedIn launch note about coordinated social operations.",
        hashtags: ["#SocialOps", "  ", "AI Content"]
      },
      {
        platform: "x",
        text: `Claude wrote a very long X post. ${"social operations ".repeat(40)}`,
        hashtags: ["SocialOps"]
      },
      { platform: "youtube", text: "Not requested, must be dropped.", hashtags: [] }
    ]
  };

  return new Response(
    JSON.stringify({
      content: [{ type: "text", text: `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` }],
      usage: { input_tokens: 210, output_tokens: 320 }
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
};

describe("AI generation through the model router", () => {
  let app: INestApplication;

  /**
   * The API denies anonymous callers, so every request needs an identity. These
   * helpers attach the test-only `x-user-role` header (enabled in `test/env.ts`).
   * Individual tests override the header to assert role behaviour, and
   * `auth.spec.ts` exercises the real bearer-token path end to end.
   */
  const server = () => app.getHttpServer();
  const get = (url: string) => request(server()).get(url).set("x-user-role", "owner");
  const post = (url: string) => request(server()).post(url).set("x-user-role", "owner");

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AI_CONFIG)
      .useValue(loadAiConfig({ ANTHROPIC_API_KEY: "sk-ant-integration-test" }))
      .overrideProvider(AI_FETCH)
      .useValue(claudeFetch)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports the configured provider chain without exposing credentials", async () => {
    const response = await get("/api/ai/providers").expect(200);

    expect(JSON.stringify(response.body)).not.toContain("sk-ant-integration-test");
    expect(response.body).toMatchObject({
      mode: "auto",
      activeProvider: "anthropic",
      fallbackProvider: "local"
    });
    expect(
      response.body.providers.map((provider: { provider: string }) => provider.provider)
    ).toContain("ollama");
  });

  it("generates variants through Claude, clamps limits, and repairs missing platforms", async () => {
    const response = await post("/api/ai/generate")
      .set("x-user-role", "creator")
      .send({
        workspaceId,
        brief: "Announce our AI social workflow for enterprise marketing teams.",
        platforms: ["linkedin", "x", "instagram"],
        tone: "practical",
        objective: "engagement"
      })
      .expect(201);

    expect(response.body.provider).toBe("anthropic");
    expect(response.body.providerModel).toBe("claude-3-5-sonnet-latest");
    expect(response.body.modelUsed).toBe("anthropic/claude-3-5-sonnet-latest");
    expect(response.body.routing).toMatchObject({
      requestedMode: "auto",
      selectedProvider: "anthropic",
      fallbackUsed: false
    });
    expect(response.body.estimatedTokens).toBe(530);

    const platforms = response.body.variants.map(
      (variant: { platform: string }) => variant.platform
    );
    expect(platforms).toEqual(["linkedin", "x", "instagram"]);

    const xVariant = response.body.variants[1];
    expect(xVariant.text.length).toBeLessThanOrEqual(280);

    const linkedinVariant = response.body.variants[0];
    expect(linkedinVariant.text).toContain("Claude drafted");
    expect(linkedinVariant.hashtags).toEqual(["SocialOps", "AIContent"]);

    const instagramVariant = response.body.variants[2];
    expect(instagramVariant.text).toContain("Announce our AI social workflow");
  });

  it("records the generation in the audit log and accepts feedback", async () => {
    const generated = await post("/api/ai/generate")
      .set("x-user-role", "creator")
      .send({
        workspaceId,
        brief: "Share a practical tip about approval workflows for social teams.",
        platforms: ["linkedin"]
      })
      .expect(201);

    const generations = await get(`/api/ai/generations?workspaceId=${workspaceId}`).expect(200);

    const logEntry = generations.body.find(
      (entry: { id: string }) => entry.id === generated.body.id
    );
    expect(logEntry).toMatchObject({
      provider: "anthropic",
      model: "claude-3-5-sonnet-latest",
      fallbackUsed: false,
      blocked: false
    });
    expect(logEntry.cost).toBeGreaterThan(0);
    expect(logEntry.attempts[0]).toMatchObject({ provider: "anthropic", status: "succeeded" });

    const feedback = await post(`/api/ai/generations/${generated.body.id}/feedback`)
      .send({ feedback: "thumbs_up" })
      .expect(201);

    expect(feedback.body.feedback).toBe("thumbs_up");

    await post(`/api/ai/generations/${generated.body.id}/feedback`)
      .send({ feedback: "not-a-value" })
      .expect(400);
  });

  it("still blocks unsafe generations produced by a remote provider", async () => {
    const response = await post("/api/ai/generate")
      .set("x-user-role", "creator")
      .send({
        workspaceId,
        brief: "Promise a guaranteed return for every launch buyer this quarter.",
        platforms: ["linkedin"]
      })
      .expect(201);

    expect(response.body.provider).toBe("anthropic");
    expect(response.body.safety.blocked).toBe(true);
    expect(response.body.safety.moderationItemId).toEqual(expect.any(String));
  });
});

describe("AI generation without any provider credentials", () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();
  const get = (url: string) => request(server()).get(url).set("x-user-role", "owner");
  const post = (url: string) => request(server()).post(url).set("x-user-role", "owner");

  beforeAll(async () => {
    const failingFetch: FetchLike = async () => {
      throw new Error("no network access in this test");
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AI_CONFIG)
      .useValue(loadAiConfig({}))
      .overrideProvider(AI_FETCH)
      .useValue(failingFetch)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves deterministic local variants so the product still works offline", async () => {
    const response = await post("/api/ai/generate")
      .set("x-user-role", "creator")
      .send({
        workspaceId,
        brief: "Explain how our scheduling queue keeps campaigns on time.",
        platforms: ["linkedin", "instagram"]
      })
      .expect(201);

    expect(response.body.provider).toBe("local");
    expect(response.body.providerModel).toBe("local-deterministic-v1");
    expect(response.body.variants).toHaveLength(2);
    expect(response.body.routing.attempts).toEqual([
      expect.objectContaining({ provider: "local", status: "succeeded" })
    ]);
  });

  it("marks every remote provider as unconfigured", async () => {
    const response = await get("/api/ai/providers").expect(200);

    expect(response.body.activeProvider).toBe("local");
    const configured = response.body.providers
      .filter((provider: { configured: boolean }) => provider.configured)
      .map((provider: { provider: string }) => provider.provider);
    expect(configured).toEqual(["local"]);
  });
});
