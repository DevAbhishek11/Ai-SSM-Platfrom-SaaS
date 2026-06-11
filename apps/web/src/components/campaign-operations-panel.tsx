"use client";

import { useMemo, useState } from "react";
import {
  campaignTaskPriorities,
  type Campaign,
  type CampaignBudgetLine,
  type CampaignMilestone,
  type CampaignReport,
  type CampaignTask,
  type CampaignTaskPriority
} from "@ssm/domain";
import { BarChart3, CheckCircle2, ClipboardList, DollarSign } from "lucide-react";
import { formatCompactNumber, formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function CampaignOperationsPanel({
  campaigns,
  milestones,
  tasks,
  budgetLines,
  reports
}: {
  campaigns: Campaign[];
  milestones: CampaignMilestone[];
  tasks: CampaignTask[];
  budgetLines: CampaignBudgetLine[];
  reports: CampaignReport[];
}) {
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? "");
  const [milestoneRows, setMilestoneRows] = useState(milestones);
  const [taskRows, setTaskRows] = useState(tasks);
  const [budgetRows, setBudgetRows] = useState(budgetLines);
  const [reportRows, setReportRows] = useState(reports);
  const [taskTitle, setTaskTitle] = useState("Review launch day response copy");
  const [taskPriority, setTaskPriority] = useState<CampaignTaskPriority>("high");
  const [budgetCategory, setBudgetCategory] = useState("Paid social");
  const [allocated, setAllocated] = useState(20000);
  const [spent, setSpent] = useState(9400);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0];
  const campaignMilestones = useMemo(
    () => milestoneRows.filter((milestone) => milestone.campaignId === selectedCampaign?.id),
    [milestoneRows, selectedCampaign?.id]
  );
  const campaignTasks = useMemo(
    () => taskRows.filter((task) => task.campaignId === selectedCampaign?.id),
    [taskRows, selectedCampaign?.id]
  );
  const campaignBudget = useMemo(
    () => budgetRows.filter((line) => line.campaignId === selectedCampaign?.id),
    [budgetRows, selectedCampaign?.id]
  );
  const campaignReports = useMemo(
    () =>
      reportRows
        .filter((report) => report.campaignId === selectedCampaign?.id)
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [reportRows, selectedCampaign?.id]
  );
  const budgetAllocated = campaignBudget.reduce((total, line) => total + line.allocated, 0);
  const budgetSpent = campaignBudget.reduce((total, line) => total + line.spent, 0);
  const latestReport = campaignReports[0];

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
      throw new Error(errorBody?.message ?? "Campaign action failed");
    }

    return (await response.json()) as T;
  }

  async function completeMilestone(milestone: CampaignMilestone) {
    setLoading(milestone.id);
    setMessage(null);
    try {
      const updated = await requestJson<CampaignMilestone>(
        `/campaigns/milestones/${milestone.id}/complete`
      );
      setMilestoneRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${updated.name} completed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete milestone");
    } finally {
      setLoading(null);
    }
  }

  async function createTask() {
    if (!selectedCampaign) {
      return;
    }

    setLoading("task");
    setMessage(null);
    try {
      const task = await requestJson<CampaignTask>(`/campaigns/${selectedCampaign.id}/tasks`, {
        title: taskTitle,
        priority: taskPriority,
        dueDate: "2026-06-18",
        metadata: { source: "calendar-ops" }
      });
      setTaskRows((current) => [task, ...current]);
      setTaskTitle("");
      setMessage(`Created task: ${task.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create task");
    } finally {
      setLoading(null);
    }
  }

  async function markTaskDone(task: CampaignTask) {
    setLoading(task.id);
    setMessage(null);
    try {
      const updated = await requestJson<CampaignTask>(`/campaigns/tasks/${task.id}/status`, {
        status: "done"
      });
      setTaskRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${updated.title} marked done.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update task");
    } finally {
      setLoading(null);
    }
  }

  async function saveBudgetLine() {
    if (!selectedCampaign) {
      return;
    }

    setLoading("budget");
    setMessage(null);
    try {
      const line = await requestJson<CampaignBudgetLine>(
        `/campaigns/${selectedCampaign.id}/budget-lines`,
        {
          category: budgetCategory,
          allocated,
          spent,
          currency: "USD"
        }
      );
      setBudgetRows((current) => {
        const exists = current.some((item) => item.id === line.id);
        return exists ? current.map((item) => (item.id === line.id ? line : item)) : [line, ...current];
      });
      setMessage(`Saved budget line for ${line.category}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save budget line");
    } finally {
      setLoading(null);
    }
  }

  async function generateReport() {
    if (!selectedCampaign) {
      return;
    }

    setLoading("report");
    setMessage(null);
    try {
      const report = await requestJson<CampaignReport>(
        `/campaigns/${selectedCampaign.id}/reports/generate`,
        {
          periodStart: selectedCampaign.startDate,
          periodEnd: selectedCampaign.endDate
        }
      );
      setReportRows((current) => [report, ...current]);
      setMessage(`Generated report with ${report.insights.length} insight(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate report");
    } finally {
      setLoading(null);
    }
  }

  if (!selectedCampaign) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
        <h3 className="text-base font-semibold">Campaign operations</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">No campaigns are available.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Campaign operations</h3>
          <p className="text-sm text-[var(--muted)]">
            Track milestones, tasks, budget pacing, and generated performance reports.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Campaign
          <select
            value={selectedCampaign.id}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <CampaignStat label="Milestones" value={`${completedCount(campaignMilestones)}/${campaignMilestones.length}`} />
        <CampaignStat label="Blocked tasks" value={campaignTasks.filter((task) => task.status === "blocked").length} />
        <CampaignStat label="Budget spent" value={formatMoney(budgetSpent)} />
        <CampaignStat label="Report ROI" value={latestReport ? `${latestReport.metrics.roi}x` : "No report"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <PanelHeader icon={CheckCircle2} title="Milestones" />
          {campaignMilestones.map((milestone) => (
            <article key={milestone.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{milestone.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{milestone.description}</p>
                </div>
                <StatusBadge status={milestone.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[var(--muted)]">Due {milestone.dueDate}</span>
                <button
                  type="button"
                  onClick={() => completeMilestone(milestone)}
                  disabled={loading !== null || milestone.status === "completed"}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Complete
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3">
          <PanelHeader icon={ClipboardList} title="Tasks" />
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Task title"
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
              <select
                value={taskPriority}
                onChange={(event) => setTaskPriority(event.target.value as CampaignTaskPriority)}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                {campaignTaskPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={createTask}
                disabled={loading !== null || taskTitle.trim().length === 0}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add task
              </button>
            </div>
          </div>
          {campaignTasks.map((task) => (
            <article key={task.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {task.priority} priority {task.dueDate ? `- due ${task.dueDate}` : ""}
                  </p>
                </div>
                <StatusBadge status={task.status} />
              </div>
              <button
                type="button"
                onClick={() => markTaskDone(task)}
                disabled={loading !== null || task.status === "done"}
                className="mt-3 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-60"
              >
                Mark done
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <PanelHeader icon={DollarSign} title="Budget pacing" />
          <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_110px_110px_auto]">
              <input
                value={budgetCategory}
                onChange={(event) => setBudgetCategory(event.target.value)}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={allocated}
                onChange={(event) => setAllocated(Number(event.target.value))}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={spent}
                onChange={(event) => setSpent(Number(event.target.value))}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={saveBudgetLine}
                disabled={loading !== null || budgetCategory.trim().length === 0}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
          {campaignBudget.map((line) => (
            <div key={line.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{line.category}</p>
                <p className="text-sm text-[var(--muted)]">
                  {formatMoney(line.spent)} / {formatMoney(line.allocated)}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min((line.spent / Math.max(line.allocated, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-sm text-[var(--muted)]">
            Total spend {formatMoney(budgetSpent)} of {formatMoney(budgetAllocated)}.
          </p>
        </div>

        <div className="grid gap-3">
          <PanelHeader icon={BarChart3} title="Reports" />
          <button
            type="button"
            onClick={generateReport}
            disabled={loading !== null}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === "report" ? "Generating" : "Generate report"}
          </button>
          {campaignReports.slice(0, 2).map((report) => (
            <article key={report.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{report.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {report.periodStart} - {report.periodEnd} - {formatTime(report.generatedAt)}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <ReportMetric label="Impressions" value={formatCompactNumber(report.metrics.impressions)} />
                <ReportMetric label="Engagement" value={`${Math.round(report.metrics.engagementRate * 1000) / 10}%`} />
                <ReportMetric label="ROI" value={`${report.metrics.roi}x`} />
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-[var(--muted)]">
                {report.insights.slice(0, 2).map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}

function CampaignStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
      <p className="text-xs font-medium uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function PanelHeader({ icon: Icon, title }: { icon: typeof ClipboardList; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-[var(--accent)]" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--panel-soft)] p-2">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function completedCount(milestones: CampaignMilestone[]) {
  return milestones.filter((milestone) => milestone.status === "completed").length;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
