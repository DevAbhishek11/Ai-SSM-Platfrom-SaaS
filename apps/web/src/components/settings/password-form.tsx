"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { changePassword, type AccountFormState } from "@/app/(dashboard)/account-actions";
import { passwordRules as rules } from "@/lib/password-rules";

const initialState: AccountFormState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const satisfied = rules.filter((rule) => rule.test(password)).length;

  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          <AlertCircle size={15} aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <label htmlFor="currentPassword" className="text-sm font-medium">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
            className="field"
          />
          {state.fieldErrors?.currentPassword ? (
            <p className="text-xs text-[var(--danger)]">{state.fieldErrors.currentPassword}</p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium">
            New password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.newPassword)}
              className="field pr-10"
            />
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
          {state.fieldErrors?.newPassword ? (
            <p className="text-xs text-[var(--danger)]">{state.fieldErrors.newPassword}</p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
            className="field"
          />
          {state.fieldErrors?.confirmPassword ? (
            <p className="text-xs text-[var(--danger)]">{state.fieldErrors.confirmPassword}</p>
          ) : null}
        </div>
      </div>

      <ul className="grid gap-1 text-xs text-[var(--muted)]" aria-live="polite">
        {rules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-1.5">
              {ok ? (
                <Check size={13} className="text-[var(--success)]" aria-hidden="true" />
              ) : (
                <X size={13} aria-hidden="true" />
              )}
              <span className={ok ? "text-[var(--success)]" : undefined}>{rule.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || satisfied < rules.length}>
          {pending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound size={15} aria-hidden="true" />
          )}
          {pending ? "Updating" : "Change password"}
        </button>
        <p className="text-xs text-[var(--muted)]">
          Every active session is signed out, so you will be asked to log in again.
        </p>
      </div>
    </form>
  );
}
