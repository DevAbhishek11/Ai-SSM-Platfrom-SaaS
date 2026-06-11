import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { demoBrandVoices, type BrandVoice } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type { CreateBrandVoiceDto, EvaluateBrandVoiceDto, UpdateBrandVoiceDto } from "./dto.js";

type BrandVoiceVocabulary = BrandVoice["vocabulary"];

@Injectable()
export class BrandVoicesService {
  private readonly brandVoices: BrandVoice[] = demoBrandVoices.map((voice) => ({
    ...voice,
    tone: { ...voice.tone },
    style: { ...voice.style },
    vocabulary: {
      preferredTerms: [...voice.vocabulary.preferredTerms],
      bannedTerms: [...voice.vocabulary.bannedTerms],
      industryTerms: [...voice.vocabulary.industryTerms]
    },
    ctaPreferences: { ...voice.ctaPreferences },
    examples: [...voice.examples]
  }));

  constructor(private readonly auditService: AuditService) {}

  list(workspaceId: string) {
    return this.brandVoices
      .filter((voice) => voice.workspaceId === workspaceId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string) {
    return this.findById(id);
  }

  create(input: CreateBrandVoiceDto, user: Principal) {
    this.assertUniqueName(input.workspaceId, input.name);
    const now = new Date().toISOString();
    const voice: BrandVoice = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      tone: input.tone ?? { primary: "professional", secondary: "clear" },
      style: input.style ?? { sentenceLength: "medium", formality: "professional" },
      vocabulary: this.normalizeVocabulary(input.vocabulary),
      emojiUsage: input.emojiUsage ?? "light",
      ctaPreferences: input.ctaPreferences ?? { mode: "value-led" },
      examples: input.examples ?? [],
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    this.brandVoices.unshift(voice);
    this.auditService.record({
      workspaceId: voice.workspaceId,
      userId: user.userId,
      action: "brand_voice.created",
      entityType: "brand_voice",
      entityId: voice.id,
      newValues: { name: voice.name, version: voice.version }
    });
    return voice;
  }

  update(id: string, input: UpdateBrandVoiceDto, user: Principal) {
    const voice = this.findById(id);
    if (input.name && input.name !== voice.name) {
      this.assertUniqueName(voice.workspaceId, input.name, voice.id);
    }

    const previous = this.snapshot(voice);
    voice.name = input.name ?? voice.name;
    voice.tone = input.tone ?? voice.tone;
    voice.style = input.style ?? voice.style;
    voice.vocabulary = input.vocabulary ? this.normalizeVocabulary(input.vocabulary) : voice.vocabulary;
    voice.emojiUsage = input.emojiUsage ?? voice.emojiUsage;
    voice.ctaPreferences = input.ctaPreferences ?? voice.ctaPreferences;
    voice.examples = input.examples ?? voice.examples;
    voice.version += 1;
    voice.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: voice.workspaceId,
      userId: user.userId,
      action: "brand_voice.updated",
      entityType: "brand_voice",
      entityId: voice.id,
      oldValues: previous,
      newValues: this.snapshot(voice)
    });
    return voice;
  }

  duplicate(id: string, user: Principal) {
    const source = this.findById(id);
    const now = new Date().toISOString();
    const copy: BrandVoice = {
      ...source,
      id: randomUUID(),
      name: `${source.name} Copy`,
      vocabulary: {
        preferredTerms: [...source.vocabulary.preferredTerms],
        bannedTerms: [...source.vocabulary.bannedTerms],
        industryTerms: [...source.vocabulary.industryTerms]
      },
      examples: [...source.examples],
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.assertUniqueName(copy.workspaceId, copy.name);
    this.brandVoices.unshift(copy);
    this.auditService.record({
      workspaceId: copy.workspaceId,
      userId: user.userId,
      action: "brand_voice.duplicated",
      entityType: "brand_voice",
      entityId: copy.id,
      newValues: { sourceId: source.id, name: copy.name }
    });
    return copy;
  }

  evaluate(id: string, input: EvaluateBrandVoiceDto) {
    return this.evaluateText(this.findById(id), input.text);
  }

  evaluateText(voice: BrandVoice, text: string) {
    const lowerText = text.toLowerCase();
    const bannedTerms = voice.vocabulary.bannedTerms.filter((term) =>
      lowerText.includes(term.toLowerCase())
    );
    const preferredTermsUsed = voice.vocabulary.preferredTerms.filter((term) =>
      lowerText.includes(term.toLowerCase())
    );
    const industryTermsUsed = voice.vocabulary.industryTerms.filter((term) =>
      lowerText.includes(term.toLowerCase())
    );
    const score = Math.max(
      0,
      Math.min(100, 82 + preferredTermsUsed.length * 4 + industryTermsUsed.length * 2 - bannedTerms.length * 18)
    );

    return {
      brandVoiceId: voice.id,
      name: voice.name,
      version: voice.version,
      score,
      bannedTerms,
      preferredTermsUsed,
      industryTermsUsed,
      recommendations: this.recommendations(voice, bannedTerms, preferredTermsUsed)
    };
  }

  private findById(id: string) {
    const voice = this.brandVoices.find((item) => item.id === id);
    if (!voice) {
      throw new NotFoundException("Brand voice not found");
    }
    return voice;
  }

  private assertUniqueName(workspaceId: string, name: string, excludeId?: string) {
    const exists = this.brandVoices.some(
      (voice) => voice.workspaceId === workspaceId && voice.name === name && voice.id !== excludeId
    );
    if (exists) {
      throw new BadRequestException("Brand voice name already exists in this workspace");
    }
  }

  private normalizeVocabulary(input?: {
    preferredTerms?: string[];
    bannedTerms?: string[];
    industryTerms?: string[];
  }): BrandVoiceVocabulary {
    return {
      preferredTerms: this.uniqueTerms(input?.preferredTerms),
      bannedTerms: this.uniqueTerms(input?.bannedTerms),
      industryTerms: this.uniqueTerms(input?.industryTerms)
    };
  }

  private uniqueTerms(terms?: string[]) {
    return [...new Set((terms ?? []).map((term) => term.trim()).filter(Boolean))];
  }

  private recommendations(voice: BrandVoice, bannedTerms: string[], preferredTermsUsed: string[]) {
    const recommendations: string[] = [];
    if (bannedTerms.length > 0) {
      recommendations.push(`Remove banned terms: ${bannedTerms.join(", ")}.`);
    }
    const missingPreferred = voice.vocabulary.preferredTerms.filter(
      (term) => !preferredTermsUsed.includes(term)
    );
    if (missingPreferred.length > 0) {
      recommendations.push(`Consider using preferred language: ${missingPreferred.slice(0, 3).join(", ")}.`);
    }
    if (voice.emojiUsage === "none" && /[\u{1F300}-\u{1FAFF}]/u.test(recommendations.join(" "))) {
      recommendations.push("Avoid emoji for this voice.");
    }
    return recommendations;
  }

  private snapshot(voice: BrandVoice) {
    return {
      name: voice.name,
      tone: voice.tone,
      style: voice.style,
      vocabulary: voice.vocabulary,
      emojiUsage: voice.emojiUsage,
      ctaPreferences: voice.ctaPreferences,
      examples: voice.examples,
      version: voice.version
    };
  }
}
