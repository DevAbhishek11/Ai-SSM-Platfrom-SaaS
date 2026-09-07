import { describe, expect, it } from "vitest";
import {
  emptySequence,
  eventMatchesChord,
  formatShortcut,
  groupShortcuts,
  isTypingTarget,
  matchShortcut,
  parseChord,
  SEQUENCE_TIMEOUT_MS,
  shortcuts
} from "./shortcuts";

describe("parseChord", () => {
  it("normalises ctrl and cmd to the same modifier", () => {
    expect(parseChord("ctrl+k")).toEqual(parseChord("cmd+k"));
  });

  it("is order independent", () => {
    expect(parseChord("shift+mod+n")).toEqual(parseChord("mod+shift+n"));
  });

  it("understands escape and its alias", () => {
    expect(parseChord("esc").key).toBe("escape");
  });
});

describe("eventMatchesChord", () => {
  it("matches Cmd and Ctrl interchangeably", () => {
    expect(eventMatchesChord({ key: "k", metaKey: true }, "mod+k")).toBe(true);
    expect(eventMatchesChord({ key: "k", ctrlKey: true }, "mod+k")).toBe(true);
  });

  it("rejects the bare key when a modifier is required", () => {
    expect(eventMatchesChord({ key: "k" }, "mod+k")).toBe(false);
  });

  it("rejects a modified key when none is expected", () => {
    expect(eventMatchesChord({ key: "g", metaKey: true }, "g")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(eventMatchesChord({ key: "K", metaKey: true }, "mod+k")).toBe(true);
  });

  it("accepts ? without requiring a separate shift flag", () => {
    expect(eventMatchesChord({ key: "?" }, "shift+?")).toBe(true);
    expect(eventMatchesChord({ key: "?", shiftKey: true }, "shift+?")).toBe(true);
  });

  it("distinguishes alt", () => {
    expect(eventMatchesChord({ key: "k", metaKey: true, altKey: true }, "mod+k")).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it("treats text inputs, textareas and rich text as typing contexts", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "text" })).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
  });

  it("does not treat a checkbox or button as a typing context", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "checkbox" })).toBe(false);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
  });

  it("defaults an input with no type to text", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
  });

  it("handles a null target", () => {
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("matchShortcut", () => {
  it("resolves a chord", () => {
    const result = matchShortcut({ key: "k", metaKey: true });

    expect(result.shortcut?.id).toBe("open-search");
    expect(result.handled).toBe(true);
  });

  it("suppresses shortcuts while the user is typing", () => {
    const result = matchShortcut(
      { key: "k", metaKey: true },
      { target: { tagName: "INPUT", type: "text" } }
    );

    expect(result.shortcut).toBeUndefined();
  });

  it("still fires an allowInInput shortcut while typing", () => {
    const result = matchShortcut(
      { key: "s", metaKey: true },
      { target: { tagName: "TEXTAREA" }, scope: "composer" }
    );

    expect(result.shortcut?.id).toBe("save-draft");
  });

  it("hides an out-of-scope shortcut", () => {
    const result = matchShortcut({ key: "s", metaKey: true }, { scope: "global" });
    expect(result.shortcut).toBeUndefined();
  });

  it("builds up a two-key sequence", () => {
    const first = matchShortcut({ key: "g" });
    expect(first.shortcut).toBeUndefined();
    expect(first.handled).toBe(true);
    expect(first.sequence.keys).toEqual(["g"]);

    const second = matchShortcut({ key: "c" }, { sequence: first.sequence });
    expect(second.shortcut?.id).toBe("goto-composer");
    expect(second.sequence).toEqual(emptySequence);
  });

  it("forgets a stale sequence prefix", () => {
    const first = matchShortcut({ key: "g" }, { now: 0 });
    const second = matchShortcut(
      { key: "c" },
      { sequence: first.sequence, now: SEQUENCE_TIMEOUT_MS + 1 }
    );

    expect(second.shortcut).toBeUndefined();
  });

  it("drops a prefix followed by an unrelated key", () => {
    const first = matchShortcut({ key: "g" });
    const second = matchShortcut({ key: "z" }, { sequence: first.sequence });

    expect(second.shortcut).toBeUndefined();
    expect(second.sequence).toEqual(emptySequence);
    expect(second.handled).toBe(false);
  });

  it("never starts a sequence from a typing context", () => {
    const result = matchShortcut({ key: "g" }, { target: { tagName: "INPUT", type: "text" } });

    expect(result.sequence).toEqual(emptySequence);
    expect(result.handled).toBe(false);
  });

  it("ignores a sequence key pressed with a modifier", () => {
    expect(matchShortcut({ key: "g", ctrlKey: true }).handled).toBe(false);
  });

  it("can be driven with a custom shortcut map", () => {
    const custom = [{ id: "x", chord: "mod+j", label: "Custom", group: "Test" }];
    expect(matchShortcut({ key: "j", metaKey: true }, { available: custom }).shortcut?.id).toBe("x");
  });
});

describe("formatShortcut", () => {
  const find = (id: string) => shortcuts.find((shortcut) => shortcut.id === id)!;

  it("uses platform glyphs on mac", () => {
    expect(formatShortcut(find("open-search"), "mac")).toBe("⌘K");
  });

  it("spells modifiers out elsewhere", () => {
    expect(formatShortcut(find("open-search"), "other")).toBe("Ctrl+K");
  });

  it("renders a sequence as a chain", () => {
    expect(formatShortcut(find("goto-composer"))).toBe("g then c");
  });

  it("renders escape readably", () => {
    expect(formatShortcut(find("close"))).toBe("Esc");
  });
});

describe("groupShortcuts", () => {
  it("groups by section in declaration order", () => {
    const groups = groupShortcuts();
    expect(groups.map((group) => group.group)).toEqual(["General", "Navigation", "Compose"]);
  });

  it("covers every shortcut exactly once", () => {
    const total = groupShortcuts().reduce((sum, group) => sum + group.shortcuts.length, 0);
    expect(total).toBe(shortcuts.length);
  });
});

describe("shortcut map integrity", () => {
  it("has unique ids", () => {
    const ids = shortcuts.map((shortcut) => shortcut.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate chords or sequences", () => {
    const bindings = shortcuts.map((shortcut) =>
      shortcut.chord ?? (shortcut.sequence ?? []).join("+")
    );
    expect(new Set(bindings).size).toBe(bindings.length);
  });

  it("gives every shortcut a binding and a label", () => {
    for (const shortcut of shortcuts) {
      expect(Boolean(shortcut.chord || shortcut.sequence), shortcut.id).toBe(true);
      expect(shortcut.label.length, shortcut.id).toBeGreaterThan(0);
    }
  });
});
