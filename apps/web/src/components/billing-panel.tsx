import { planLimits } from "@ssm/domain";

export function BillingPanel() {
  const business = planLimits.business;

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Billing and limits</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">Current demo workspace is mapped to Business.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(business).map(([key, value]) => (
          <div key={key} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <p className="text-xs uppercase text-[var(--muted)]">{key.replace(/([A-Z])/g, " $1")}</p>
            <strong className="mt-1 block text-lg">{String(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
