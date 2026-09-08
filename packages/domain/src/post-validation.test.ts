import { describe, expect, it } from "vitest";
import {
  countPostCharacters,
  extractHashtags,
  normalizeHashtag,
  platformPostRules,
  validatePost
} from "./post-validation.js";

describe("countPostCharacters", () => {
  it("counts plain text by grapheme-safe length", () => {
    expect(countPostCharacters("hello", "x")).toBe(5);
  });

  it("bills every URL on X at the fixed t.co cost, not its real length", () => {
    const long = "https://example.com/a/very/long/path/that/keeps/going/and/going?x=1";
    expect(long.length).toBeGreaterThan(23);
    expect(countPostCharacters(long, "x")).toBe(23);
  });

  it("counts the text around a link as well as the link", () => {
    expect(countPostCharacters("see https://a.co now", "x")).toBe("see ".length + 23 + " now".length);
  });

  it("counts raw URL length on networks without link shortening", () => {
    const url = "https://example.com/page";
    expect(countPostCharacters(url, "linkedin")).toBe(url.length);
  });

  it("treats an emoji as a single character", () => {
    expect(countPostCharacters("🚀", "x")).toBe(1);
  });
});

describe("hashtag helpers", () => {
  it("extracts inline hashtags, lowercased and de-duplicated", () => {
    expect(extractHashtags("#Launch day #launch #Growth")).toEqual(["launch", "growth"]);
  });

  it("supports non-latin hashtags", () => {
    expect(extractHashtags("#उत्पाद launch")).toEqual(["उत्पाद"]);
  });

  it("strips punctuation and leading hashes when normalising", () => {
    expect(normalizeHashtag("  ##Product-Launch! ")).toBe("productlaunch");
  });
});

describe("validatePost", () => {
  const future = new Date("2026-01-01T12:00:00.000Z");
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("accepts a well-formed post", () => {
    const result = validatePost({
      content: [{ platform: "x", text: "A tight, useful update. #launch" }],
      scheduledAt: future.toISOString(),
      now
    });

    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("rejects text over the platform ceiling and reports the overage", () => {
    const result = validatePost({ content: [{ platform: "x", text: "a".repeat(300) }] });
    const error = result.issues.find((issue) => issue.code === "text_too_long");

    expect(result.valid).toBe(false);
    expect(error?.message).toContain("20 over");
  });

  it("does not flag a link-heavy X post that fits once shortened", () => {
    const text = `Read this ${"https://example.com/" + "a".repeat(300)}`;
    const result = validatePost({ content: [{ platform: "x", text }] });

    expect(result.issues.some((issue) => issue.code === "text_too_long")).toBe(false);
  });

  it("requires media on networks that cannot post text alone", () => {
    const result = validatePost({ content: [{ platform: "instagram", text: "hello" }] });
    expect(result.issues.some((issue) => issue.code === "media_required")).toBe(true);

    const withMedia = validatePost({
      content: [{ platform: "instagram", text: "hello" }],
      mediaCount: 1
    });
    expect(withMedia.issues.some((issue) => issue.code === "media_required")).toBe(false);
  });

  it("counts inline and explicit hashtags as one set", () => {
    const result = validatePost({
      content: [{ platform: "x", text: "#a #b", hashtags: ["#B", "c"] }]
    });

    expect(result.platforms[0].hashtagCount).toBe(3);
  });

  it("errors past the hard hashtag cap and warns before it", () => {
    const many = Array.from({ length: 11 }, (_, index) => `tag${index}`);
    const over = validatePost({ content: [{ platform: "x", text: "hi", hashtags: many }] });
    expect(over.issues.some((issue) => issue.code === "too_many_hashtags")).toBe(true);

    const warn = validatePost({
      content: [{ platform: "x", text: "hi", hashtags: ["one", "two", "three"] }]
    });
    expect(warn.valid).toBe(true);
    expect(warn.issues.some((issue) => issue.code === "hashtag_spam_risk")).toBe(true);
  });

  it("warns rather than blocks when links are not clickable", () => {
    const result = validatePost({
      content: [{ platform: "instagram", text: "hi", link: "https://a.co" }],
      mediaCount: 1
    });

    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.code === "links_not_clickable")).toBe(true);
  });

  it("blocks a first comment on a network that cannot deliver one", () => {
    const result = validatePost({
      content: [{ platform: "bluesky", text: "hi", firstComment: "more" }]
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "first_comment_unsupported")).toBe(true);
  });

  it("rejects an empty platform list and duplicated platforms", () => {
    expect(validatePost({ content: [] }).issues.some((issue) => issue.code === "no_platform")).toBe(
      true
    );

    const duplicated = validatePost({
      content: [
        { platform: "x", text: "one" },
        { platform: "x", text: "two" }
      ]
    });
    expect(duplicated.issues.filter((issue) => issue.code === "duplicate_platform")).toHaveLength(1);
  });

  it("rejects a schedule in the past and warns when it is imminent", () => {
    const past = validatePost({
      content: [{ platform: "x", text: "hi" }],
      scheduledAt: "2025-12-31T00:00:00.000Z",
      now
    });
    expect(past.issues.some((issue) => issue.code === "schedule_in_past")).toBe(true);

    const soon = validatePost({
      content: [{ platform: "x", text: "hi" }],
      scheduledAt: new Date(now.getTime() + 60_000).toISOString(),
      now
    });
    expect(soon.valid).toBe(true);
    expect(soon.issues.some((issue) => issue.code === "schedule_too_soon")).toBe(true);
  });

  it("rejects an unparseable schedule", () => {
    const result = validatePost({
      content: [{ platform: "x", text: "hi" }],
      scheduledAt: "not-a-date",
      now
    });

    expect(result.issues.some((issue) => issue.code === "invalid_schedule")).toBe(true);
  });

  it("summarises each platform independently so tabs can badge themselves", () => {
    const result = validatePost({
      content: [
        { platform: "x", text: "a".repeat(300) },
        { platform: "linkedin", text: "a".repeat(300) }
      ]
    });

    const x = result.platforms.find((entry) => entry.platform === "x");
    const linkedin = result.platforms.find((entry) => entry.platform === "linkedin");

    expect(x?.valid).toBe(false);
    expect(x?.remaining).toBe(280 - 300);
    expect(linkedin?.valid).toBe(true);
    expect(linkedin?.remaining).toBe(3000 - 300);
  });

  it("derives rules for every supported platform", () => {
    for (const [platform, rules] of Object.entries(platformPostRules)) {
      expect(rules.maxCharacters, platform).toBeGreaterThan(0);
      expect(rules.recommendedCharacters, platform).toBeLessThanOrEqual(rules.maxCharacters);
    }
  });
});
