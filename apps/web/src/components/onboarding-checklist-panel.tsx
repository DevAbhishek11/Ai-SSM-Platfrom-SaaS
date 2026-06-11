"use client";

import { useMemo, useState } from "react";
import type { OnboardingStep } from "@ssm/domain";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { StatusBadge } from "./status-badge";

type ChecklistResponse = {
  workspaceId: string;
  progress: number;
  completed: number;
  skipped: number;
  total: number;
  nextStep?: OnboardingStep;
  steps: OnboardingStep[];
};

export function OnboardingChecklistPanel({
  workspaceId,
  steps
}: {
  workspaceId: string;
  steps: OnboardingStep[];
}) {
  const [stepRows, setStepRows] = useState(steps);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const progress = useMemo(() => {
    const skipped = stepRows.filter((step) => step.status === "skipped").length;
    const actionable = Math.max(stepRows.length - skipped, 1);
    const completed = stepRows.filter((step) => step.status === "completed").length;
    return Math.round((completed / actionable) * 100);
  }, [stepRows]);

  async function postJson(path: string, body: unknown): Promise<ChecklistResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-role": "owner"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? "Onboarding action failed");
    }

    return (await response.json()) as ChecklistResponse;
  }

  async function complete(step: OnboardingStep) {
    setLoading(step.id);
    setMessage(null);
    try {
      const checklist = await postJson(`/onboarding/steps/${step.id}/complete`, {
        metadata: { completedFrom: "dashboard" }
      });
      setStepRows(checklist.steps);
      setMessage(`Completed ${step.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete step");
    } finally {
      setLoading(null);
    }
  }

  async function skip(step: OnboardingStep) {
    setLoading(step.id);
    setMessage(null);
    try {
      const checklist = await postJson(`/onboarding/steps/${step.id}/skip`, {
        reason: "Not needed during demo workspace setup."
      });
      setStepRows(checklist.steps);
      setMessage(`Skipped ${step.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not skip step");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Workspace activation</p>
          <h3 className="mt-1 text-base font-semibold">Onboarding checklist</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Complete the core setup path before inviting broader teams into the workspace.
          </p>
        </div>
        <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm">
          <strong className="block">{progress}%</strong>
          <span className="text-[var(--muted)]">complete</span>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stepRows.slice(0, 4).map((step) => (
          <article key={step.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex items-start justify-between gap-3">
              {step.status === "completed" ? (
                <CheckCircle2 className="mt-0.5 size-4 text-[var(--accent)]" />
              ) : (
                <CircleDashed className="mt-0.5 size-4 text-[var(--muted)]" />
              )}
              <StatusBadge status={step.status} />
            </div>
            <p className="mt-3 text-sm font-semibold">{step.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{step.description}</p>
            {step.status !== "completed" && step.status !== "skipped" ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => complete(step)}
                  disabled={loading !== null}
                  className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Complete
                </button>
                <button
                  type="button"
                  onClick={() => skip(step)}
                  disabled={loading !== null}
                  className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Skip
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
      <p className="sr-only">Workspace {workspaceId} onboarding progress is {progress} percent.</p>
    </section>
  );
}
