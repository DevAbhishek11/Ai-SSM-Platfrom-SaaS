import {
  supportedPlatformCapabilities,
  type BrandVoice,
  type Platform,
  type PostContentVariant
} from "@ssm/domain";
import type { AiCompletionSpec } from "./types.js";

const platformHooks: Record<Platform, string> = {
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

export function hashtagsFor(platform: Platform): string[] {
  if (platform === "linkedin") {
    return ["B2BMarketing", "SocialOps", "AIContent"];
  }
  if (platform === "instagram" || platform === "tiktok") {
    return ["SocialMedia", "ContentStrategy", "LaunchPlan"];
  }
  return ["SocialOps", "AI", "Marketing"];
}

export function ctaFor(objective: string, brandVoice?: BrandVoice): string {
  const examples = brandVoice?.ctaPreferences.examples;
  if (Array.isArray(examples) && examples.every((item) => typeof item === "string") && examples.length > 0) {
    return examples[0] as string;
  }
  return objective.toLowerCase().includes("conversion")
    ? "Start with the launch checklist today."
    : "Save this for your next planning sprint.";
}

export function resolveTone(inputTone: string | undefined, brandVoice?: BrandVoice): string {
  if (!brandVoice) {
    return inputTone ?? "professional";
  }
  const primary = typeof brandVoice.tone.primary === "string" ? brandVoice.tone.primary : "professional";
  const secondary = typeof brandVoice.tone.secondary === "string" ? brandVoice.tone.secondary : "clear";
  return `${primary} and ${secondary}`;
}

/** Trims a variant to the platform character budget without cutting mid-word when avoidable. */
export function clampToPlatform(platform: Platform, text: string): string {
  const limit = supportedPlatformCapabilities[platform].maxCharacters;
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  const truncated = normalized.slice(0, limit);
  const lastBoundary = truncated.lastIndexOf(" ");
  return (lastBoundary > limit * 0.6 ? truncated.slice(0, lastBoundary) : truncated).trim();
}

export function composeVariant(platform: Platform, spec: AiCompletionSpec): PostContentVariant {
  const brandVoice = spec.brandVoice;
  const cleanBrief = spec.brief.replace(/\s+/g, " ").trim();
  const hook = platformHooks[platform];
  const cta = ctaFor(spec.objective, brandVoice);
  const vocabulary = brandVoice?.vocabulary.preferredTerms.slice(0, 2).join(" and ");
  const voiceContext = vocabulary ? `Use ${vocabulary} as the shared language.` : `Tone: ${spec.tone}.`;

  return {
    platform,
    text: clampToPlatform(platform, `${hook} ${cleanBrief} ${voiceContext} ${cta}`),
    hashtags: hashtagsFor(platform),
    firstComment: platform === "instagram" || platform === "linkedin" ? cta : undefined
  };
}

/** Deterministic, dependency-free composition used by the local provider and as a repair path. */
export function composeVariants(spec: AiCompletionSpec): PostContentVariant[] {
  return spec.platforms.map((platform) => composeVariant(platform, spec));
}
