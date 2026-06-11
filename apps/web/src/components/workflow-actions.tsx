"use client";

import { useState } from "react";
import type { Post } from "@ssm/domain";

const actions = [
  { label: "Approve", endpoint: "approve", role: "reviewer" },
  { label: "Request changes", endpoint: "request-changes", role: "reviewer" },
  { label: "Submit", endpoint: "submit", role: "creator" }
];

export function WorkflowActions({ post }: { post: Post }) {
  const [message, setMessage] = useState("Looks good for the next stage.");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function runAction(endpoint: string, role: string) {
    setLoading(endpoint);
    setResult(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/workflow/posts/${post.id}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-user-role": role
          },
          body: JSON.stringify({ comment: message })
        }
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Workflow action failed");
      }

      const body = (await response.json()) as { post: Post };
      setResult(`Post is now ${body.post.status.replace(/_/g, " ")}.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Workflow action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Reviewer actions</h3>
      <label className="mt-4 block text-sm font-medium" htmlFor="workflow-comment">
        Comment
      </label>
      <textarea
        id="workflow-comment"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] p-3 text-sm"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.endpoint}
            type="button"
            onClick={() => runAction(action.endpoint, action.role)}
            disabled={loading !== null}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === action.endpoint ? "Working" : action.label}
          </button>
        ))}
      </div>
      {result ? <p className="mt-3 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{result}</p> : null}
    </section>
  );
}
