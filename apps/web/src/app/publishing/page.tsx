import { demoPublishingJobs } from "@ssm/domain";
import { AppShell } from "@/components/app-shell";
import { PublishingQueue } from "@/components/publishing-queue";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function PublishingPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Publishing">
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <PublishingQueue jobs={demoPublishingJobs} accounts={overview.socialAccounts} />
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          <h3 className="text-base font-semibold">Retry policy</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="rounded-md bg-[var(--panel-soft)] p-3">
              Jobs use deterministic idempotency keys per post, account, platform, and scheduled time.
            </p>
            <p className="rounded-md bg-[var(--panel-soft)] p-3">
              Failed jobs back off exponentially up to 15 minutes and stop after five attempts.
            </p>
            <p className="rounded-md bg-[var(--panel-soft)] p-3">
              Expired or revoked social accounts fail fast and surface account-health alerts.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
