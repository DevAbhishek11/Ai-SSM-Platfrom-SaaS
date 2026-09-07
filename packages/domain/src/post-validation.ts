import { platforms, supportedPlatformCapabilities, type Platform } from "./constants.js";

/**
 * Per-platform composing rules.
 *
 * These are deliberately kept as data rather than branching logic so the API
 * (which enforces them) and the composer UI (which previews them live) cannot
 * drift apart. Character ceilings come from `supportedPlatformCapabilities`;
 * everything else encodes the publishing quirks that make a post fail *after*
 * it has been accepted, which is the expensive kind of failure.
 */
export type PlatformPostRules = {
  /** Hard character ceiling enforced by the network. */
  maxCharacters: number;
  /** Point at which we warn that engagement typically drops. */
  recommendedCharacters: number;
  /** Hard cap on hashtags; posts above it are commonly rejected or filtered. */
  maxHashtags: number;
  /** Above this we warn about spam heuristics. */
  recommendedHashtags: number;
  /** Maximum attachments in a single post. */
  maxMediaAttachments: number;
  /** Networks that cannot publish a text-only post. */
  requiresMedia: boolean;
  supportsFirstComment: boolean;
  supportsLinks: boolean;
  /**
   * Length a URL is billed at regardless of its real length (X's t.co
   * behaviour). Zero means the raw URL length counts.
   */
  linkCharacterCost: number;
};

const baseRules: Record<
  Platform,
  Omit<PlatformPostRules, "maxCharacters" | "recommendedCharacters">
> = {
  x: {
    maxHashtags: 10,
    recommendedHashtags: 2,
    maxMediaAttachments: 4,
    requiresMedia: false,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 23
  },
  instagram: {
    maxHashtags: 30,
    recommendedHashtags: 12,
    maxMediaAttachments: 10,
    requiresMedia: true,
    supportsFirstComment: true,
    supportsLinks: false,
    linkCharacterCost: 0
  },
  facebook: {
    maxHashtags: 20,
    recommendedHashtags: 3,
    maxMediaAttachments: 10,
    requiresMedia: false,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  linkedin: {
    maxHashtags: 20,
    recommendedHashtags: 5,
    maxMediaAttachments: 9,
    requiresMedia: false,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  youtube: {
    maxHashtags: 15,
    recommendedHashtags: 5,
    maxMediaAttachments: 1,
    requiresMedia: true,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  tiktok: {
    maxHashtags: 20,
    recommendedHashtags: 5,
    maxMediaAttachments: 1,
    requiresMedia: true,
    supportsFirstComment: true,
    supportsLinks: false,
    linkCharacterCost: 0
  },
  reddit: {
    maxHashtags: 0,
    recommendedHashtags: 0,
    maxMediaAttachments: 20,
    requiresMedia: false,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  pinterest: {
    maxHashtags: 20,
    recommendedHashtags: 5,
    maxMediaAttachments: 1,
    requiresMedia: true,
    supportsFirstComment: false,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  threads: {
    maxHashtags: 10,
    recommendedHashtags: 3,
    maxMediaAttachments: 10,
    requiresMedia: false,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  mastodon: {
    maxHashtags: 20,
    recommendedHashtags: 4,
    maxMediaAttachments: 4,
    requiresMedia: false,
    supportsFirstComment: true,
    supportsLinks: true,
    linkCharacterCost: 0
  },
  bluesky: {
    maxHashtags: 10,
    recommendedHashtags: 3,
    maxMediaAttachments: 4,
    requiresMedia: false,
    supportsFirstComment: false,
    supportsLinks: true,
    linkCharacterCost: 0
  }
};

export const platformPostRules: Record<Platform, PlatformPostRules> = Object.fromEntries(
  platforms.map((platform) => {
    const maxCharacters = supportedPlatformCapabilities[platform].maxCharacters;
    return [
      platform,
      {
        ...baseRules[platform],
        maxCharacters,
        // Long-form networks have ceilings far above what anyone should post,
        // so the "recommended" line is capped at a readable length.
        recommendedCharacters: Math.min(maxCharacters, maxCharacters > 3000 ? 1300 : maxCharacters)
      }
    ];
  })
) as Record<Platform, PlatformPostRules>;

export const postIssueFields = [
  "text",
  "hashtags",
  "link",
  "media",
  "firstComment",
  "schedule",
  "platform"
] as const;
export type PostIssueField = (typeof postIssueFields)[number];

export type PostValidationIssue = {
  platform: Platform;
  /** Stable identifier; safe to branch on and to translate. */
  code: string;
  severity: "error" | "warning";
  field: PostIssueField;
  message: string;
};

export type PostVariantInput = {
  platform: Platform;
  text: string;
  hashtags?: string[];
  firstComment?: string;
  link?: string;
};

export type PostValidationInput = {
  content: PostVariantInput[];
  mediaCount?: number;
  scheduledAt?: string;
  /** Reference point for schedule checks; defaults to now. Injected in tests. */
  now?: Date;
};

export type PlatformValidationSummary = {
  platform: Platform;
  characterCount: number;
  characterLimit: number;
  remaining: number;
  hashtagCount: number;
  hashtagLimit: number;
  errors: PostValidationIssue[];
  warnings: PostValidationIssue[];
  valid: boolean;
};

export type PostValidationResult = {
  valid: boolean;
  issues: PostValidationIssue[];
  platforms: PlatformValidationSummary[];
};

const urlPattern = /https?:\/\/[^\s]+/gi;

/**
 * Counts a post the way the network counts it.
 *
 * Naive `text.length` overstates X posts (every URL is rewritten to a fixed
 * 23-character t.co link) and understates nothing, so a composer that uses it
 * tells the user they are over the limit when they are not.
 */
export function countPostCharacters(text: string, platform: Platform): number {
  const rules = platformPostRules[platform];
  if (rules.linkCharacterCost <= 0) {
    return [...text].length;
  }

  let count = 0;
  let cursor = 0;
  urlPattern.lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    count += [...text.slice(cursor, index)].length + rules.linkCharacterCost;
    cursor = index + match[0].length;
  }

  return count + [...text.slice(cursor)].length;
}

/** Extracts `#tags` from free text, lowercased and de-duplicated. */
export function extractHashtags(text: string): string[] {
  const found = text.match(/#[\p{L}\p{M}\p{N}_]+/gu) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of found) {
    const tag = raw.slice(1).toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }

  return result;
}

/** Normalises user input into a bare, lowercase tag without the leading `#`. */
export function normalizeHashtag(value: string): string {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{M}\p{N}_]/gu, "")
    .toLowerCase();
}

function countHashtags(variant: PostVariantInput): number {
  const inline = extractHashtags(variant.text);
  const explicit = (variant.hashtags ?? []).map(normalizeHashtag).filter(Boolean);
  return new Set([...inline, ...explicit]).size;
}

function validateVariant(
  variant: PostVariantInput,
  mediaCount: number
): PlatformValidationSummary {
  const rules = platformPostRules[variant.platform];
  const issues: PostValidationIssue[] = [];
  const characterCount = countPostCharacters(variant.text, variant.platform);
  const hashtagCount = countHashtags(variant);

  const add = (
    code: string,
    severity: PostValidationIssue["severity"],
    field: PostIssueField,
    message: string
  ) => issues.push({ platform: variant.platform, code, severity, field, message });

  if (variant.text.trim().length === 0) {
    add("empty_text", "error", "text", "Add some text before publishing.");
  }

  if (characterCount > rules.maxCharacters) {
    add(
      "text_too_long",
      "error",
      "text",
      `${characterCount} characters is ${characterCount - rules.maxCharacters} over the ${rules.maxCharacters} limit.`
    );
  } else if (characterCount > rules.recommendedCharacters) {
    add(
      "text_long",
      "warning",
      "text",
      `Posts over ${rules.recommendedCharacters} characters tend to lose readers.`
    );
  }

  if (rules.maxHashtags === 0 && hashtagCount > 0) {
    add("hashtags_unsupported", "warning", "hashtags", "Hashtags are not conventional here.");
  } else if (hashtagCount > rules.maxHashtags) {
    add(
      "too_many_hashtags",
      "error",
      "hashtags",
      `${hashtagCount} hashtags exceeds the limit of ${rules.maxHashtags}.`
    );
  } else if (hashtagCount > rules.recommendedHashtags) {
    add(
      "hashtag_spam_risk",
      "warning",
      "hashtags",
      `More than ${rules.recommendedHashtags} hashtags can trigger spam filters.`
    );
  }

  if (variant.link && !rules.supportsLinks) {
    add(
      "links_not_clickable",
      "warning",
      "link",
      "Links are not clickable on this network; point to a bio link instead."
    );
  }

  if (variant.firstComment && !rules.supportsFirstComment) {
    add(
      "first_comment_unsupported",
      "error",
      "firstComment",
      "This network does not support an automatic first comment."
    );
  }

  if (rules.requiresMedia && mediaCount === 0) {
    add("media_required", "error", "media", "This network requires at least one image or video.");
  }

  if (mediaCount > rules.maxMediaAttachments) {
    add(
      "too_many_media",
      "error",
      "media",
      `${mediaCount} attachments exceeds the limit of ${rules.maxMediaAttachments}.`
    );
  }

  if (/[A-Z]{15,}/.test(variant.text)) {
    add("shouting", "warning", "text", "Long runs of capitals read as shouting.");
  }

  const errors = issues.filter((issue) => issue.severity === "error");

  return {
    platform: variant.platform,
    characterCount,
    characterLimit: rules.maxCharacters,
    remaining: rules.maxCharacters - characterCount,
    hashtagCount,
    hashtagLimit: rules.maxHashtags,
    errors,
    warnings: issues.filter((issue) => issue.severity === "warning"),
    valid: errors.length === 0
  };
}

/**
 * Validates a whole post across every selected platform.
 *
 * Errors block publishing; warnings are advisory and surfaced inline. The
 * caller gets both a flat list (for an API response) and a per-platform
 * summary (for the composer's tab badges).
 */
export function validatePost(input: PostValidationInput): PostValidationResult {
  const mediaCount = input.mediaCount ?? 0;
  const summaries = input.content.map((variant) => validateVariant(variant, mediaCount));
  const issues = summaries.flatMap((summary) => [...summary.errors, ...summary.warnings]);

  if (input.content.length === 0) {
    issues.push({
      platform: platforms[0],
      code: "no_platform",
      severity: "error",
      field: "platform",
      message: "Select at least one platform."
    });
  }

  const duplicates = input.content
    .map((variant) => variant.platform)
    .filter((platform, index, all) => all.indexOf(platform) !== index);
  for (const platform of new Set(duplicates)) {
    issues.push({
      platform,
      code: "duplicate_platform",
      severity: "error",
      field: "platform",
      message: `${platform} appears more than once.`
    });
  }

  if (input.scheduledAt) {
    const scheduled = new Date(input.scheduledAt);
    const now = input.now ?? new Date();
    if (Number.isNaN(scheduled.getTime())) {
      issues.push({
        platform: input.content[0]?.platform ?? platforms[0],
        code: "invalid_schedule",
        severity: "error",
        field: "schedule",
        message: "Scheduled time is not a valid date."
      });
    } else if (scheduled.getTime() <= now.getTime()) {
      issues.push({
        platform: input.content[0]?.platform ?? platforms[0],
        code: "schedule_in_past",
        severity: "error",
        field: "schedule",
        message: "Scheduled time is in the past."
      });
    } else if (scheduled.getTime() - now.getTime() < 5 * 60 * 1000) {
      issues.push({
        platform: input.content[0]?.platform ?? platforms[0],
        code: "schedule_too_soon",
        severity: "warning",
        field: "schedule",
        message: "Less than five minutes out leaves no room for approval."
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    platforms: summaries
  };
}
