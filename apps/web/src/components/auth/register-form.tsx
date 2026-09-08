"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { signUp, type AuthFormState } from "@/app/(auth)/actions";
import { passwordRules as rules } from "@/lib/password-rules";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [password, setPassword] = useState("");

  const satisfied = useMemo(() => rules.map((rule) => rule.test(password)), [password]);
  const strength = satisfied.filter(Boolean).length;

  return (
    <form action={formAction} className="grid gap-5" noValidate>
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
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input id="name" name="name" required autoComplete="name" className="field" placeholder="Ada Lovelace" />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          placeholder="you@company.com"
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="workspaceName" className="text-sm font-medium">
          Workspace name <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <input
          id="workspaceName"
          name="workspaceName"
          className="field"
          placeholder="Northwind Social"
          autoComplete="organization"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a strong password"
        />
        <div className="mt-1 flex gap-1" aria-hidden="true">
          {rules.map((rule, index) => (
            <span
              key={rule.label}
              className={`h-1 flex-1 rounded-full ${
                index < strength
                  ? strength === 3
                    ? "bg-[var(--success)]"
                    : "bg-[var(--warning)]"
                  : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>
        <ul className="mt-1 grid gap-1">
          {rules.map((rule, index) => (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs ${
                satisfied[index] ? "text-[var(--success)]" : "text-[var(--muted)]"
              }`}
            >
              <Check size={12} aria-hidden="true" />
              {rule.label}
            </li>
          ))}
        </ul>
        {state.fieldErrors?.password ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="field"
          placeholder="Re-enter your password"
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <button type="submit" className="btn-primary h-11 justify-center" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Creating your workspace…" : "Create account"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
