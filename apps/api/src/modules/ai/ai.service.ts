import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  supportedPlatformCapabilities,
  type AiGenerationResponse,
  type Platform
} from "@ssm/domain";
import { BillingService } from "../billing/billing.service.js";
import type { GenerateContentDto } from "./dto.js";

const sensitivePatterns = [
  { label: "possible_pii_email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "possible_payment_card", pattern: /\b(?:\d[ -]*?){13,16}\b/ },
  { label: "medical_claim", pattern: /\b(cure|guaranteed treatment|diagnose)\b/i },
  { label: "financial_claim", pattern: /\b(guaranteed return|risk-free investment)\b/i }
];

@Injectable()
export class AiService {
  constructor(private readonly billingService: BillingService) {}

  generate(input: GenerateContentDto): AiGenerationResponse {
    this.billingService.assertAllowed(input.workspaceId, "aiGenerations", 1);
    const flags = sensitivePatterns
      .filter(({ pattern }) => pattern.test(input.brief))
      .map(({ label }) => label);
    const riskScore = Math.min(flags.length * 0.28, 1);

    const variants = input.platforms.map((platform) =>
      this.createVariant({
        platform,
        brief: input.brief,
        tone: input.tone ?? "professional",
        objective: input.objective ?? "engagement"
      })
    );

    return {
      id: randomUUID(),
      modelUsed: "model-router/local-deterministic-v1",
      safety: {
        blocked: riskScore >= 0.75,
        riskScore,
        flags
      },
      variants,
      qualityScore: Math.max(72, 96 - flags.length * 12),
      estimatedTokens: Math.ceil(input.brief.length / 3.8) + variants.length * 80
    };
  }

  private createVariant({
    platform,
    brief,
    tone,
    objective
  }: {
    platform: Platform;
    brief: string;
    tone: string;
    objective: string;
  }) {
    const capability = supportedPlatformCapabilities[platform];
    const cleanBrief = brief.replace(/\s+/g, " ").trim();
    const hook = this.platformHook(platform);
    const cta = objective.toLowerCase().includes("conversion")
      ? "Start with the launch checklist today."
      : "Save this for your next planning sprint.";
    const text = `${hook} ${cleanBrief} Tone: ${tone}. ${cta}`.slice(0, capability.maxCharacters);

    return {
      platform,
      text,
      hashtags: this.hashtagsFor(platform),
      firstComment: platform === "instagram" || platform === "linkedin" ? cta : undefined
    };
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
