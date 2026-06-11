"use client";

import { useState } from "react";
import {
  complianceRegulations,
  dataResidencyRegions,
  dateFormatOptions,
  supportedLocales,
  timeFormatOptions,
  type ComplianceRegulation,
  type DataResidencyRegion,
  type DateFormatOption,
  type LocalizationPreference,
  type RegionalComplianceProfile,
  type SupportedLocale,
  type TimeFormatOption
} from "@ssm/domain";
import { Globe2, Languages } from "lucide-react";
import { StatusBadge } from "./status-badge";

export function LocalizationSettingsPanel({
  workspaceId,
  userId,
  preference,
  complianceProfile
}: {
  workspaceId: string;
  userId: string;
  preference: LocalizationPreference;
  complianceProfile: RegionalComplianceProfile;
}) {
  const [localePref, setLocalePref] = useState(preference);
  const [profile, setProfile] = useState(complianceProfile);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function patchJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}${path}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-user-role": "owner"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? "Localization action failed");
    }

    return (await response.json()) as T;
  }

  async function savePreference() {
    setLoading("preference");
    setMessage(null);
    try {
      const updated = await patchJson<LocalizationPreference>("/localization/preferences", {
        workspaceId,
        userId,
        locale: localePref.locale,
        direction: localePref.locale === "ar" ? "rtl" : "ltr",
        timezone: localePref.timezone,
        dateFormat: localePref.dateFormat,
        timeFormat: localePref.timeFormat,
        firstDayOfWeek: localePref.firstDayOfWeek,
        numberingSystem: localePref.numberingSystem,
        contentTranslationEnabled: localePref.contentTranslationEnabled
      });
      setLocalePref(updated);
      setMessage(`Saved ${updated.locale} localization preferences.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save localization preferences");
    } finally {
      setLoading(null);
    }
  }

  async function saveComplianceProfile() {
    setLoading("compliance");
    setMessage(null);
    try {
      const updated = await patchJson<RegionalComplianceProfile>("/localization/compliance-profile", {
        workspaceId,
        dataResidency: profile.dataResidency,
        primaryRegion: profile.primaryRegion,
        regulations: profile.regulations,
        consentRequired: profile.consentRequired,
        retentionDays: profile.retentionDays,
        crossBorderTransfer: profile.crossBorderTransfer
      });
      setProfile(updated);
      setMessage(`Saved ${updated.dataResidency} compliance profile.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save compliance profile");
    } finally {
      setLoading(null);
    }
  }

  function toggleRegulation(regulation: ComplianceRegulation, checked: boolean) {
    setProfile((current) => ({
      ...current,
      regulations: checked
        ? [...new Set([...current.regulations, regulation])]
        : current.regulations.filter((item) => item !== regulation)
    }));
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Localization and region</h3>
          <p className="text-sm text-[var(--muted)]">
            Control language, date/time display, translation behavior, data residency, and regional compliance.
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={localePref.direction} />
          <StatusBadge status={profile.dataResidency} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Languages className="size-4" />
            User locale
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium">
              Locale
              <select
                value={localePref.locale}
                onChange={(event) =>
                  setLocalePref((current) => ({
                    ...current,
                    locale: event.target.value as SupportedLocale
                  }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                {supportedLocales.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Timezone
              <input
                value={localePref.timezone}
                onChange={(event) =>
                  setLocalePref((current) => ({ ...current, timezone: event.target.value }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Date format
              <select
                value={localePref.dateFormat}
                onChange={(event) =>
                  setLocalePref((current) => ({
                    ...current,
                    dateFormat: event.target.value as DateFormatOption
                  }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                {dateFormatOptions.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Time format
              <select
                value={localePref.timeFormat}
                onChange={(event) =>
                  setLocalePref((current) => ({
                    ...current,
                    timeFormat: event.target.value as TimeFormatOption
                  }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                {timeFormatOptions.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={localePref.contentTranslationEnabled}
              onChange={(event) =>
                setLocalePref((current) => ({
                  ...current,
                  contentTranslationEnabled: event.target.checked
                }))
              }
            />
            Enable AI-assisted content translation
          </label>
          <button
            type="button"
            onClick={savePreference}
            disabled={loading !== null}
            className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "preference" ? "Saving" : "Save locale"}
          </button>
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe2 className="size-4" />
            Regional compliance
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium">
              Residency
              <select
                value={profile.dataResidency}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    dataResidency: event.target.value as DataResidencyRegion
                  }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                {dataResidencyRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Primary region
              <input
                value={profile.primaryRegion}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, primaryRegion: event.target.value }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Retention days
              <input
                type="number"
                min={1}
                value={profile.retentionDays}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    retentionDays: Number(event.target.value)
                  }))
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-2 text-xs">
              {complianceRegulations.map((regulation) => (
                <label key={regulation} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.regulations.includes(regulation)}
                    onChange={(event) => toggleRegulation(regulation, event.target.checked)}
                  />
                  {regulation}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profile.consentRequired}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, consentRequired: event.target.checked }))
                }
              />
              Consent required
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profile.crossBorderTransfer}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    crossBorderTransfer: event.target.checked
                  }))
                }
              />
              Cross-border transfer
            </label>
          </div>
          <button
            type="button"
            onClick={saveComplianceProfile}
            disabled={loading !== null}
            className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "compliance" ? "Saving" : "Save region"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-4 rounded-md bg-[var(--panel-soft)] p-3 text-sm">{message}</p> : null}
    </section>
  );
}
