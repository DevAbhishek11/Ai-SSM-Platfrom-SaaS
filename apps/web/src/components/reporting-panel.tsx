"use client";

import { useState } from "react";
import {
  reportFormats,
  reportTypes,
  type ReportExport,
  type ReportFormat,
  type ReportShareLink,
  type ReportTemplate,
  type ReportType,
  type ScheduledReport
} from "@ssm/domain";
import { FileDown, Link2, Mail } from "lucide-react";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function ReportingPanel({
  workspaceId,
  templates,
  schedules,
  exports,
  shareLinks
}: {
  workspaceId: string;
  templates: ReportTemplate[];
  schedules: ScheduledReport[];
  exports: ReportExport[];
  shareLinks: ReportShareLink[];
}) {
  const [templateRows, setTemplateRows] = useState(templates);
  const [scheduleRows, setScheduleRows] = useState(schedules);
  const [exportRows, setExportRows] = useState(exports);
  const [shareLinkRows, setShareLinkRows] = useState(shareLinks);
  const [type, setType] = useState<ReportType>("executive");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      throw new Error(errorBody?.message ?? "Reporting action failed");
    }

    return (await response.json()) as T;
  }

  async function createTemplate() {
    setLoading("template");
    setMessage(null);
    try {
      const template = await requestJson<ReportTemplate>("/reports/templates", {
        workspaceId,
        name: `${type} ${format} report`,
        type,
        format,
        filters: { includeListening: true, includeBudget: true },
        branding: { primaryColor: "#0f766e", footerText: "Prepared by SSM" }
      });
      setTemplateRows((current) => [template, ...current]);
      setSelectedTemplateId(template.id);
      setMessage(`Created ${template.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create template");
    } finally {
      setLoading(null);
    }
  }

  async function createSchedule() {
    if (!selectedTemplateId) {
      return;
    }
    setLoading("schedule");
    setMessage(null);
    try {
      const schedule = await requestJson<ScheduledReport>("/reports/schedules", {
        templateId: selectedTemplateId,
        frequency: "weekly",
        recipients: ["owner@acmegrowth.test"]
      });
      setScheduleRows((current) => [schedule, ...current]);
      setMessage("Scheduled weekly stakeholder report.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create schedule");
    } finally {
      setLoading(null);
    }
  }

  async function createExport() {
    setLoading("export");
    setMessage(null);
    try {
      const reportExport = await requestJson<ReportExport>("/reports/exports", {
        workspaceId,
        templateId: selectedTemplateId || undefined,
        type,
        format
      });
      setExportRows((current) => [reportExport, ...current]);
      setMessage(`Export ready as ${reportExport.format}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create export");
    } finally {
      setLoading(null);
    }
  }

  async function shareExport(reportExport: ReportExport) {
    setLoading(reportExport.id);
    setMessage(null);
    try {
      const shareLink = await requestJson<ReportShareLink>(
        `/reports/exports/${reportExport.id}/share-links`,
        {}
      );
      setShareLinkRows((current) => [shareLink, ...current]);
      setMessage(`Share link created: ${shareLink.token.slice(0, 12)}...`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create share link");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Reports and exports</h3>
          <p className="text-sm text-[var(--muted)]">
            Build white-labeled reports, schedule delivery, export files, and create secure share links.
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={`${templateRows.length} templates`} />
          <StatusBadge status={`${exportRows.filter((item) => item.status === "ready").length} ready`} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
        <label className="grid gap-1 text-sm font-medium">
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ReportType)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {reportTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Format
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as ReportFormat)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {reportFormats.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={createTemplate}
          disabled={loading !== null}
          className="self-end rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          Template
        </button>
        <button
          type="button"
          onClick={createExport}
          disabled={loading !== null}
          className="self-end rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Export
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Schedule template
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              {templateRows.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={createSchedule}
            disabled={loading !== null || !selectedTemplateId}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            <Mail className="size-4" />
            Schedule weekly
          </button>
          {scheduleRows.slice(0, 3).map((schedule) => (
            <article key={schedule.id} className="rounded-md border border-[var(--border)] p-3">
              <p className="text-sm font-semibold">{schedule.frequency} report</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {schedule.recipients.join(", ")} - next {formatTime(schedule.nextRunAt)}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-3">
          {exportRows.slice(0, 4).map((reportExport) => (
            <article key={reportExport.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {reportExport.type} export - {reportExport.format}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {reportExport.downloadUrl ?? "Preparing export"}
                  </p>
                </div>
                <StatusBadge status={reportExport.status} />
              </div>
              <button
                type="button"
                onClick={() => shareExport(reportExport)}
                disabled={loading !== null || reportExport.status !== "ready"}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
              >
                <Link2 className="size-3" />
                Share
              </button>
            </article>
          ))}
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <FileDown className="size-4" />
            {shareLinkRows.filter((link) => link.status === "active").length} active share link(s)
          </div>
        </div>
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
