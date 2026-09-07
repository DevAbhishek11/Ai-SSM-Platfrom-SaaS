import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account · AI SSM Platform"
};

export default function RegisterPage() {
  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)] lg:hidden">
          AI SSM Platform
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-sm text-[var(--muted)]">
          You become the workspace owner and can invite your team right away.
        </p>
      </header>

      <RegisterForm />

      <p className="text-xs text-[var(--muted)]">
        By creating an account you agree to the acceptable use policy and the platform data
        processing terms.
      </p>
    </div>
  );
}
