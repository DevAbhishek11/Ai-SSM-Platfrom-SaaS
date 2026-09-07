import type { Metadata } from "next";
import { Info } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · AI SSM Platform"
};

const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;

/** Human-readable explanations for the redirects that land people here. */
const reasons: Record<string, string> = {
  "password-changed": "Password updated. Sign in again with your new password.",
  "signed-out": "You have been signed out on this device.",
  "session-expired": "Your session expired. Sign in again to continue."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;
  const notice = reason ? reasons[reason] : undefined;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)] lg:hidden">
          AI SSM Platform
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-[var(--muted)]">
          Sign in to your workspace to plan, approve, and publish.
        </p>
      </header>

      {notice ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2.5 text-sm text-[var(--accent-strong)]"
        >
          <Info size={15} aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      <LoginForm next={next} demoEmail={demoEmail} />

      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-xs text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)]">Demo workspace</p>
        <p className="mt-1">
          <code>owner@acmegrowth.test</code> · <code>demo-password-change-me</code>
        </p>
      </div>
    </div>
  );
}
