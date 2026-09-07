/**
 * Password policy shared by the sign-up form, the change-password form, and the
 * server actions. The API enforces the same rules; this only gives fast,
 * inline feedback.
 */
export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "At least 10 characters", test: (value) => value.length >= 10 },
  { id: "letter", label: "Contains a letter", test: (value) => /[a-zA-Z]/.test(value) },
  {
    id: "entropy",
    label: "Contains a number or symbol",
    test: (value) => /[0-9]/.test(value) || /[^a-zA-Z0-9]/.test(value)
  }
];

/** First unmet rule, or `undefined` when the password satisfies the policy. */
export function firstUnmetPasswordRule(value: string): PasswordRule | undefined {
  return passwordRules.find((rule) => !rule.test(value));
}
