import { supportedPlatformCapabilities, type BrandVoice } from "@ssm/domain";
import type { AiCompletionSpec } from "./providers/types.js";

const SYSTEM_PROMPT = [
  "You are the content engine of an enterprise social media management platform.",
  "You write platform-native social copy that is accurate, brand-safe, and ready to schedule.",
  "Hard rules:",
  "1. Never invent statistics, prices, dates, awards, or customer names.",
  "2. Never produce medical, legal, or guaranteed-financial-outcome claims.",
  "3. Respect the character budget given for each platform.",
  "4. Respond with a single JSON object only. No markdown, no commentary, no code fences.",
  'JSON contract: {"variants":[{"platform":"<platform>","text":"<copy>","hashtags":["Tag"],"firstComment":"<optional>"}]}',
  "Return exactly one variant per requested platform, in the requested order.",
  "Hashtags must be provided without the # prefix."
].join("\n");

function brandVoiceBlock(brandVoice: BrandVoice | undefined): string {
  if (!brandVoice) {
    return "Brand voice: none configured. Default to a clear, professional B2B voice.";
  }

  const tone = Object.entries(brandVoice.tone)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
  const style = Object.entries(brandVoice.style)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");

  return [
    `Brand voice: ${brandVoice.name} (version ${brandVoice.version})`,
    `- Tone: ${tone || "professional"}`,
    `- Style: ${style || "clear"}`,
    `- Preferred terms (use naturally): ${brandVoice.vocabulary.preferredTerms.join(", ") || "none"}`,
    `- Banned terms (never use): ${brandVoice.vocabulary.bannedTerms.join(", ") || "none"}`,
    `- Emoji usage: ${brandVoice.emojiUsage}`,
    `- CTA preference: ${JSON.stringify(brandVoice.ctaPreferences)}`,
    brandVoice.examples.length > 0
      ? `- Reference examples: ${brandVoice.examples.slice(0, 3).join(" | ")}`
      : "- Reference examples: none"
  ].join("\n");
}

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(spec: AiCompletionSpec): string {
  const platformBudget = spec.platforms
    .map((platform) => {
      const capability = supportedPlatformCapabilities[platform];
      return `- ${platform}: max ${capability.maxCharacters} characters${
        capability.shortVideo ? ", short-video friendly" : ""
      }`;
    })
    .join("\n");

  return [
    `Brief: ${spec.brief.replace(/\s+/g, " ").trim()}`,
    `Objective: ${spec.objective}`,
    `Tone: ${spec.tone}`,
    "",
    "Platforms and character budgets:",
    platformBudget,
    "",
    brandVoiceBlock(spec.brandVoice),
    "",
    `Produce ${spec.platforms.length} variant(s) as JSON matching the contract.`
  ].join("\n");
}
