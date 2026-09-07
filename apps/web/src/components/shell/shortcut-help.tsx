"use client";

import { Keyboard, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatShortcut, groupShortcuts } from "@/lib/shortcuts";

/** Reference sheet for every binding, opened with `?`. */
export function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Read the platform on the client only; doing it during render would make
    // the server and client markup disagree.
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <button
        type="button"
        aria-label="Close shortcuts"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 id="shortcut-help-title" className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard size={15} aria-hidden="true" />
            Keyboard shortcuts
          </h2>
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close">
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          {groupShortcuts().map((group) => (
            <section key={group.group} className="mb-4 last:mb-0">
              <h3 className="eyebrow mb-1.5">{group.group}</h3>
              <ul className="grid gap-1">
                {group.shortcuts.map((shortcut) => (
                  <li key={shortcut.id} className="flex items-center justify-between gap-4 text-sm">
                    <span>{shortcut.label}</span>
                    <kbd className="rounded border border-[var(--border)] bg-[var(--panel-soft)] px-1.5 py-0.5 text-[11px] text-[var(--muted-strong)]">
                      {formatShortcut(shortcut, isMac ? "mac" : "other")}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
