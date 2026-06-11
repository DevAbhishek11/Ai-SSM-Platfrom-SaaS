"use client";

import { useMemo, useState } from "react";
import {
  demoWorkspace,
  type ContentSafetyCheck,
  type ModerationQueueItem,
  type SafetyPolicy
} from "@ssm/domain";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type SafetyEvaluationResponse = {
  check: ContentSafetyCheck;
  moderationItem?: ModerationQueueItem;
  policy?: SafetyPolicy;
};

export function AiSafetyPanel({
  policies,
  checks,
  moderationQueue
}: {
  policies: SafetyPolicy[];
  checks: ContentSafetyCheck[];
  moderationQueue: ModerationQueueItem[];
}) {
  const [policyRows] = useState(policies);
  const [checkRows, setCheckRows] = useState(checks);
  const [queueRows, setQueueRows] = useState(moderationQueue);
  const [text, setText] = useState(
    "Our AI workflow guarantees risk-free investment returns for every launch."
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activePolicy = policyRows.find((policy) => policy.status === "active") ?? policyRows[0];
  const openItems = useMemo(() => queueRows.filter((item) => item.status === "open"), [queueRows]);

  async function requestJson<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-role": "owner"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? "Safety action failed");
    }

    return (await response.json()) as T;
  }

  async function evaluate() {
    setLoading("evaluate");
    setMessage(null);
    try {
      const result = await requestJson<SafetyEvaluationResponse>("/safety/evaluate", {
        workspaceId: demoWorkspace.id,
        text,
        source: "manual"
      });
      setCheckRows((current) => [result.check, ...current]);
      const moderationItem = result.moderationItem;
      if (moderationItem) {
        setQueueRows((current) => [moderationItem, ...current]);
      }
      setMessage(`Safety check ${result.check.status} with ${result.check.flags.length} flag(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not evaluate content");
    } finally {
      setLoading(null);
    }
  }

  async function resolve(item: ModerationQueueItem) {
    setLoading(item.id);
    setMessage(null);
    try {
      const resolved = await requestJson<ModerationQueueItem>(
        `/safety/moderation-queue/${item.id}/resolve`,
        {
          status: "approved",
          resolutionNote: "Reviewed by AI safety owner and approved for rewrite."
        }
      );
      setQueueRows((current) => current.map((entry) => (entry.id === resolved.id ? resolved : entry)));
      setMessage("Moderation item approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resolve moderation item");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">AI safety review</h3>
          <p className="text-sm text-[var(--muted)]">
            Evaluate risky drafts, route blocked content to moderation, and preserve review evidence.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm">
          <ShieldCheck className="size-4 text-[var(--accent)]" />
          {openItems.length} open review{openItems.length === 1 ? "" : "s"}
        </div>
      </div>

      {activePolicy ? (
        <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{activePolicy.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Max risk {Math.round(activePolicy.rules.maxRiskScore * 100)}% -{" "}
                {activePolicy.rules.blockedTerms.length} blocked term(s)
              </p>
            </div>
            <StatusBadge status={activePolicy.status} />
          </div>
        </div>
      ) : null}

      <label className="mt-4 grid gap-2 text-sm font-medium">
        Draft to evaluate
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-h-28 rounded-md border border-[var(--border)] bg-white p-3 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={evaluate}
        disabled={loading !== null || text.trim().length === 0}
        className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading === "evaluate" ? "Evaluating" : "Run safety check"}
      </button>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold">Moderation queue</p>
          </div>
          {openItems.length ? (
            openItems.map((item) => (
              <article key={item.id} className="rounded-md border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.reason}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{formatTime(item.createdAt)}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <button
                  type="button"
                  onClick={() => resolve(item)}
                  disabled={loading !== null}
                  className="mt-3 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Approve review
                </button>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-[var(--border)] p-3 text-sm text-[var(--muted)]">
              No open moderation items.
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-semibold">Recent checks</p>
          {checkRows.slice(0, 4).map((check) => (
            <article key={check.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{Math.round(check.riskScore * 100)}% risk</p>
                <div className="flex gap-2">
                  <StatusBadge status={check.status} />
                  <StatusBadge status={check.severity} />
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{check.text}</p>
              {check.flags.length ? (
                <p className="mt-2 text-xs text-[var(--muted)]">{check.flags.join(", ")}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
