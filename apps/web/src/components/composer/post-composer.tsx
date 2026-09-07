"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Copy,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X
} from "lucide-react";
import { platformPostRules, platforms, type Platform, type Post } from "@ssm/domain";
import { apiDelete, apiPatch, apiPost } from "@/lib/client-api";
import { friendlyMessage, toApiError } from "@/lib/api-error";
import {
  composerReducer,
  counterFor,
  createComposerState,
  fromPost,
  toPostPayload,
  validateComposer
} from "@/lib/composer";
import { useToast } from "@/components/ui/toast";

const platformLabels: Record<Platform, string> = {
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  reddit: "Reddit",
  pinterest: "Pinterest",
  threads: "Threads",
  mastodon: "Mastodon",
  bluesky: "Bluesky"
};

export function PostComposer({
  workspaceId,
  post,
  mediaOptions
}: {
  workspaceId: string;
  post?: Post;
  mediaOptions: Array<{ id: string; fileName: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useReducer(
    composerReducer,
    post ? fromPost(post) : createComposerState({ platforms: ["x"] })
  );
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(post?.id);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(post?.updatedAt);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const validation = useMemo(() => validateComposer(state), [state]);
  const active = state.activePlatform ?? state.variants[0]?.platform ?? "x";
  const activeVariant = state.variants.find((variant) => variant.platform === active);
  const counter = counterFor(state, active);
  const rules = platformPostRules[active];

  /**
   * Leaving with unsaved work is the single most costly mistake in a composer,
   * so it gets a browser-level guard rather than a toast after the fact.
   */
  useEffect(() => {
    if (!state.dirty) return undefined;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.dirty]);

  const save = useCallback(
    async (mode: "draft" | "review") => {
      if (!validation.valid) {
        toast.error("Fix the highlighted problems first", `${validation.issues.filter((issue) => issue.severity === "error").length} blocking issue(s).`);
        return;
      }

      setSaving(true);
      try {
        const payload = toPostPayload(state);

        const saved = savedId
          ? await apiPatch<Post>(`/posts/${savedId}`, { ...payload, expectedUpdatedAt })
          : await apiPost<Post>("/posts", { ...payload, workspaceId });

        setSavedId(saved.id);
        setExpectedUpdatedAt(saved.updatedAt);
        dispatch({ type: "load", state: { ...state, dirty: false } });

        if (mode === "review") {
          await apiPost(`/workflow/posts/${saved.id}/submit`, { comment: "Submitted from composer" });
          toast.success("Sent for review", "The approvals queue has been notified.");
          router.push("/approvals");
          return;
        }

        toast.success("Draft saved", "You can keep editing or send it for review.");
        router.refresh();
      } catch (error) {
        const apiError = toApiError(error);
        if (apiError.status === 409) {
          toast.error(
            "Someone else edited this post",
            "Reload to pick up their changes before saving yours."
          );
        } else {
          toast.error("Could not save", apiError.message);
        }
      } finally {
        setSaving(false);
      }
    },
    [validation, state, savedId, expectedUpdatedAt, workspaceId, toast, router]
  );

  const duplicate = async () => {
    if (!savedId) return;
    try {
      const copy = await apiPost<Post>(`/posts/${savedId}/duplicate`);
      toast.success("Duplicated", "A draft copy is ready to edit.");
      router.push(`/composer?post=${copy.id}`);
    } catch (error) {
      toast.error("Could not duplicate", friendlyMessage(error));
    }
  };

  const archive = async () => {
    if (!savedId) return;
    try {
      await apiDelete(`/posts/${savedId}`);
      toast.success("Archived", "The post is out of the queue but kept for audit.");
      router.push("/calendar");
    } catch (error) {
      toast.error("Could not archive", friendlyMessage(error));
    }
  };

  const selected = new Set(state.variants.map((variant) => variant.platform));
  const availablePlatforms = showAllPlatforms ? platforms : platforms.slice(0, 6);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void save("draft");
      }}
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="grid content-start gap-4">
        <section className="card">
          <header className="card-header">
            <div>
              <h2 className="card-title">Channels</h2>
              <p className="card-subtitle">Pick where this goes; each tab can be tailored.</p>
            </div>
          </header>
          <div className="card-body flex flex-wrap gap-2">
            {availablePlatforms.map((platform) => (
              <button
                key={platform}
                type="button"
                aria-pressed={selected.has(platform)}
                onClick={() => dispatch({ type: "toggle_platform", platform })}
                className={selected.has(platform) ? "chip chip-accent" : "chip"}
              >
                {selected.has(platform) ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <Plus size={12} aria-hidden="true" />
                )}
                {platformLabels[platform]}
              </button>
            ))}
            {!showAllPlatforms ? (
              <button type="button" className="chip" onClick={() => setShowAllPlatforms(true)}>
                More…
              </button>
            ) : null}
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <div>
              <h2 className="card-title">Shared copy</h2>
              <p className="card-subtitle">
                Written once, mirrored to every channel that has not been customised.
              </p>
            </div>
          </header>
          <div className="card-body">
            <label className="sr-only" htmlFor="composer-master">
              Shared post copy
            </label>
            <textarea
              id="composer-master"
              rows={5}
              value={state.master}
              onChange={(event) => dispatch({ type: "set_master", text: event.target.value })}
              placeholder="What do you want to say?"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm"
            />
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <div>
              <h2 className="card-title">Per-channel copy</h2>
              <p className="card-subtitle">Edit a tab to fork it from the shared draft.</p>
            </div>
          </header>

          <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-4">
            {state.variants.map((variant) => {
              const tabCounter = counterFor(state, variant.platform);
              return (
                <button
                  key={variant.platform}
                  type="button"
                  onClick={() => dispatch({ type: "focus", platform: variant.platform })}
                  aria-current={variant.platform === active}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
                    variant.platform === active
                      ? "border-[var(--accent)] font-semibold text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted)]"
                  }`}
                >
                  {platformLabels[variant.platform]}
                  {tabCounter.errors.length > 0 ? (
                    <AlertCircle size={12} className="text-[var(--danger)]" aria-label="has errors" />
                  ) : null}
                  {variant.forked ? (
                    <span className="chip text-[10px]" title="Customised for this channel">
                      forked
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeVariant ? (
            <div className="card-body grid gap-3">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="composer-variant" className="text-sm font-medium">
                    {platformLabels[active]} copy
                  </label>
                  <span
                    className={`text-xs tabular-nums ${
                      counter.over
                        ? "font-semibold text-[var(--danger)]"
                        : counter.nearLimit
                          ? "text-[var(--warning)]"
                          : "text-[var(--muted)]"
                    }`}
                    aria-live="polite"
                  >
                    {counter.count} / {counter.limit}
                  </span>
                </div>
                <textarea
                  id="composer-variant"
                  rows={6}
                  value={activeVariant.text}
                  onChange={(event) =>
                    dispatch({ type: "set_variant_text", platform: active, text: event.target.value })
                  }
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm"
                />
                {activeVariant.forked ? (
                  <button
                    type="button"
                    className="btn-ghost justify-self-start text-xs"
                    onClick={() => dispatch({ type: "reset_variant", platform: active })}
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    Reset to shared copy
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Hashtags</span>
                  <input
                    value={activeVariant.hashtags.join(" ")}
                    onChange={(event) =>
                      dispatch({
                        type: "set_hashtags",
                        platform: active,
                        hashtags: event.target.value.split(/[\s,]+/).filter(Boolean)
                      })
                    }
                    placeholder="launch growth"
                    className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5"
                  />
                  <span className="text-xs text-[var(--muted)]">
                    Up to {rules.maxHashtags}; {rules.recommendedHashtags} works best here.
                  </span>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Link</span>
                  <input
                    type="url"
                    value={activeVariant.link ?? ""}
                    onChange={(event) =>
                      dispatch({ type: "set_link", platform: active, value: event.target.value })
                    }
                    placeholder="https://example.com/launch"
                    className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5"
                  />
                  <span className="text-xs text-[var(--muted)]">
                    {rules.supportsLinks
                      ? rules.linkCharacterCost > 0
                        ? `Counts as ${rules.linkCharacterCost} characters.`
                        : "Counted at full length."
                      : "Not clickable on this network."}
                  </span>
                </label>
              </div>

              {rules.supportsFirstComment ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">First comment</span>
                  <input
                    value={activeVariant.firstComment ?? ""}
                    onChange={(event) =>
                      dispatch({
                        type: "set_first_comment",
                        platform: active,
                        value: event.target.value
                      })
                    }
                    placeholder="Posted immediately after publishing"
                    className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5"
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section className="card">
          <header className="card-header">
            <h2 className="card-title">Checks</h2>
          </header>
          <div className="card-body grid gap-2">
            {validation.issues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-[var(--success)]">
                <Check size={14} aria-hidden="true" />
                Ready to publish.
              </p>
            ) : (
              validation.issues.map((issue, index) => (
                <p
                  key={`${issue.platform}-${issue.code}-${index}`}
                  className={`flex items-start gap-2 text-xs ${
                    issue.severity === "error" ? "text-[var(--danger)]" : "text-[var(--warning)]"
                  }`}
                >
                  {issue.severity === "error" ? (
                    <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    <strong>{platformLabels[issue.platform]}:</strong> {issue.message}
                  </span>
                </p>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2 className="card-title">Schedule</h2>
          </header>
          <div className="card-body grid gap-2">
            <label className="grid gap-1 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <CalendarClock size={13} aria-hidden="true" />
                Publish at
              </span>
              <input
                type="datetime-local"
                value={toLocalInput(state.scheduledAt)}
                onChange={(event) =>
                  dispatch({
                    type: "set_schedule",
                    scheduledAt: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : undefined
                  })
                }
                className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5"
              />
              <span className="text-xs text-[var(--muted)]">
                Leave empty to keep this a draft.
              </span>
            </label>
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2 className="card-title">Media</h2>
          </header>
          <div className="card-body grid gap-2">
            {mediaOptions.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No assets in the library yet.</p>
            ) : (
              mediaOptions.slice(0, 6).map((asset) => {
                const attached = state.mediaIds.includes(asset.id);
                return (
                  <label key={asset.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={attached}
                      onChange={() =>
                        dispatch({
                          type: "set_media",
                          mediaIds: attached
                            ? state.mediaIds.filter((id) => id !== asset.id)
                            : [...state.mediaIds, asset.id]
                        })
                      }
                    />
                    <span className="truncate">{asset.fileName}</span>
                  </label>
                );
              })
            )}
          </div>
        </section>

        <div className="grid gap-2">
          <button type="submit" className="btn-primary" disabled={saving || !validation.valid}>
            {saving ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            {savedId ? "Save changes" : "Save draft"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={saving || !validation.valid}
            onClick={() => void save("review")}
          >
            <Send size={15} aria-hidden="true" />
            Send for review
          </button>
          {savedId ? (
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => void duplicate()}>
                <Copy size={14} aria-hidden="true" />
                Duplicate
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={() => void archive()}>
                <Trash2 size={14} aria-hidden="true" />
                Archive
              </button>
            </div>
          ) : null}
          {state.dirty ? (
            <p className="flex items-center gap-1.5 text-xs text-[var(--warning)]">
              <X size={12} aria-hidden="true" />
              Unsaved changes
            </p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}

/** ISO instant to the local value a `datetime-local` input expects. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
