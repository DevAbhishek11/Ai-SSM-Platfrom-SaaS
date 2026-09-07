"use client";

import { useState } from "react";
import {
  demoBrandVoices,
  demoWorkspace,
  platforms,
  type AiGenerationResponse,
  type BrandVoice,
  type Platform
} from "@ssm/domain";
import { friendlyMessage } from "@/lib/api-error";
import { apiPost } from "@/lib/client-api";

export function AiGenerator({ brandVoices = demoBrandVoices }: { brandVoices?: BrandVoice[] }) {
  const [brief, setBrief] = useState(
    "Create a confident launch post about AI-assisted social campaign planning for B2B teams."
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin", "instagram", "x"]);
  const [brandVoiceId, setBrandVoiceId] = useState(brandVoices[0]?.id ?? "");
  const [result, setResult] = useState<AiGenerationResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setStatus("loading");
    setResult(null);
    setError(null);
    try {
      setResult(
        await apiPost<AiGenerationResponse>("/ai/generate", {
          workspaceId: demoWorkspace.id,
          brief,
          platforms: selectedPlatforms,
          tone: "practical and confident",
          objective: "engagement",
          brandVoiceId: brandVoiceId || undefined
        })
      );
      setStatus("idle");
    } catch (caught) {
      setError(friendlyMessage(caught));
      setStatus("error");
    }
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    );
  }

  return (
    <section className="card p-4">
      <h3 className="text-base font-semibold">Generate content variants</h3>
      <label className="mt-4 block text-sm font-medium" htmlFor="brief">
        Campaign brief
      </label>
      <textarea
        id="brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        className="mt-2 min-h-32 w-full rounded-md border border-[var(--border)] bg-white p-3 text-sm"
      />
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Platforms</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {platforms.slice(0, 6).map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
              />
              <span className="capitalize">{platform}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Brand voice
        <select
          value={brandVoiceId}
          onChange={(event) => setBrandVoiceId(event.target.value)}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          <option value="">No profile</option>
          {brandVoices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} v{voice.version}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={generate}
        disabled={status === "loading" || selectedPlatforms.length === 0}
        className="btn-primary mt-4"
      >
        {status === "loading" ? "Generating" : "Generate variants"}
      </button>
      {status === "error" ? (
        <p
          role="alert"
          className="mt-3 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
        >
          {error ?? "Could not reach the API. Start `npm run dev:api` and try again."}
        </p>
      ) : null}
      {result ? (
        <div className="mt-4 grid gap-3">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-sm">
            <p className="font-semibold">Quality {result.qualityScore}/100</p>
            <p className="mt-1 text-[var(--muted)]">
              {result.modelUsed} / safety risk {Math.round(result.safety.riskScore * 100)}%
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="badge badge-accent">
                {result.provider} / {result.providerModel}
              </span>
              <span className="text-[var(--muted)]">{result.routing.latencyMs}ms</span>
              {result.routing.fallbackUsed ? (
                <span className="badge badge-warning">fallback used</span>
              ) : null}
            </p>
            {result.routing.attempts.length > 1 ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Routing:{" "}
                {result.routing.attempts
                  .map((attempt) => `${attempt.provider}:${attempt.status}`)
                  .join(" → ")}
              </p>
            ) : null}
            {result.safety.checkId ? (
              <p className="mt-1 text-[var(--muted)]">
                Safety check {result.safety.checkId.slice(0, 8)}
                {result.safety.moderationItemId
                  ? ` / moderation ${result.safety.moderationItemId.slice(0, 8)}`
                  : ""}
              </p>
            ) : null}
            {result.safety.flags.length > 0 ? (
              <p className="mt-2 text-[var(--warning)]">{result.safety.flags.join(", ")}</p>
            ) : null}
            {result.safety.recommendations.length > 0 ? (
              <ul className="mt-2 grid gap-1 text-[var(--muted)]">
                {result.safety.recommendations.slice(0, 2).map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {result.variants.map((variant) => (
            <article key={variant.platform} className="rounded-md border border-[var(--border)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--accent)]">{variant.platform}</p>
              <p className="mt-2 text-sm">{variant.text}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
