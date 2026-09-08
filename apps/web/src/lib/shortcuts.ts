/**
 * Keyboard shortcut matching.
 *
 * Two kinds are supported: chords (`mod+k`) and Gmail-style sequences
 * (`g` then `c`). The matcher is pure so the awkward cases - a shortcut firing
 * while the user is typing in a text field, a stale sequence prefix, the
 * platform difference between Ctrl and Cmd - are testable without a DOM.
 */

export type ShortcutScope = "global" | "composer";

export type Shortcut = {
  id: string;
  /** Chord form, e.g. `mod+k`, `shift+?`, `escape`. */
  chord?: string;
  /** Sequence form, e.g. `["g", "c"]`. */
  sequence?: string[];
  label: string;
  group: string;
  scope?: ShortcutScope;
  /**
   * When true the shortcut fires even while a text field has focus. Reserve
   * this for shortcuts a user needs mid-typing, like save.
   */
  allowInInput?: boolean;
};

export type KeyEventLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

export type TargetLike = {
  tagName?: string;
  isContentEditable?: boolean;
  type?: string;
};

/** The application's shortcut map, also rendered by the help dialog. */
export const shortcuts: Shortcut[] = [
  { id: "open-search", chord: "mod+k", label: "Open search", group: "General" },
  { id: "show-help", chord: "shift+?", label: "Keyboard shortcuts", group: "General" },
  { id: "close", chord: "escape", label: "Close dialog", group: "General", allowInInput: true },
  { id: "goto-dashboard", sequence: ["g", "d"], label: "Go to dashboard", group: "Navigation" },
  { id: "goto-composer", sequence: ["g", "c"], label: "Go to composer", group: "Navigation" },
  { id: "goto-calendar", sequence: ["g", "s"], label: "Go to calendar", group: "Navigation" },
  { id: "goto-analytics", sequence: ["g", "a"], label: "Go to analytics", group: "Navigation" },
  { id: "goto-approvals", sequence: ["g", "r"], label: "Go to approvals", group: "Navigation" },
  { id: "goto-settings", sequence: ["g", "t"], label: "Go to settings", group: "Navigation" },
  { id: "new-post", chord: "mod+shift+n", label: "New post", group: "Compose" },
  {
    id: "save-draft",
    chord: "mod+s",
    label: "Save draft",
    group: "Compose",
    scope: "composer",
    allowInInput: true
  }
];

const modifierAliases: Record<string, string> = {
  cmd: "mod",
  command: "mod",
  ctrl: "mod",
  control: "mod",
  option: "alt",
  esc: "escape"
};

/** Parses `mod+shift+k` into a comparable, order-independent shape. */
export function parseChord(chord: string): {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
} {
  const parts = chord
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => modifierAliases[part] ?? part);

  return {
    key: parts.filter((part) => !["mod", "shift", "alt"].includes(part)).at(-1) ?? "",
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt")
  };
}

export function eventMatchesChord(event: KeyEventLike, chord: string): boolean {
  const parsed = parseChord(chord);
  const key = event.key.toLowerCase();
  const mod = Boolean(event.metaKey || event.ctrlKey);

  // `?` already requires Shift on most layouts, so demanding it again would
  // make the shortcut unreachable on layouts where it does not.
  const shiftSatisfied = parsed.shift ? Boolean(event.shiftKey) || key === parsed.key : true;

  return (
    key === parsed.key &&
    mod === parsed.mod &&
    shiftSatisfied &&
    Boolean(event.altKey) === parsed.alt
  );
}

/**
 * True when the event came from somewhere the user is typing.
 *
 * A checkbox or button is not a typing context even though it is an `input`,
 * so single-key shortcuts still work there.
 */
export function isTypingTarget(target: TargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;

  const tag = (target.tagName ?? "").toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag !== "input") return false;

  const nonTyping = ["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"];
  return !nonTyping.includes((target.type ?? "text").toLowerCase());
}

export type SequenceState = { keys: string[]; at: number };

export const emptySequence: SequenceState = { keys: [], at: 0 };

/** How long a partial sequence stays live before it is forgotten. */
export const SEQUENCE_TIMEOUT_MS = 1200;

export type ShortcutMatch = {
  shortcut?: Shortcut;
  sequence: SequenceState;
  /** True when the keystroke was consumed and the caller should preventDefault. */
  handled: boolean;
};

/**
 * Resolves one keystroke against the shortcut map.
 *
 * Returns the next sequence state so the caller can stay stateless; an expired
 * or unmatched prefix is dropped rather than left to poison later keystrokes.
 */
export function matchShortcut(
  event: KeyEventLike,
  options: {
    sequence?: SequenceState;
    target?: TargetLike | null;
    scope?: ShortcutScope;
    now?: number;
    available?: Shortcut[];
  } = {}
): ShortcutMatch {
  const now = options.now ?? Date.now();
  const typing = isTypingTarget(options.target);
  const scope = options.scope ?? "global";
  const available = (options.available ?? shortcuts).filter(
    (shortcut) => !shortcut.scope || shortcut.scope === scope
  );

  const chordMatch = available.find(
    (shortcut) =>
      shortcut.chord &&
      eventMatchesChord(event, shortcut.chord) &&
      (!typing || shortcut.allowInInput)
  );
  if (chordMatch) {
    return { shortcut: chordMatch, sequence: emptySequence, handled: true };
  }

  // Sequences are single letters, so a modifier means the user meant something
  // else entirely, and typing must never trigger navigation.
  if (typing || event.metaKey || event.ctrlKey || event.altKey) {
    return { sequence: emptySequence, handled: false };
  }

  const previous = options.sequence ?? emptySequence;
  const expired = previous.keys.length > 0 && now - previous.at > SEQUENCE_TIMEOUT_MS;
  const keys = [...(expired ? [] : previous.keys), event.key.toLowerCase()];

  const exact = available.find(
    (shortcut) => shortcut.sequence && arraysEqual(shortcut.sequence, keys)
  );
  if (exact) {
    return { shortcut: exact, sequence: emptySequence, handled: true };
  }

  const isPrefix = available.some(
    (shortcut) =>
      shortcut.sequence &&
      shortcut.sequence.length > keys.length &&
      arraysEqual(shortcut.sequence.slice(0, keys.length), keys)
  );

  return {
    sequence: isPrefix ? { keys, at: now } : emptySequence,
    handled: isPrefix
  };
}

/** Human-readable rendering, using the platform's modifier glyph. */
export function formatShortcut(shortcut: Shortcut, platform: "mac" | "other" = "other"): string {
  if (shortcut.sequence) {
    return shortcut.sequence.join(" then ");
  }
  if (!shortcut.chord) return "";

  const parsed = parseChord(shortcut.chord);
  const parts: string[] = [];
  if (parsed.mod) parts.push(platform === "mac" ? "⌘" : "Ctrl");
  if (parsed.shift) parts.push(platform === "mac" ? "⇧" : "Shift");
  if (parsed.alt) parts.push(platform === "mac" ? "⌥" : "Alt");
  parts.push(parsed.key === "escape" ? "Esc" : parsed.key.toUpperCase());

  return parts.join(platform === "mac" ? "" : "+");
}

/** Groups the map for the help dialog, preserving declaration order. */
export function groupShortcuts(list: Shortcut[] = shortcuts): Array<{
  group: string;
  shortcuts: Shortcut[];
}> {
  const groups = new Map<string, Shortcut[]>();
  for (const shortcut of list) {
    const bucket = groups.get(shortcut.group);
    if (bucket) {
      bucket.push(shortcut);
    } else {
      groups.set(shortcut.group, [shortcut]);
    }
  }
  return [...groups.entries()].map(([group, entries]) => ({ group, shortcuts: entries }));
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
