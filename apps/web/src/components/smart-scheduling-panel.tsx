"use client";

import { useMemo, useState } from "react";
import {
  platforms,
  type Campaign,
  type Platform,
  type Post,
  type ScheduleRule,
  type ScheduleSlot
} from "@ssm/domain";
import { CalendarClock, Sparkles } from "lucide-react";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type RecommendationResponse = {
  generated: ScheduleSlot[];
  rulesConsidered: number;
};

type ReserveResponse = {
  slot: ScheduleSlot;
  enqueueResult?: unknown;
};

export function SmartSchedulingPanel({
  workspaceId,
  rules,
  slots,
  posts,
  campaigns
}: {
  workspaceId: string;
  rules: ScheduleRule[];
  slots: ScheduleSlot[];
  posts: Post[];
  campaigns: Campaign[];
}) {
  const [ruleRows, setRuleRows] = useState(rules);
  const [slotRows, setSlotRows] = useState(slots);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["linkedin", "instagram"]);
  const [postId, setPostId] = useState(posts[0]?.id ?? "");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPost = useMemo(() => posts.find((post) => post.id === postId), [postId, posts]);

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
      throw new Error(errorBody?.message ?? "Scheduling action failed");
    }

    return (await response.json()) as T;
  }

  async function createRule() {
    setLoading("rule");
    setMessage(null);
    try {
      const rule = await postJson<ScheduleRule>("/scheduling/rules", {
        workspaceId,
        name: `Smart ${selectedPlatforms.join(" + ")} window`,
        platforms: selectedPlatforms,
        timezone: "Asia/Calcutta",
        windows: [
          { dayOfWeek: 2, startTime: "10:00", endTime: "12:00" },
          { dayOfWeek: 4, startTime: "15:00", endTime: "17:00" }
        ],
        minGapMinutes: 120,
        maxPostsPerDay: 3
      });
      setRuleRows((current) => [rule, ...current]);
      setMessage(`Created scheduling rule ${rule.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create schedule rule");
    } finally {
      setLoading(null);
    }
  }

  async function recommend() {
    setLoading("recommend");
    setMessage(null);
    try {
      const response = await postJson<RecommendationResponse>("/scheduling/recommendations", {
        workspaceId,
        campaignId: campaignId || undefined,
        platforms: selectedPlatforms,
        count: 3,
        earliestAt: "2026-06-16T04:00:00.000Z"
      });
      setSlotRows((current) => [...response.generated, ...current]);
      setMessage(`Generated ${response.generated.length} slot(s) from ${response.rulesConsidered} rule(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not recommend slots");
    } finally {
      setLoading(null);
    }
  }

  async function reserve(slot: ScheduleSlot) {
    setLoading(slot.id);
    setMessage(null);
    try {
      const body = await postJson<ReserveResponse>(`/scheduling/slots/${slot.id}/reserve`, {
        postId: selectedPost?.content.some((variant) => variant.platform === slot.platform) ? postId : undefined,
        campaignId: campaignId || undefined,
        metadata: { source: "calendar-panel" }
      });
      setSlotRows((current) => current.map((item) => (item.id === body.slot.id ? body.slot : item)));
      setMessage(`Reserved ${slot.platform} slot for ${formatTime(slot.startsAt)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reserve slot");
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
          <h3 className="text-base font-semibold">Smart scheduling</h3>
          <p className="text-sm text-[var(--muted)]">
            Generate best-time recommendations and reserve calendar slots for posts.
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={`${ruleRows.filter((rule) => rule.status === "active").length} rules`} />
          <StatusBadge status={`${slotRows.filter((slot) => slot.status === "recommended").length} slots`} />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
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
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <select
            value={postId}
            onChange={(event) => setPostId(event.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            aria-label="Post to schedule"
          >
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.content[0]?.text.slice(0, 54)}
              </option>
            ))}
          </select>
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
            onClick={createRule}
            disabled={loading !== null || selectedPlatforms.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            <CalendarClock className="size-4" />
            Rule
          </button>
          <button
            type="button"
            onClick={recommend}
            disabled={loading !== null || selectedPlatforms.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            Recommend
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {slotRows.slice(0, 5).map((slot) => (
          <article key={slot.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {slot.platform} / {formatTime(slot.startsAt)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Score {slot.score} - {slot.reason}
                </p>
              </div>
              <StatusBadge status={slot.status} />
            </div>
            {slot.status === "recommended" ? (
              <button
                type="button"
                onClick={() => reserve(slot)}
                disabled={loading !== null}
                className="mt-3 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium disabled:opacity-60"
              >
                Reserve
              </button>
            ) : null}
          </article>
        ))}
      </div>
      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
