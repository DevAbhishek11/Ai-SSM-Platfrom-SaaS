"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, type AuthFormState } from "@/app/(auth)/actions";

const initialState: AuthFormState = {};

export function LoginForm({ next, demoEmail }: { next?: string; demoEmail?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={demoEmail}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className="field"
          placeholder="you@company.com"
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <span className="text-xs text-[var(--muted)]">Forgot? Contact your workspace owner</span>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
            className="field pr-11"
            placeholder="••••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
        {state.fieldErrors?.password ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      <button type="submit" className="btn-primary h-11 justify-center" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        New to the platform?{" "}
        <Link href="/register" className="font-medium text-[var(--accent)] hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
