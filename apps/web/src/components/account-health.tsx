import type { SocialAccount } from "@ssm/domain";
import { StatusBadge } from "./status-badge";

export function AccountHealth({ accounts }: { accounts: SocialAccount[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Account health</h3>
      <div className="mt-4 grid gap-3">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">@{account.username}</p>
              <p className="text-xs capitalize text-[var(--muted)]">{account.platform}</p>
            </div>
            <StatusBadge status={account.status} />
          </div>
        ))}
      </div>
    </section>
  );
}
