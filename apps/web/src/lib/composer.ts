import {
  platformPostRules,
  validatePost,
  type Platform,
  type PostValidationResult
} from "@ssm/domain";

/**
 * Composer state, as a pure reducer.
 *
 * The interesting behaviour in a multi-platform composer is not the rendering,
 * it is the rules: one shared draft that forks per network the moment someone
 * edits a single tab, character counts that mirror what each network actually
 * charges, and a dirty flag honest enough to drive a navigation guard. Keeping
 * all of that here means it can be tested without a browser.
 */

export type ComposerVariant = {
  platform: Platform;
  text: string;
  hashtags: string[];
  firstComment?: string;
  link?: string;
  /**
   * True once this tab has been edited away from the shared draft. Forked tabs
   * stop tracking the master text so an edit cannot silently discard them.
   */
  forked: boolean;
};

export type ComposerState = {
  /** The shared copy every unforked platform mirrors. */
  master: string;
  variants: ComposerVariant[];
  mediaIds: string[];
  scheduledAt?: string;
  campaignId?: string;
  activePlatform?: Platform;
  dirty: boolean;
};

export type ComposerAction =
  | { type: "set_master"; text: string }
  | { type: "set_variant_text"; platform: Platform; text: string }
  | { type: "add_platform"; platform: Platform }
  | { type: "remove_platform"; platform: Platform }
  | { type: "toggle_platform"; platform: Platform }
  | { type: "reset_variant"; platform: Platform }
  | { type: "set_first_comment"; platform: Platform; value: string }
  | { type: "set_link"; platform: Platform; value: string }
  | { type: "set_hashtags"; platform: Platform; hashtags: string[] }
  | { type: "set_media"; mediaIds: string[] }
  | { type: "set_schedule"; scheduledAt?: string }
  | { type: "set_campaign"; campaignId?: string }
  | { type: "focus"; platform: Platform }
  | { type: "load"; state: ComposerState };

export function createComposerState(
  overrides: Partial<ComposerState> & { platforms?: Platform[] } = {}
): ComposerState {
  const platforms = overrides.platforms ?? ["x"];
  const master = overrides.master ?? "";

  return {
    master,
    variants:
      overrides.variants ??
      platforms.map((platform) => ({
        platform,
        text: master,
        hashtags: [],
        forked: false
      })),
    mediaIds: overrides.mediaIds ?? [],
    scheduledAt: overrides.scheduledAt,
    campaignId: overrides.campaignId,
    activePlatform: overrides.activePlatform ?? platforms[0],
    dirty: overrides.dirty ?? false
  };
}

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case "load":
      return { ...action.state, dirty: false };

    case "set_master":
      return {
        ...state,
        master: action.text,
        // Only unforked tabs follow the shared draft.
        variants: state.variants.map((variant) =>
          variant.forked ? variant : { ...variant, text: action.text }
        ),
        dirty: true
      };

    case "set_variant_text":
      return {
        ...state,
        variants: state.variants.map((variant) =>
          variant.platform === action.platform
            ? { ...variant, text: action.text, forked: action.text !== state.master }
            : variant
        ),
        dirty: true
      };

    case "reset_variant":
      return {
        ...state,
        variants: state.variants.map((variant) =>
          variant.platform === action.platform
            ? { ...variant, text: state.master, forked: false }
            : variant
        ),
        dirty: true
      };

    case "add_platform": {
      if (state.variants.some((variant) => variant.platform === action.platform)) {
        return state;
      }
      return {
        ...state,
        variants: [
          ...state.variants,
          { platform: action.platform, text: state.master, hashtags: [], forked: false }
        ],
        activePlatform: action.platform,
        dirty: true
      };
    }

    case "remove_platform": {
      const variants = state.variants.filter((variant) => variant.platform !== action.platform);
      // Refuse to empty the composer: a post with no platform cannot be saved,
      // and silently allowing it strands the user in an unsavable state.
      if (variants.length === 0) {
        return state;
      }
      return {
        ...state,
        variants,
        activePlatform:
          state.activePlatform === action.platform ? variants[0].platform : state.activePlatform,
        dirty: true
      };
    }

    case "toggle_platform":
      return composerReducer(
        state,
        state.variants.some((variant) => variant.platform === action.platform)
          ? { type: "remove_platform", platform: action.platform }
          : { type: "add_platform", platform: action.platform }
      );

    case "set_first_comment":
      return updateVariant(state, action.platform, (variant) => ({
        ...variant,
        firstComment: action.value || undefined
      }));

    case "set_link":
      return updateVariant(state, action.platform, (variant) => ({
        ...variant,
        link: action.value || undefined
      }));

    case "set_hashtags":
      return updateVariant(state, action.platform, (variant) => ({
        ...variant,
        hashtags: action.hashtags
      }));

    case "set_media":
      return { ...state, mediaIds: action.mediaIds, dirty: true };

    case "set_schedule":
      return { ...state, scheduledAt: action.scheduledAt, dirty: true };

    case "set_campaign":
      return { ...state, campaignId: action.campaignId, dirty: true };

    case "focus":
      // Focus is view state, not content: it must not mark the draft dirty.
      return { ...state, activePlatform: action.platform };

    default:
      return state;
  }
}

function updateVariant(
  state: ComposerState,
  platform: Platform,
  update: (variant: ComposerVariant) => ComposerVariant
): ComposerState {
  return {
    ...state,
    variants: state.variants.map((variant) =>
      variant.platform === platform ? update(variant) : variant
    ),
    dirty: true
  };
}

/** Runs the shared platform rules over the current draft. */
export function validateComposer(state: ComposerState): PostValidationResult {
  return validatePost({
    content: state.variants.map((variant) => ({
      platform: variant.platform,
      text: variant.text,
      hashtags: variant.hashtags,
      firstComment: variant.firstComment,
      link: variant.link
    })),
    mediaCount: state.mediaIds.length,
    scheduledAt: state.scheduledAt
  });
}

/** Shapes the draft into the API's create/update payload. */
export function toPostPayload(state: ComposerState) {
  return {
    content: state.variants.map((variant) => ({
      platform: variant.platform,
      text: variant.text,
      hashtags: variant.hashtags,
      firstComment: variant.firstComment,
      link: variant.link
    })),
    mediaIds: state.mediaIds,
    scheduledAt: state.scheduledAt,
    campaignId: state.campaignId
  };
}

/** Rebuilds composer state from a post loaded off the API. */
export function fromPost(post: {
  content: Array<{
    platform: Platform;
    text: string;
    hashtags?: string[];
    firstComment?: string;
    link?: string;
  }>;
  mediaIds?: string[];
  scheduledAt?: string;
  campaignId?: string;
}): ComposerState {
  const texts = post.content.map((variant) => variant.text);
  // If every platform shares the same copy the draft was never forked, so the
  // shared editor keeps working after a reload.
  const uniform = texts.length > 0 && texts.every((text) => text === texts[0]);
  const master = uniform ? texts[0] : "";

  return {
    master,
    variants: post.content.map((variant) => ({
      platform: variant.platform,
      text: variant.text,
      hashtags: variant.hashtags ?? [],
      firstComment: variant.firstComment,
      link: variant.link,
      forked: !uniform
    })),
    mediaIds: post.mediaIds ?? [],
    scheduledAt: post.scheduledAt,
    campaignId: post.campaignId,
    activePlatform: post.content[0]?.platform,
    dirty: false
  };
}

/** Counter state for one platform tab. */
export function counterFor(state: ComposerState, platform: Platform) {
  const result = validateComposer(state);
  const summary = result.platforms.find((entry) => entry.platform === platform);
  const limit = platformPostRules[platform].maxCharacters;

  return {
    count: summary?.characterCount ?? 0,
    limit,
    remaining: summary?.remaining ?? limit,
    over: (summary?.remaining ?? limit) < 0,
    // Warn while there is still time to edit rather than at the moment of failure.
    nearLimit: (summary?.remaining ?? limit) >= 0 && (summary?.remaining ?? limit) <= limit * 0.1,
    errors: summary?.errors ?? [],
    warnings: summary?.warnings ?? []
  };
}
