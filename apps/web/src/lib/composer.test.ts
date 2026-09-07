import { describe, expect, it } from "vitest";
import {
  composerReducer,
  counterFor,
  createComposerState,
  fromPost,
  toPostPayload,
  validateComposer,
  type ComposerState
} from "./composer";

const base = () => createComposerState({ platforms: ["x", "linkedin"], master: "Shared copy" });

describe("createComposerState", () => {
  it("mirrors the shared copy into every platform", () => {
    const state = base();

    expect(state.variants.map((variant) => variant.text)).toEqual(["Shared copy", "Shared copy"]);
    expect(state.variants.every((variant) => !variant.forked)).toBe(true);
    expect(state.dirty).toBe(false);
  });

  it("focuses the first platform by default", () => {
    expect(base().activePlatform).toBe("x");
  });
});

describe("shared editing", () => {
  it("propagates the shared draft to unforked platforms", () => {
    const state = composerReducer(base(), { type: "set_master", text: "Updated" });

    expect(state.variants.map((variant) => variant.text)).toEqual(["Updated", "Updated"]);
    expect(state.dirty).toBe(true);
  });

  it("forks a platform once its text diverges", () => {
    const state = composerReducer(base(), {
      type: "set_variant_text",
      platform: "x",
      text: "X only"
    });

    expect(state.variants[0]).toMatchObject({ text: "X only", forked: true });
    expect(state.variants[1]).toMatchObject({ text: "Shared copy", forked: false });
  });

  it("never overwrites a forked platform from the shared editor", () => {
    let state = composerReducer(base(), { type: "set_variant_text", platform: "x", text: "X only" });
    state = composerReducer(state, { type: "set_master", text: "Everyone else" });

    expect(state.variants[0].text).toBe("X only");
    expect(state.variants[1].text).toBe("Everyone else");
  });

  it("un-forks when the text is typed back to match the shared draft", () => {
    let state = composerReducer(base(), { type: "set_variant_text", platform: "x", text: "X only" });
    state = composerReducer(state, { type: "set_variant_text", platform: "x", text: "Shared copy" });

    expect(state.variants[0].forked).toBe(false);
  });

  it("resets a forked platform back to the shared draft on demand", () => {
    let state = composerReducer(base(), { type: "set_variant_text", platform: "x", text: "X only" });
    state = composerReducer(state, { type: "reset_variant", platform: "x" });

    expect(state.variants[0]).toMatchObject({ text: "Shared copy", forked: false });
  });
});

describe("platform selection", () => {
  it("adds a platform seeded with the shared draft and focuses it", () => {
    const state = composerReducer(base(), { type: "add_platform", platform: "instagram" });

    expect(state.variants).toHaveLength(3);
    expect(state.variants[2]).toMatchObject({ platform: "instagram", text: "Shared copy" });
    expect(state.activePlatform).toBe("instagram");
  });

  it("ignores adding a platform that is already selected", () => {
    const state = composerReducer(base(), { type: "add_platform", platform: "x" });
    expect(state.variants).toHaveLength(2);
  });

  it("removes a platform and moves focus off it", () => {
    const state = composerReducer(base(), { type: "remove_platform", platform: "x" });

    expect(state.variants.map((variant) => variant.platform)).toEqual(["linkedin"]);
    expect(state.activePlatform).toBe("linkedin");
  });

  it("refuses to remove the last platform", () => {
    const single = createComposerState({ platforms: ["x"] });
    expect(composerReducer(single, { type: "remove_platform", platform: "x" })).toBe(single);
  });

  it("toggles a platform on and back off", () => {
    const added = composerReducer(base(), { type: "toggle_platform", platform: "threads" });
    expect(added.variants).toHaveLength(3);

    const removed = composerReducer(added, { type: "toggle_platform", platform: "threads" });
    expect(removed.variants).toHaveLength(2);
  });
});

describe("per-variant fields", () => {
  it("stores a first comment and clears it on empty input", () => {
    let state = composerReducer(base(), {
      type: "set_first_comment",
      platform: "x",
      value: "More context"
    });
    expect(state.variants[0].firstComment).toBe("More context");

    state = composerReducer(state, { type: "set_first_comment", platform: "x", value: "" });
    expect(state.variants[0].firstComment).toBeUndefined();
  });

  it("stores hashtags per platform", () => {
    const state = composerReducer(base(), {
      type: "set_hashtags",
      platform: "linkedin",
      hashtags: ["growth"]
    });

    expect(state.variants[1].hashtags).toEqual(["growth"]);
    expect(state.variants[0].hashtags).toEqual([]);
  });

  it("does not mark the draft dirty when only focus changes", () => {
    const state = composerReducer(base(), { type: "focus", platform: "linkedin" });

    expect(state.activePlatform).toBe("linkedin");
    expect(state.dirty).toBe(false);
  });

  it("clears the dirty flag when a saved post is loaded back in", () => {
    const edited = composerReducer(base(), { type: "set_master", text: "Edited" });
    const reloaded = composerReducer(edited, { type: "load", state: edited });

    expect(reloaded.dirty).toBe(false);
  });
});

describe("validateComposer", () => {
  it("surfaces a per-platform failure without condemning the others", () => {
    const state = composerReducer(base(), {
      type: "set_variant_text",
      platform: "x",
      text: "a".repeat(400)
    });

    const result = validateComposer(state);
    expect(result.valid).toBe(false);
    expect(result.platforms.find((entry) => entry.platform === "x")?.valid).toBe(false);
    expect(result.platforms.find((entry) => entry.platform === "linkedin")?.valid).toBe(true);
  });

  it("counts attached media towards platforms that require it", () => {
    let state = createComposerState({ platforms: ["instagram"], master: "Look" });
    expect(validateComposer(state).valid).toBe(false);

    state = composerReducer(state, { type: "set_media", mediaIds: ["asset-1"] });
    expect(validateComposer(state).valid).toBe(true);
  });
});

describe("counterFor", () => {
  it("reports the count, remaining budget and over-limit state", () => {
    const state = createComposerState({ platforms: ["x"], master: "12345" });
    expect(counterFor(state, "x")).toMatchObject({ count: 5, limit: 280, remaining: 275, over: false });
  });

  it("bills a link at the shortened cost rather than its real length", () => {
    const url = `https://example.com/${"a".repeat(100)}`;
    const state = createComposerState({ platforms: ["x"], master: url });

    expect(counterFor(state, "x").count).toBe(23);
  });

  it("flags the last ten percent as near the limit before it fails", () => {
    const state = createComposerState({ platforms: ["x"], master: "a".repeat(275) });
    expect(counterFor(state, "x")).toMatchObject({ over: false, nearLimit: true });
  });

  it("goes negative and reports over once past the ceiling", () => {
    const state = createComposerState({ platforms: ["x"], master: "a".repeat(300) });
    expect(counterFor(state, "x")).toMatchObject({ remaining: -20, over: true });
  });
});

describe("payload round-trip", () => {
  it("shapes state into the API payload", () => {
    const state: ComposerState = composerReducer(base(), {
      type: "set_schedule",
      scheduledAt: "2026-12-01T09:00:00.000Z"
    });

    expect(toPostPayload(state)).toEqual({
      content: [
        { platform: "x", text: "Shared copy", hashtags: [], firstComment: undefined, link: undefined },
        {
          platform: "linkedin",
          text: "Shared copy",
          hashtags: [],
          firstComment: undefined,
          link: undefined
        }
      ],
      mediaIds: [],
      scheduledAt: "2026-12-01T09:00:00.000Z",
      campaignId: undefined
    });
  });

  it("restores a uniform post as an unforked shared draft", () => {
    const state = fromPost({
      content: [
        { platform: "x", text: "Same" },
        { platform: "linkedin", text: "Same" }
      ]
    });

    expect(state.master).toBe("Same");
    expect(state.variants.every((variant) => !variant.forked)).toBe(true);
    expect(state.dirty).toBe(false);
  });

  it("restores a divergent post with every platform forked", () => {
    const state = fromPost({
      content: [
        { platform: "x", text: "One" },
        { platform: "linkedin", text: "Two" }
      ]
    });

    expect(state.master).toBe("");
    expect(state.variants.every((variant) => variant.forked)).toBe(true);
  });

  it("survives a full round-trip through the payload shape", () => {
    const original = composerReducer(base(), {
      type: "set_variant_text",
      platform: "x",
      text: "X flavour"
    });

    const restored = fromPost(toPostPayload(original));
    expect(restored.variants.map((variant) => variant.text)).toEqual(["X flavour", "Shared copy"]);
  });
});
