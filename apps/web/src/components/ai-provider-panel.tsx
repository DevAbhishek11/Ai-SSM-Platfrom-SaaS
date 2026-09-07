import type { AiRouterStatus } from "@ssm/domain";
import { Cpu } from "lucide-react";

function reachabilityLabel(reachable: AiRouterStatus["providers"][number]["reachable"]): string {
  if (reachable === "yes") {
    return "reachable";
  }
  if (reachable === "no") {
    return "unreachable";
  }
  return "not probed";
}

export function AiProviderPanel({ status }: { status: AiRouterStatus }) {
  const chain = status.priority.join(" → ");

  return (
    <section className="card p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
          <Cpu size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Model routing</h3>
          <p className="text-sm text-[var(--muted)]">
            Providers activate from the keys present in the environment. Ollama, Claude, and OpenAI are
            tried in order, with a deterministic local composer as the guaranteed fallback.
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-md border border-[var(--border)] p-3">
          <dt className="text-xs text-[var(--muted)]">Mode</dt>
          <dd className="mt-1 font-semibold">{status.mode}</dd>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <dt className="text-xs text-[var(--muted)]">Active</dt>
          <dd className="mt-1 font-semibold">{status.activeProvider}</dd>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <dt className="text-xs text-[var(--muted)]">Fallback</dt>
          <dd className="mt-1 font-semibold">{status.fallbackProvider}</dd>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <dt className="text-xs text-[var(--muted)]">Timeout</dt>
          <dd className="mt-1 font-semibold">{Math.round(status.timeoutMs / 1000)}s</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-[var(--muted)]">Routing chain: {chain}</p>

      <ul className="mt-4 grid gap-3">
        {status.providers.map((provider) => (
          <li
            key={provider.provider}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-soft)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{provider.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {provider.model}
                  {provider.baseUrl ? ` / ${provider.baseUrl}` : ""} / {reachabilityLabel(provider.reachable)}
                </p>
              </div>
              <span className={provider.configured ? "badge badge-success" : "badge"}>
                {provider.configured ? "configured" : "inactive"}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {provider.credentialSource === "none"
                ? "No credentials required."
                : `Credential: ${provider.credentialSource}`}{" "}
              {provider.notes}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
