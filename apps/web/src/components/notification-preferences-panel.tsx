"use client";

import { useState } from "react";
import {
  notificationChannels,
  notificationDigestFrequencies,
  notificationTypes,
  type NotificationDeliveryAttempt,
  type NotificationDigestFrequency,
  type NotificationPreference,
  type NotificationType
} from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function NotificationPreferencesPanel({
  workspaceId,
  userId,
  preferences,
  deliveries
}: {
  workspaceId: string;
  userId: string;
  preferences: NotificationPreference;
  deliveries: NotificationDeliveryAttempt[];
}) {
  const [channelSettings, setChannelSettings] = useState(preferences.channelSettings);
  const [digestFrequency, setDigestFrequency] = useState<NotificationDigestFrequency>(
    preferences.digestFrequency
  );
  const [mutedTypes, setMutedTypes] = useState<NotificationType[]>(preferences.mutedTypes);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function patchPreferences() {
    setLoading("preferences");
    setMessage(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/notifications/preferences?workspaceId=${workspaceId}&userId=${userId}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-user-role": "owner"
          },
          body: JSON.stringify({
            channelSettings,
            digestFrequency,
            mutedTypes,
            quietHours: preferences.quietHours
          })
        }
      );

      if (!response.ok) {
        throw new Error("Could not update notification preferences");
      }
      setMessage("Notification preferences updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update preferences");
    } finally {
      setLoading(null);
    }
  }

  async function sendTestAlert() {
    setLoading("route");
    setMessage(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/notifications/route`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-user-role": "owner"
          },
          body: JSON.stringify({
            workspaceId,
            userId,
            type: "system_alert",
            title: "Notification route test",
            body: "This test alert follows your channel and quiet-hour settings.",
            priority: "high",
            metadata: { forceQuietHours: true }
          })
        }
      );

      if (!response.ok) {
        throw new Error("Could not route test notification");
      }
      const body = (await response.json()) as { attempts: NotificationDeliveryAttempt[] };
      setMessage(`Routed ${body.attempts.length} channel attempt(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not route test alert");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Notification routing</h3>
          <p className="text-sm text-[var(--muted)]">
            Configure delivery channels, digest mode, muted events, and inspect delivery attempts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={patchPreferences}
            disabled={loading !== null}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "preferences" ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            onClick={sendTestAlert}
            disabled={loading !== null}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading === "route" ? "Routing" : "Test alert"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-3">
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <p className="text-sm font-semibold">Channels</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {notificationChannels.map((channel) => {
                const checked = channelSettings[channel] ?? false;
                return (
                  <label
                    key={channel}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--border)] bg-white text-[var(--muted)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setChannelSettings((current) => ({
                          ...current,
                          [channel]: event.target.checked
                        }))
                      }
                      className="mr-2"
                    />
                    {channel.replace("_", " ")}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <label className="grid gap-2 text-sm font-semibold">
              Digest mode
              <select
                value={digestFrequency}
                onChange={(event) => setDigestFrequency(event.target.value as NotificationDigestFrequency)}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                {notificationDigestFrequencies.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </label>
            {preferences.quietHours ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Quiet hours: {preferences.quietHours.start}-{preferences.quietHours.end}{" "}
                {preferences.quietHours.timezone}
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <p className="text-sm font-semibold">Muted event types</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {notificationTypes.slice(0, 8).map((type) => {
                const checked = mutedTypes.includes(type);
                return (
                  <label key={type} className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setMutedTypes((current) =>
                          event.target.checked ? [...current, type] : current.filter((item) => item !== type)
                        )
                      }
                      className="mr-2"
                    />
                    {type.replace(/_/g, " ")}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <h4 className="text-sm font-semibold">Recent delivery attempts</h4>
          {deliveries.slice(0, 5).map((attempt) => (
            <article key={attempt.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{attempt.channel.replace("_", " ")}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {attempt.provider} / {attempt.destination} / {formatTime(attempt.attemptedAt)}
                  </p>
                </div>
                <StatusBadge status={attempt.status} />
              </div>
              {attempt.errorMessage ? (
                <p className="mt-2 text-xs text-[var(--warning)]">{attempt.errorMessage}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
