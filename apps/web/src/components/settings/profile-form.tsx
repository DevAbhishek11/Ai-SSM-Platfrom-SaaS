"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { updateProfile, type AccountFormState } from "@/app/(dashboard)/account-actions";

const initialState: AccountFormState = {};

const timezones = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney"
];

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "hi", label: "हिन्दी" }
];

export function ProfileForm({
  name,
  email,
  timezone,
  language
}: {
  name: string;
  email: string;
  timezone: string;
  language: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const timezoneOptions = timezones.includes(timezone) ? timezones : [timezone, ...timezones];

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
      {state.success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]"
        >
          <CheckCircle2 size={15} aria-hidden="true" />
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="profile-name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="profile-name"
            name="name"
            defaultValue={name}
            autoComplete="name"
            required
            aria-invalid={Boolean(state.fieldErrors?.name)}
            className="field"
          />
          {state.fieldErrors?.name ? (
            <p className="text-xs text-[var(--danger)]">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="profile-email" className="text-sm font-medium">
            Work email
          </label>
          <input
            id="profile-email"
            defaultValue={email}
            disabled
            className="field opacity-70"
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="text-xs text-[var(--muted)]">
            Contact an owner to change the address on this account.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="profile-timezone" className="text-sm font-medium">
            Timezone
          </label>
          <select id="profile-timezone" name="timezone" defaultValue={timezone} className="field">
            {timezoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="profile-language" className="text-sm font-medium">
            Language
          </label>
          <select id="profile-language" name="language" defaultValue={language} className="field">
            {languages.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          {pending ? "Saving" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
