import type { WebhookDelivery } from "@ssm/domain";
import { StatusBadge } from "./status-badge";

export function WebhookDeliveries({ deliveries }: { deliveries: WebhookDelivery[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Webhook deliveries</h3>
      <div className="mt-4 grid gap-3">
        {deliveries.map((delivery) => (
          <article
            key={delivery.id}
            className="grid gap-3 rounded-md border border-[var(--border)] p-3 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="text-sm font-semibold">{delivery.eventType}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Attempts: {delivery.attempts}
                {delivery.nextRetryAt ? ` · next retry ${delivery.nextRetryAt}` : ""}
              </p>
            </div>
            <StatusBadge status={delivery.status} />
          </article>
        ))}
      </div>
    </section>
  );
}
