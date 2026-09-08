import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Shared presentation for every terminal failure screen.
 *
 * Keeping one component means an error page can never drift into looking like
 * a crash: same card, same tone, always an action the user can actually take.
 */
export function ErrorState({
  eyebrow,
  title,
  description,
  digest,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  digest?: string;
  children?: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center"
    >
      <span className="grid size-12 place-items-center rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]">
        <AlertTriangle size={22} aria-hidden="true" />
      </span>

      <p className="eyebrow mt-5 text-[var(--muted)]">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>

      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}

      {digest ? (
        <p className="mt-6 text-xs text-[var(--muted)]">
          Reference <code className="kbd">{digest}</code> when contacting support.
        </p>
      ) : null}
    </main>
  );
}
