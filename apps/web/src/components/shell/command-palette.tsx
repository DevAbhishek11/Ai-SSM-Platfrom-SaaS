"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Megaphone,
  PenSquare,
  Search,
  Users,
  type LucideIcon
} from "lucide-react";
import { rankSearchHits, type RankedSearchHit, type SearchHitKind } from "@ssm/domain";
import { apiGet } from "@/lib/client-api";
import { allNavItems } from "@/lib/navigation";

const kindIcons: Record<SearchHitKind, LucideIcon> = {
  post: FileText,
  campaign: Megaphone,
  media: ImageIcon,
  account: Users,
  template: LayoutGrid,
  member: Users,
  page: BarChart3
};

const kindLabels: Record<SearchHitKind, string> = {
  post: "Posts",
  campaign: "Campaigns",
  media: "Media",
  account: "Accounts",
  template: "Templates",
  member: "People",
  page: "Go to"
};

/** Actions that do something rather than navigate somewhere. */
const quickActions: Array<{ id: string; title: string; subtitle: string; href: string; icon: LucideIcon }> = [
  { id: "new-post", title: "New post", subtitle: "Open the composer", href: "/composer", icon: PenSquare },
  { id: "schedule", title: "Open calendar", subtitle: "See what is queued", href: "/calendar", icon: CalendarDays }
];

const RECENTS_KEY = "ssm:command-recents";
const MAX_RECENTS = 5;

/**
 * Command palette.
 *
 * Searches real workspace data rather than only the navigation map. Results are
 * re-ranked locally with the same function the API uses, which keeps the list
 * stable as the user types: the order never jumps when a slower response lands.
 */
export function CommandPalette({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [hits, setHits] = useState<RankedSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RankedSearchHit[]>([]);
  const requestId = useRef(0);

  /** Navigation entries are always searchable, even with the API down. */
  const localHits = useMemo<RankedSearchHit[]>(
    () => [
      ...quickActions.map((action) => ({
        id: action.id,
        kind: "page" as const,
        title: action.title,
        subtitle: action.subtitle,
        href: action.href,
        score: 0
      })),
      ...allNavItems.map((item) => ({
        id: item.href,
        kind: "page" as const,
        title: item.label,
        subtitle: item.description,
        href: item.href,
        score: 0
      }))
    ],
    []
  );

  useEffect(() => {
    if (!open) return;
    try {
      const stored = window.localStorage.getItem(RECENTS_KEY);
      setRecents(stored ? (JSON.parse(stored) as RankedSearchHit[]) : []);
    } catch {
      // A corrupt or unavailable store is not worth failing the palette over.
      setRecents([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      return undefined;
    }

    const term = query.trim();
    // Debounced so a fast typist issues one request, not one per keystroke.
    const timer = setTimeout(() => {
      const id = ++requestId.current;
      setLoading(true);

      apiGet<{ hits: RankedSearchHit[] }>(`/search?q=${encodeURIComponent(term)}&limit=20`)
        .then((payload) => {
          // Ignore a response that a newer keystroke has already superseded.
          if (id !== requestId.current) return;
          setHits(payload.hits ?? []);
        })
        .catch(() => {
          if (id === requestId.current) setHits([]);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 160);

    return () => clearTimeout(timer);
  }, [open, query]);

  const results = useMemo(() => {
    const term = query.trim();
    if (!term) {
      const seen = new Set<string>();
      return [...recents, ...localHits].filter((hit) => {
        if (seen.has(hit.href)) return false;
        seen.add(hit.href);
        return true;
      });
    }

    const merged = [...hits];
    for (const local of localHits) {
      if (!merged.some((hit) => hit.href === local.href)) merged.push(local);
    }

    return rankSearchHits(term, merged, { limit: 20 });
  }, [query, hits, localHits, recents]);

  useEffect(() => setHighlighted(0), [query]);

  const select = useCallback(
    (hit: RankedSearchHit) => {
      onOpenChange(false);
      try {
        const next = [hit, ...recents.filter((entry) => entry.href !== hit.href)].slice(0, MAX_RECENTS);
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        // Recents are a convenience; losing them must not block navigation.
      }
      router.push(hit.href as Route);
    },
    [onOpenChange, recents, router]
  );

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((value) => Math.min(value + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((value) => Math.max(value - 1, 0));
      }
      if (event.key === "Enter") {
        const target = results[highlighted];
        if (target) {
          event.preventDefault();
          select(target);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, results, highlighted, onOpenChange, select]);

  if (!open) return null;

  let renderedGroup: SearchHitKind | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
          <Search size={16} className="text-[var(--muted)]" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts, campaigns, people, or jump to a page…"
            aria-label="Search"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          />
          {loading ? (
            <Loader2 size={14} className="animate-spin text-[var(--muted)]" aria-hidden="true" />
          ) : null}
          <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
            ESC
          </kbd>
        </div>

        <ul className="max-h-96 overflow-y-auto py-1">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[var(--muted)]">
              {loading ? "Searching…" : "No matches"}
            </li>
          ) : (
            results.map((hit, index) => {
              const Icon = kindIcons[hit.kind] ?? Search;
              const showHeading = hit.kind !== renderedGroup;
              renderedGroup = hit.kind;

              return (
                <li key={`${hit.kind}-${hit.id}`}>
                  {showHeading ? (
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {query.trim() ? kindLabels[hit.kind] : "Recent and quick actions"}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => select(hit)}
                    className={`flex w-full items-start gap-3 px-4 py-2 text-left ${
                      index === highlighted ? "bg-[var(--panel-soft)]" : ""
                    }`}
                  >
                    <Icon size={16} className="mt-0.5 text-[var(--accent)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="block truncate text-xs text-[var(--muted)]">{hit.subtitle}</span>
                      ) : null}
                    </span>
                    {hit.badges?.length ? (
                      <span className="chip shrink-0 text-[10px]">{hit.badges[0]}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <p className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--muted)]">
          ↑↓ to navigate · ↵ to open · ? for shortcuts
        </p>
      </div>
    </div>
  );
}
