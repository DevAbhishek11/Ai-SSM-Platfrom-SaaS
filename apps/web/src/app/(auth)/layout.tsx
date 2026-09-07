import type { ReactNode } from "react";
import { BarChart3, CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";

const highlights = [
  {
    icon: Sparkles,
    title: "Multi-provider AI studio",
    body: "Ollama, Claude, and OpenAI behind one router with a local fallback that never goes down."
  },
  {
    icon: CalendarCheck,
    title: "Plan, approve, publish",
    body: "Smart scheduling, approval workflows, and retry-safe publishing across every network."
  },
  {
    icon: BarChart3,
    title: "Analytics and listening",
    body: "Cross-channel performance, share-of-voice, and exportable executive reporting."
  },
  {
    icon: ShieldCheck,
    title: "Enterprise controls",
    body: "RBAC, audit trails, SSO-ready identity, regional compliance, and scoped API keys."
  }
];

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[var(--sidebar)] px-10 py-12 text-[var(--sidebar-foreground)] lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 size-[26rem] rounded-full bg-[var(--accent)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-16 size-[22rem] rounded-full bg-[var(--accent-strong)] opacity-20 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)] text-lg font-bold text-white">
              S
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-soft)]">
                AI SSM
              </p>
              <p className="text-lg font-semibold">Social Management Platform</p>
            </div>
          </div>

          <h1 className="mt-12 max-w-md text-4xl font-semibold leading-tight">
            One workspace for planning, approving, and measuring every post.
          </h1>
          <p className="mt-4 max-w-md text-base text-[var(--sidebar-muted)]">
            Built for agencies and in-house teams that need AI speed without giving up governance.
          </p>
        </div>

        <ul className="relative mt-12 grid gap-5">
          {highlights.map((highlight) => (
            <li key={highlight.title} className="flex gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-[var(--accent-soft)]">
                <highlight.icon size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">{highlight.title}</p>
                <p className="text-sm text-[var(--sidebar-muted)]">{highlight.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative text-xs text-[var(--sidebar-muted)]">
          SOC 2-aligned controls · GDPR tooling · Audit trail on every action
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
