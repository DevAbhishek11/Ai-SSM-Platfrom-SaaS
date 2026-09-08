import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import type { SocialAccount } from "@ssm/domain";
import { formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function AccountHealth({ accounts }: { accounts: SocialAccount[] }) {
  const healthy = accounts.filter((account) => account.status === "connected").length;
  const ratio = accounts.length ? Math.round((healthy / accounts.length) * 100) : 0;

  return (
    <section className="card flex flex-col">
      <header className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Radio size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="card-title">Account health</h3>
            <p className="card-subtitle">
              {healthy} of {accounts.length} channels ready to publish.
            </p>
          </div>
        </div>
        <Link href="/accounts" className="btn-ghost btn-sm">
          Manage
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </header>

      <div className="px-4 pt-3">
        <div className="progress" role="img" aria-label={`${ratio}% of accounts connected`}>
          <span style={{ width: `${ratio}%` }} />
        </div>
      </div>

      <div className="grid gap-2 p-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">@{account.username}</p>
              <p className="mt-0.5 text-xs capitalize text-[var(--muted)]">
                {account.platform} · synced {formatRelativeTime(account.lastSyncedAt)}
              </p>
              {account.status !== "connected" ? (
                <p className="mt-1.5 text-xs font-medium text-[var(--warning)]">
                  Reconnect before publishing.
                </p>
              ) : null}
            </div>
            <StatusBadge status={account.status} />
          </div>
        ))}
      </div>
    </section>
  );
}
