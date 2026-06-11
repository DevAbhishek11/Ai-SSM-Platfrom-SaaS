import { AccountHealth } from "@/components/account-health";
import { AppShell } from "@/components/app-shell";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function AccountsPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Accounts">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <AccountHealth accounts={overview.socialAccounts} />
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          <h3 className="text-base font-semibold">Connector readiness</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {overview.socialAccounts.map((account) => (
              <article key={account.id} className="rounded-md border border-[var(--border)] p-3">
                <p className="text-sm font-semibold capitalize">{account.platform}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">@{account.username}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Permissions: {Object.keys(account.permissions).join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
