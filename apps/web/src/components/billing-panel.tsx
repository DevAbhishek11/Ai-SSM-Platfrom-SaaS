import {
  demoApiKeys,
  demoMediaAssets,
  demoPosts,
  demoSocialAccounts,
  demoTeamMembers,
  demoWorkspace,
  demoWorkspaceInvitations,
  planLimits
} from "@ssm/domain";

export function BillingPanel() {
  const business = planLimits.business;
  const storageGb = demoMediaAssets
    .filter((asset) => asset.workspaceId === demoWorkspace.id)
    .reduce((sum, asset) => sum + asset.fileSize, 0) / 1024 / 1024 / 1024;
  const usage = [
    {
      label: "Social accounts",
      used: demoSocialAccounts.filter((account) => account.workspaceId === demoWorkspace.id).length,
      limit: business.socialAccounts
    },
    {
      label: "Team seats",
      used:
        demoTeamMembers.filter((member) => member.workspaceId === demoWorkspace.id).length +
        demoWorkspaceInvitations.filter(
          (invite) => invite.workspaceId === demoWorkspace.id && invite.status === "pending"
        ).length,
      limit: business.teamMembers
    },
    {
      label: "Posts this month",
      used: demoPosts.filter((post) => post.workspaceId === demoWorkspace.id).length,
      limit: business.postsPerMonth
    },
    {
      label: "AI generations",
      used: demoPosts.filter((post) => post.workspaceId === demoWorkspace.id && post.aiGenerated).length,
      limit: business.aiGenerations
    },
    {
      label: "Media storage",
      used: Number(storageGb.toFixed(3)),
      limit: business.mediaStorageGb
    },
    {
      label: "API keys",
      used: demoApiKeys.filter((apiKey) => apiKey.workspaceId === demoWorkspace.id && apiKey.status === "active")
        .length,
      limit: business.apiAccess
    }
  ];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Billing and limits</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Current demo workspace is mapped to Business with entitlement checks enabled.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {usage.map((item) => {
          const numericLimit = typeof item.limit === "number" ? item.limit : undefined;
          const percent = numericLimit ? Math.min(Math.round((item.used / numericLimit) * 100), 100) : 100;

          return (
            <div key={item.label} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase text-[var(--muted)]">{item.label}</p>
                <strong className="text-sm">
                  {item.used}/{String(item.limit)}
                </strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3 sm:col-span-2">
          <p className="text-xs uppercase text-[var(--muted)]">Plan capabilities</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {Object.entries(business).map(([key, value]) => (
              <span key={key} className="rounded-md bg-white px-2 py-1">
                {key.replace(/([A-Z])/g, " $1")}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
