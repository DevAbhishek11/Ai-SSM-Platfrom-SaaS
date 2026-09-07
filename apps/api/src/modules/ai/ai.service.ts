import { randomUUID } from "node:crypto";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  aiProviderCompletionSchema,
  aiProviderTokenCostPer1k,
  demoWorkspace,
  type AiGenerationLog,
  type AiGenerationResponse,
  type AiRouterStatus,
  type Platform,
  type PostContentVariant
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { BillingService } from "../billing/billing.service.js";
import { BrandVoicesService } from "../brand-voices/brand-voices.service.js";
import { SafetyService } from "../safety/safety.service.js";
import { ModelRouterService } from "./model-router.service.js";
import { clampToPlatform, composeVariant, resolveTone } from "./providers/composer.js";
import type { AiCompletionSpec } from "./providers/types.js";
import type { GenerateContentDto, SubmitGenerationFeedbackDto } from "./dto.js";

const MAX_GENERATION_LOG_ENTRIES = 200;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly generations: AiGenerationLog[] = [];

  constructor(
    private readonly billingService: BillingService,
    private readonly brandVoicesService: BrandVoicesService,
    private readonly safetyService: SafetyService,
    private readonly modelRouter: ModelRouterService
  ) {}

  async generate(input: GenerateContentDto, actor?: Principal): Promise<AiGenerationResponse> {
    this.billingService.assertAllowed(input.workspaceId, "aiGenerations", 1);

    const generationId = randomUUID();
    const brandVoice = input.brandVoiceId ? this.brandVoicesService.get(input.brandVoiceId) : undefined;
    const spec: AiCompletionSpec = {
      brief: input.brief,
      platforms: input.platforms,
      tone: resolveTone(input.tone, brandVoice),
      objective: input.objective ?? "engagement",
      brandVoice
    };

    const routed = await this.routeWithFallback(spec);
    const variants = routed.value;

    const safetyEvaluation = this.safetyService.evaluateContent(
      {
        workspaceId: input.workspaceId,
        text: [input.brief, ...variants.map((variant) => variant.text)].join("\n\n"),
        source: "ai_generation",
        sourceEntityId: generationId
      },
      actor
    );
    const safetyCheck = safetyEvaluation.check;

    const brandEvaluations = brandVoice
      ? variants.map((variant) => this.brandVoicesService.evaluateText(brandVoice, variant.text))
      : [];
    const brandFlags = brandEvaluations.flatMap((evaluation) =>
      evaluation.bannedTerms.map((term) => `brand_voice_banned_term:${term}`)
    );
    const brandPenalty = brandEvaluations.some((evaluation) => evaluation.score < 75) ? 0.12 : 0;
    const riskScore = Math.min(safetyCheck.riskScore + brandPenalty, 1);
    const flags = [...safetyCheck.flags, ...brandFlags];

    const qualityScore = Math.max(
      0,
      Math.min(
        100,
        96 - safetyCheck.flags.length * 12 - brandFlags.length * 15 + brandEvaluations.length * 2
      )
    );
    const estimatedTokens =
      (routed.inputTokens ?? Math.ceil(routed.prompt.length / 3.8)) +
      (routed.outputTokens ??
        Math.ceil(variants.reduce((total, variant) => total + variant.text.length, 0) / 3.8));

    const modelUsed = brandVoice
      ? `${routed.provider}/${routed.model}:${brandVoice.name}:v${brandVoice.version}`
      : `${routed.provider}/${routed.model}`;
    const blocked = safetyCheck.status === "blocked" || riskScore >= 0.75 || brandFlags.length > 0;

    this.recordGeneration({
      id: generationId,
      workspaceId: input.workspaceId,
      userId: actor?.userId,
      provider: routed.provider,
      model: routed.model,
      modelUsed,
      prompt: input.brief,
      platforms: input.platforms,
      tokensUsed: estimatedTokens,
      cost: Number(((estimatedTokens / 1000) * aiProviderTokenCostPer1k[routed.provider]).toFixed(6)),
      latencyMs: routed.latencyMs,
      fallbackUsed: routed.fallbackUsed,
      qualityScore,
      blocked,
      attempts: routed.attempts,
      createdAt: new Date().toISOString()
    });

    return {
      id: generationId,
      modelUsed,
      provider: routed.provider,
      providerModel: routed.model,
      routing: {
        requestedMode: this.modelRouter.mode(),
        selectedProvider: routed.provider,
        selectedModel: routed.model,
        fallbackUsed: routed.fallbackUsed,
        latencyMs: routed.latencyMs,
        attempts: routed.attempts
      },
      safety: {
        blocked,
        riskScore,
        flags,
        recommendations: safetyCheck.recommendations,
        checkId: safetyCheck.id,
        moderationItemId: safetyEvaluation.moderationItem?.id
      },
      variants,
      qualityScore,
      estimatedTokens
    };
  }

  providerStatus(probe = false): Promise<AiRouterStatus> {
    return this.modelRouter.status(probe);
  }

  listGenerations(workspaceId = demoWorkspace.id): AiGenerationLog[] {
    return this.generations.filter((generation) => generation.workspaceId === workspaceId);
  }

  submitFeedback(id: string, input: SubmitGenerationFeedbackDto): AiGenerationLog {
    const generation = this.generations.find((entry) => entry.id === id);
    if (!generation) {
      throw new NotFoundException("AI generation not found");
    }

    generation.feedback = input.feedback;
    return generation;
  }

  /**
   * Routes through the configured provider chain. If even the deterministic
   * provider output cannot be parsed, compose variants inline so callers always
   * receive a usable response.
   */
  private async routeWithFallback(spec: AiCompletionSpec) {
    try {
      return await this.modelRouter.route(spec, (text) => this.parseVariants(text, spec));
    } catch (error) {
      this.logger.error(
        `AI routing exhausted every provider: ${error instanceof Error ? error.message : "unknown error"}`
      );

      return {
        value: spec.platforms.map((platform) => composeVariant(platform, spec)),
        provider: "local" as const,
        model: "local-deterministic-v1",
        fallbackUsed: true,
        latencyMs: 0,
        attempts: [],
        inputTokens: undefined,
        outputTokens: undefined,
        prompt: spec.brief
      };
    }
  }

  /**
   * Parses provider output into validated variants. Model output is untrusted:
   * fenced JSON is unwrapped, unknown platforms are dropped, missing platforms are
   * composed deterministically, and every variant is clamped to platform limits.
   */
  private parseVariants(rawText: string, spec: AiCompletionSpec): PostContentVariant[] {
    const parsed = aiProviderCompletionSchema.parse(JSON.parse(extractJsonObject(rawText)));
    const byPlatform = new Map<Platform, PostContentVariant>();

    for (const variant of parsed.variants) {
      if (!spec.platforms.includes(variant.platform) || byPlatform.has(variant.platform)) {
        continue;
      }

      const text = clampToPlatform(variant.platform, variant.text);
      if (text.length === 0) {
        continue;
      }

      byPlatform.set(variant.platform, {
        platform: variant.platform,
        text,
        hashtags: normalizeHashtags(variant.hashtags),
        firstComment: variant.firstComment?.trim() || undefined
      });
    }

    if (byPlatform.size === 0) {
      throw new Error("Provider returned no usable variants");
    }

    return spec.platforms.map(
      (platform) => byPlatform.get(platform) ?? composeVariant(platform, spec)
    );
  }

  private recordGeneration(entry: AiGenerationLog): void {
    this.generations.unshift(entry);
    if (this.generations.length > MAX_GENERATION_LOG_ENTRIES) {
      this.generations.length = MAX_GENERATION_LOG_ENTRIES;
    }
  }
}

/** Strips markdown fences or surrounding prose from a model response. */
export function extractJsonObject(rawText: string): string {
  const withoutFences = rawText
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  if (withoutFences.startsWith("{")) {
    return withoutFences;
  }

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Provider response did not contain a JSON object");
  }

  return withoutFences.slice(start, end + 1);
}

function normalizeHashtags(hashtags: string[]): string[] {
  return [
    ...new Set(
      hashtags
        .map((tag) => tag.trim().replace(/^#+/, "").replace(/\s+/g, ""))
        .filter((tag) => tag.length > 0)
    )
  ].slice(0, 8);
}
