"use client";

import { useState } from "react";
import {
  contentTemplateCategories,
  platforms,
  type Campaign,
  type ContentTemplate,
  type ContentTemplateCategory,
  type Platform,
  type Post
} from "@ssm/domain";
import { ClipboardPlus, WandSparkles } from "lucide-react";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type UseTemplateResponse = {
  template: ContentTemplate;
  post: Post;
  variablesUsed: Record<string, string>;
};

export function ContentTemplatePanel({
  workspaceId,
  templates,
  campaigns
}: {
  workspaceId: string;
  templates: ContentTemplate[];
  campaigns: Campaign[];
}) {
  const [templateRows, setTemplateRows] = useState(templates);
  const [name, setName] = useState("Launch story prompt");
  const [category, setCategory] = useState<ContentTemplateCategory>("product_launch");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin", "instagram"]);
  const [bodyTemplate, setBodyTemplate] = useState(
    "{{product}} helps {{audience}} plan, approve, and publish with {{proofPoint}}."
  );
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function postJson<T>(path: string, body: unknown): Promise<T> {
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
      throw new Error(errorBody?.message ?? "Content template action failed");
    }

    return (await response.json()) as T;
  }

  async function createTemplate() {
    setLoading("create");
    setMessage(null);
    try {
      const template = await postJson<ContentTemplate>("/content/templates", {
        workspaceId,
        name,
        category,
        platforms: selectedPlatforms,
        bodyTemplate,
        defaultHashtags: ["LaunchOps", "SocialMedia"],
        guidance: { source: "calendar-panel", reviewRequired: category === "crisis_response" }
      });
      setTemplateRows((current) => [template, ...current]);
      setMessage(`Created template ${template.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create template");
    } finally {
      setLoading(null);
    }
  }

  async function useTemplate(template: ContentTemplate) {
    setLoading(template.id);
    setMessage(null);
    try {
      const response = await postJson<UseTemplateResponse>(`/content/templates/${template.id}/use`, {
        campaignId: campaignId || undefined,
        status: "draft",
        variables: {
          product: "Acme Planner",
          audience: "launch teams",
          proofPoint: "one approval-ready calendar",
          issue: "account connection delays",
          updateTime: "09:00 UTC"
        }
      });
      setTemplateRows((current) =>
        current.map((item) => (item.id === response.template.id ? response.template : item))
      );
      setMessage(`Created draft ${response.post.id} from ${response.template.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not use template");
    } finally {
      setLoading(null);
    }
  }

  function togglePlatform(platform: Platform, checked: boolean) {
    setSelectedPlatforms((current) =>
      checked ? [...new Set([...current, platform])] : current.filter((item) => item !== platform)
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Content templates</h3>
          <p className="text-sm text-[var(--muted)]">
            Reuse approved campaign structures and turn them into platform-specific drafts.
          </p>
        </div>
        <StatusBadge status={`${templateRows.filter((item) => item.status === "active").length} active`} />
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            aria-label="Template name"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ContentTemplateCategory)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            aria-label="Template category"
          >
            {contentTemplateCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={bodyTemplate}
          onChange={(event) => setBodyTemplate(event.target.value)}
          className="min-h-24 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          aria-label="Template body"
        />
        <div className="flex flex-wrap gap-2">
          {platforms.slice(0, 6).map((platform) => {
            const checked = selectedPlatforms.includes(platform);
            return (
              <label
                key={platform}
                className={`rounded-md border px-3 py-2 text-xs ${
                  checked
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border)] bg-white text-[var(--muted)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => togglePlatform(platform, event.target.checked)}
                  className="mr-2"
                />
                {platform}
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            aria-label="Campaign"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createTemplate}
            disabled={loading !== null || selectedPlatforms.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <ClipboardPlus className="size-4" />
            {loading === "create" ? "Creating" : "Create template"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {templateRows.slice(0, 4).map((template) => (
          <article key={template.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{template.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {template.category} / {template.platforms.join(", ")} / used {template.usageCount} time(s)
                </p>
              </div>
              <StatusBadge status={template.status} />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{template.bodyTemplate}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--muted)]">Last used {formatTime(template.lastUsedAt)}</span>
              <button
                type="button"
                onClick={() => useTemplate(template)}
                disabled={loading !== null || template.status !== "active"}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium disabled:opacity-60"
              >
                <WandSparkles className="size-3" />
                Use
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
