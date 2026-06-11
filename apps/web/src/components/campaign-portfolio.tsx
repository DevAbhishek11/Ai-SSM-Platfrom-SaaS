import type { Campaign } from "@ssm/domain";

export function CampaignPortfolio({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Campaign portfolio</h3>
      <div className="mt-4 grid gap-3">
        {campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{campaign.name}</p>
                <p className="mt-1 text-sm capitalize text-[var(--muted)]">
                  {campaign.type.replace(/_/g, " ")} - {campaign.status}
                </p>
              </div>
              <time className="text-sm font-medium text-[var(--accent)]">
                {campaign.startDate} {campaign.endDate ? `- ${campaign.endDate}` : ""}
              </time>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {campaign.objectives.map((objective) => (
                <span
                  key={objective}
                  className="rounded-md bg-[var(--panel-soft)] px-2 py-1 text-xs text-[var(--muted)]"
                >
                  {objective}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
