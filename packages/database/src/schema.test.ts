import { describe, expect, it } from "vitest";
import { aiGenerationFeedbackValues, aiProviders, aiRoutingAttemptStatuses, platforms, roles } from "@ssm/domain";
import {
  aiGenerationFeedbackEnum,
  aiGenerations,
  aiProviderAttempts,
  aiProviderEnum,
  aiRoutingAttemptStatusEnum,
  platformEnum,
  roleEnum
} from "./schema.js";

describe("database enum coverage", () => {
  it("keeps Drizzle enums aligned with the shared domain", () => {
    expect(roleEnum.enumValues).toEqual(roles);
    expect(platformEnum.enumValues).toEqual(platforms);
  });

  it("keeps AI provider routing enums aligned with the shared domain", () => {
    expect(aiProviderEnum.enumValues).toEqual(aiProviders);
    expect(aiRoutingAttemptStatusEnum.enumValues).toEqual(aiRoutingAttemptStatuses);
    expect(aiGenerationFeedbackEnum.enumValues).toEqual(aiGenerationFeedbackValues);
  });

  it("persists provider routing metadata for AI generations", () => {
    expect(Object.keys(aiGenerations)).toEqual(
      expect.arrayContaining(["provider", "providerModel", "latencyMs", "fallbackUsed", "routing"])
    );
    expect(Object.keys(aiProviderAttempts)).toEqual(
      expect.arrayContaining(["generationId", "provider", "status", "latencyMs", "attemptOrder"])
    );
  });
});
