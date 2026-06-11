"use client";

import { useState } from "react";
import { demoWorkspace, platforms, type AiGenerationResponse, type Platform } from "@ssm/domain";

export function AiGenerator() {
  const [brief, setBrief] = useState(
    "Create a confident launch post about AI-assisted social campaign planning for B2B teams."
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin", "instagram", "x"]);
  const [result, setResult] = useState<AiGenerationResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function generate() {
    setStatus("loading");
    setResult(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/ai/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-role": "creator"
        },
        body: JSON.stringify({
          workspaceId: demoWorkspace.id,
          brief,
          platforms: selectedPlatforms,
          tone: "practical and confident",
          objective: "engagement"
        })
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      setResult((await response.json()) as AiGenerationResponse);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
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
      <button
        type="button"
        onClick={generate}
        disabled={status === "loading" || selectedPlatforms.length === 0}
        className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Generating" : "Generate variants"}
      </button>
      {status === "error" ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not reach the API. Start `npm run dev:api` and try again.
        </p>
      ) : null}
      {result ? (
        <div className="mt-4 grid gap-3">
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
