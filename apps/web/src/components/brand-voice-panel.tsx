"use client";

import { useMemo, useState } from "react";
import { demoWorkspace, type BrandVoice } from "@ssm/domain";

type BrandEvaluation = {
  brandVoiceId: string;
  name: string;
  version: number;
  score: number;
  bannedTerms: string[];
  preferredTermsUsed: string[];
  industryTermsUsed: string[];
  recommendations: string[];
};

export function BrandVoicePanel({ brandVoices }: { brandVoices: BrandVoice[] }) {
  const [selectedId, setSelectedId] = useState(brandVoices[0]?.id ?? "");
  const [sample, setSample] = useState(
    "Launch operations finally feel calm, measurable, and practical for every campaign team."
  );
  const [newName, setNewName] = useState("Regional Launch Voice");
  const [evaluation, setEvaluation] = useState<BrandEvaluation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const selected = useMemo(
    () => brandVoices.find((voice) => voice.id === selectedId) ?? brandVoices[0],
    [brandVoices, selectedId]
  );

  async function evaluate() {
    if (!selected) {
      return;
    }

    setLoading("evaluate");
    setMessage(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/brand-voices/${selected.id}/evaluate`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-user-role": "creator"
          },
          body: JSON.stringify({ text: sample })
        }
      );
      if (!response.ok) {
        throw new Error("Could not evaluate brand voice");
      }
      setEvaluation((await response.json()) as BrandEvaluation);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not evaluate brand voice");
    } finally {
      setLoading(null);
    }
  }

  async function createVoice() {
    setLoading("create");
    setMessage(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/brand-voices`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-role": "admin"
        },
        body: JSON.stringify({
          workspaceId: demoWorkspace.id,
          name: newName,
          tone: { primary: "warm", secondary: "direct" },
          style: { sentenceLength: "medium", formality: "professional" },
          vocabulary: {
            preferredTerms: ["content ops", "campaign rhythm"],
            bannedTerms: ["viral", "hack"],
            industryTerms: ["social calendar"]
          },
          emojiUsage: "light",
          ctaPreferences: { examples: ["Map the next campaign milestone."] },
          examples: ["Practical systems help lean teams publish with confidence."]
        })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not create brand voice");
      }
      const voice = (await response.json()) as BrandVoice;
      setMessage(`Created ${voice.name} v${voice.version}. Refresh to see it in the local fixture list.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create brand voice");
    } finally {
      setLoading(null);
    }
  }

  if (!selected) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Brand voice engine</h3>
          <p className="text-sm text-[var(--muted)]">
            Define tone, vocabulary, banned terms, examples, and test copy before generation.
          </p>
        </div>
        <span className="rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium">
          {brandVoices.length} profiles
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Profile
            <select
              value={selected.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              {brandVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} v{voice.version}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-sm">
            <p className="font-semibold">{selected.name}</p>
            <p className="mt-2 text-[var(--muted)]">
              Tone: {String(selected.tone.primary ?? "professional")} /{" "}
              {String(selected.tone.secondary ?? "clear")}
            </p>
            <p className="mt-2 text-[var(--muted)]">Emoji: {selected.emojiUsage}</p>
            <p className="mt-2 text-[var(--muted)]">
              Preferred: {selected.vocabulary.preferredTerms.join(", ")}
            </p>
            <p className="mt-2 text-[var(--warning)]">
              Banned: {selected.vocabulary.bannedTerms.join(", ")}
            </p>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <label className="grid gap-2 text-sm font-medium">
              New profile name
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={createVoice}
              disabled={loading !== null}
              className="mt-3 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loading === "create" ? "Creating" : "Create sample profile"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Evaluate copy
            <textarea
              value={sample}
              onChange={(event) => setSample(event.target.value)}
              className="min-h-28 rounded-md border border-[var(--border)] bg-white p-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={evaluate}
            disabled={loading !== null}
            className="w-fit rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "evaluate" ? "Checking" : "Evaluate"}
          </button>
          {evaluation ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">Fit score {evaluation.score}/100</p>
                <span className="text-xs text-[var(--muted)]">v{evaluation.version}</span>
              </div>
              <p className="mt-2 text-[var(--muted)]">
                Preferred used: {evaluation.preferredTermsUsed.join(", ") || "none"}
              </p>
              {evaluation.bannedTerms.length > 0 ? (
                <p className="mt-2 text-[var(--danger)]">Banned: {evaluation.bannedTerms.join(", ")}</p>
              ) : null}
              {evaluation.recommendations.length > 0 ? (
                <ul className="mt-3 grid gap-1 text-[var(--muted)]">
                  {evaluation.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
