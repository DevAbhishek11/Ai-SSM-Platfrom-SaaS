import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  supportedPlatformCapabilities,
  type AiGenerationResponse,
  type BrandVoice,
  type Platform
} from "@ssm/domain";
import { BrandVoicesService } from "../brand-voices/brand-voices.service.js";
import { BillingService } from "../billing/billing.service.js";
import { SafetyService } from "../safety/safety.service.js";
import type { GenerateContentDto } from "./dto.js";

@Injectable()
export class AiService {
  constructor(
    private readonly billingService: BillingService,
    private readonly brandVoicesService: BrandVoicesService,
    private readonly safetyService: SafetyService
  ) {}

  generate(input: GenerateContentDto): AiGenerationResponse {
    this.billingService.assertAllowed(input.workspaceId, "aiGenerations", 1);
    const generationId = randomUUID();
    const brandVoice = input.brandVoiceId ? this.brandVoicesService.get(input.brandVoiceId) : undefined;
    const safetyEvaluation = this.safetyService.evaluateContent({
      workspaceId: input.workspaceId,
      text: input.brief,
      source: "ai_generation",
      sourceEntityId: generationId
    });
    const safetyCheck = safetyEvaluation.check;

    const variants = input.platforms.map((platform) =>
      this.createVariant({
        platform,
        brief: input.brief,
        tone: this.voiceTone(input.tone, brandVoice),
        objective: input.objective ?? "engagement",
        brandVoice
      })
    );
    const brandEvaluations = brandVoice
      ? variants.map((variant) => this.brandVoicesService.evaluateText(brandVoice, variant.text))
      : [];
    const brandFlags = brandEvaluations.flatMap((evaluation) =>
      evaluation.bannedTerms.map((term) => `brand_voice_banned_term:${term}`)
    );
    const brandPenalty = brandEvaluations.some((evaluation) => evaluation.score < 75) ? 0.12 : 0;
    const riskScore = Math.min(safetyCheck.riskScore + brandPenalty, 1);
    const flags = [...safetyCheck.flags, ...brandFlags];

    return {
      id: generationId,
      modelUsed: brandVoice
        ? `model-router/local-deterministic-v1:${brandVoice.name}:v${brandVoice.version}`
        : "model-router/local-deterministic-v1",
      safety: {
        blocked: safetyCheck.status === "blocked" || riskScore >= 0.75 || brandFlags.length > 0,
        riskScore,
        flags,
        recommendations: safetyCheck.recommendations,
        checkId: safetyCheck.id,
        moderationItemId: safetyEvaluation.moderationItem?.id
      },
      variants,
      qualityScore: Math.max(
        60,
        96 - safetyCheck.flags.length * 12 - brandFlags.length * 15 + brandEvaluations.length * 2
      ),
      estimatedTokens: Math.ceil(input.brief.length / 3.8) + variants.length * 80
    };
  }

  private createVariant({
    platform,
    brief,
    tone,
    objective,
    brandVoice
  }: {
    platform: Platform;
    brief: string;
    tone: string;
    objective: string;
    brandVoice?: BrandVoice;
  }) {
    const capability = supportedPlatformCapabilities[platform];
    const cleanBrief = brief.replace(/\s+/g, " ").trim();
    const hook = this.platformHook(platform);
    const cta = this.ctaFor(objective, brandVoice);
    const vocabulary = brandVoice?.vocabulary.preferredTerms.slice(0, 2).join(" and ");
    const voiceContext = vocabulary ? `Use ${vocabulary} as the shared language.` : `Tone: ${tone}.`;
    const text = `${hook} ${cleanBrief} ${voiceContext} ${cta}`.slice(0, capability.maxCharacters);

    return {
      platform,
      text,
      hashtags: this.hashtagsFor(platform),
      firstComment: platform === "instagram" || platform === "linkedin" ? cta : undefined
    };
  }

  private voiceTone(inputTone?: string, brandVoice?: BrandVoice) {
    if (!brandVoice) {
      return inputTone ?? "professional";
    }
    const primary = typeof brandVoice.tone.primary === "string" ? brandVoice.tone.primary : "professional";
    const secondary = typeof brandVoice.tone.secondary === "string" ? brandVoice.tone.secondary : "clear";
    return `${primary} and ${secondary}`;
  }

  private ctaFor(objective: string, brandVoice?: BrandVoice) {
    const examples = brandVoice?.ctaPreferences.examples;
    if (Array.isArray(examples) && examples.every((item) => typeof item === "string") && examples.length > 0) {
      return examples[0] as string;
    }
    return objective.toLowerCase().includes("conversion")
      ? "Start with the launch checklist today."
      : "Save this for your next planning sprint.";
  }

  private platformHook(platform: Platform): string {
    const hooks: Record<Platform, string> = {
      x: "Here is the sharper way to ship social campaigns:",
      instagram: "Behind every calm launch is a tighter content workflow.",
      facebook: "Your launch plan deserves one organized home.",
      linkedin: "Teams move faster when strategy, approvals, and analytics share one workflow.",
      youtube: "In this walkthrough, we break down the modern social launch stack.",
      tiktok: "POV: your content calendar finally works with your team.",
      reddit: "For teams managing launches, this workflow has been saving review cycles.",
      pinterest: "Plan your next campaign with a smarter social content board.",
      threads: "A better launch rhythm starts with better social ops.",
      mastodon: "Social publishing can be open, organized, and measurable.",
      bluesky: "A practical social workflow for teams that need speed and clarity."
    };

    return hooks[platform];
  }

  private hashtagsFor(platform: Platform): string[] {
    if (platform === "linkedin") {
      return ["B2BMarketing", "SocialOps", "AIContent"];
    }
    if (platform === "instagram" || platform === "tiktok") {
      return ["SocialMedia", "ContentStrategy", "LaunchPlan"];
    }
    return ["SocialOps", "AI", "Marketing"];
  }
}
