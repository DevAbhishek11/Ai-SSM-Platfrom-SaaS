"use client";

import { useMemo, useState } from "react";
import {
  listeningMonitorTypes,
  platforms,
  type ListeningAlert,
  type ListeningMonitor,
  type ListeningMonitorType,
  type Platform,
  type SocialMention
} from "@ssm/domain";
import { BellRing, Pause, Play, RadioTower, ShieldAlert } from "lucide-react";
import { formatCompactNumber, formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type IngestMentionResponse = {
  mention: SocialMention;
  alert?: ListeningAlert;
};

export function SocialListeningPanel({
  workspaceId,
  monitors,
  mentions,
  alerts
}: {
  workspaceId: string;
  monitors: ListeningMonitor[];
  mentions: SocialMention[];
  alerts: ListeningAlert[];
}) {
  const [monitorRows, setMonitorRows] = useState(monitors);
  const [mentionRows, setMentionRows] = useState(mentions);
  const [alertRows, setAlertRows] = useState(alerts);
  const [type, setType] = useState<ListeningMonitorType>("brand");
  const [platform, setPlatform] = useState<Platform>("x");
  const [query, setQuery] = useState("Acme Growth");
  const [alertThreshold, setAlertThreshold] = useState(72);
  const [selectedMonitorId, setSelectedMonitorId] = useState(monitors[0]?.id ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeAlerts = useMemo(() => alertRows.filter((alert) => !alert.resolved), [alertRows]);
  const negativeMentions = useMemo(
    () => mentionRows.filter((mention) => mention.sentiment === "negative").length,
    [mentionRows]
  );
  const totalReach = useMemo(
    () => mentionRows.reduce((total, mention) => total + mention.reach, 0),
    [mentionRows]
  );
  const selectedMonitor =
    monitorRows.find((monitor) => monitor.id === selectedMonitorId) ??
    monitorRows.find((monitor) => monitor.status === "active") ??
    monitorRows[0];

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
      throw new Error(errorBody?.message ?? "Listening action failed");
    }

    return (await response.json()) as T;
  }

  async function createMonitor() {
    setLoading("create");
    setMessage(null);
    try {
      const monitor = await requestJson<ListeningMonitor>("/listening/monitors", {
        workspaceId,
        type,
        query,
        platforms: [platform],
        alertThreshold
      });
      setMonitorRows((current) => [monitor, ...current]);
      setSelectedMonitorId(monitor.id);
      setMessage(`Monitoring ${monitor.query} on ${monitor.platforms.join(", ")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create monitor");
    } finally {
      setLoading(null);
    }
  }

  async function toggleMonitor(monitor: ListeningMonitor) {
    const nextStatus = monitor.status === "active" ? "pause" : "resume";
    setLoading(`${monitor.id}:${nextStatus}`);
    setMessage(null);
    try {
      const updated = await requestJson<ListeningMonitor>(`/listening/monitors/${monitor.id}/${nextStatus}`);
      setMonitorRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${updated.query} is now ${updated.status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update monitor");
    } finally {
      setLoading(null);
    }
  }

  async function ingestMention() {
    if (!selectedMonitor) {
      setMessage("Create a monitor before ingesting mentions.");
      return;
    }

    setLoading("ingest");
    setMessage(null);
    try {
      const body = await requestJson<IngestMentionResponse>("/listening/mentions", {
        workspaceId,
        monitorId: selectedMonitor.id,
        platform: selectedMonitor.platforms[0] ?? "x",
        author: "LaunchOps Watch",
        content: `${selectedMonitor.query} account connection seems broken before launch day.`,
        sentiment: "negative",
        reach: selectedMonitor.alertThreshold * 1000 + 19000,
        engagement: selectedMonitor.alertThreshold * 18,
        metadata: { source: "dashboard-simulation", crisisSignal: true }
      });
      setMentionRows((current) => [body.mention, ...current]);
      const alert = body.alert;
      if (alert) {
        setAlertRows((current) => [alert, ...current]);
        setMessage(`Created ${alert.severity} alert for a ${body.mention.platform} mention.`);
      } else {
        setMessage("Mention ingested without an alert.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not ingest mention");
    } finally {
      setLoading(null);
    }
  }

  async function resolveAlert(alert: ListeningAlert) {
    setLoading(alert.id);
    setMessage(null);
    try {
      const resolved = await requestJson<ListeningAlert>(`/listening/alerts/${alert.id}/resolve`);
      setAlertRows((current) => current.map((item) => (item.id === resolved.id ? resolved : item)));
      setMessage(`${resolved.title} resolved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resolve alert");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Social listening command center</h3>
          <p className="text-sm text-[var(--muted)]">
            Monitor brand, competitor, and keyword mentions before they become launch risks.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm">
          <BellRing className="size-4 text-[var(--accent)]" />
          {activeAlerts.length} open alert{activeAlerts.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <ListeningStat label="Active monitors" value={monitorRows.filter((item) => item.status === "active").length} />
        <ListeningStat label="Mentions" value={mentionRows.length} />
        <ListeningStat label="Negative" value={negativeMentions} />
        <ListeningStat label="Reach watched" value={formatCompactNumber(totalReach)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="grid gap-3">
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex items-center gap-2">
              <RadioTower className="size-4 text-[var(--accent)]" />
              <p className="text-sm font-semibold">Create monitor</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Type
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as ListeningMonitorType)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                >
                  {listeningMonitorTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Platform
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value as Platform)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                >
                  {platforms.map((item) => (
                    <option key={item} value={item}>
                      {item === "x" ? "X" : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                Query
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Alert threshold
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={alertThreshold}
                  onChange={(event) => setAlertThreshold(Number(event.target.value))}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={createMonitor}
                disabled={loading !== null || query.trim().length === 0}
                className="self-end rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading === "create" ? "Creating" : "Start monitoring"}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {monitorRows.map((monitor) => (
              <article key={monitor.id} className="rounded-md border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{monitor.query}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {monitor.type} on {monitor.platforms.join(", ") || "all platforms"}
                    </p>
                  </div>
                  <StatusBadge status={monitor.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[var(--muted)]">
                    Alert at {monitor.alertThreshold}k reach
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleMonitor(monitor)}
                    disabled={loading !== null || monitor.status === "archived"}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                  >
                    {monitor.status === "active" ? <Pause className="size-3" /> : <Play className="size-3" />}
                    {monitor.status === "active" ? "Pause" : "Resume"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="grid flex-1 gap-1 text-sm font-medium">
                Ingest test mention
                <select
                  value={selectedMonitor?.id ?? ""}
                  onChange={(event) => setSelectedMonitorId(event.target.value)}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                >
                  {monitorRows.map((monitor) => (
                    <option key={monitor.id} value={monitor.id}>
                      {monitor.query}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={ingestMention}
                disabled={loading !== null || !selectedMonitor || selectedMonitor.status !== "active"}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading === "ingest" ? "Ingesting" : "Simulate alert"}
              </button>
            </div>
            {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
          </div>

          <div className="grid gap-2">
            {activeAlerts.length ? (
              activeAlerts.map((alert) => (
                <article key={alert.id} className="rounded-md border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex gap-2">
                      <ShieldAlert className="mt-0.5 size-4 text-red-700" />
                      <div>
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{alert.body}</p>
                      </div>
                    </div>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[var(--muted)]">{formatTime(alert.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => resolveAlert(alert)}
                      disabled={loading !== null}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                    >
                      Resolve
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-md border border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                No active listening alerts.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {mentionRows.slice(0, 4).map((mention) => (
          <article key={mention.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {mention.platform === "x" ? "X" : mention.platform} by {mention.author}
              </p>
              <StatusBadge status={mention.sentiment} />
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{mention.content}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {formatCompactNumber(mention.reach)} reach, {formatCompactNumber(mention.engagement)} engagements
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ListeningStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
      <p className="text-xs font-medium uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
