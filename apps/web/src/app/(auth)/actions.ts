"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { serverApiBaseUrl } from "@/lib/api";
import { firstUnmetPasswordRule } from "@/lib/password-rules";
import { clearTokens, persistTokens, readAccessToken, readRefreshToken } from "@/lib/session";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const readMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(". ");
    }
    return body.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
};

const safeNextPath = (value: FormDataEntryValue | null): Route => {
  const candidate = typeof value === "string" ? value : "";
  // Only same-origin, absolute-path redirects: no protocol-relative escapes.
  const safe = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
  return safe as Route;
};

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Email is required";
  if (!password) fieldErrors.password = "Password is required";
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let response: Response;
  try {
    response = await fetch(`${serverApiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    });
  } catch {
    return { error: "Cannot reach the API right now. Please try again in a moment." };
  }

  if (!response.ok) {
    return { error: await readMessage(response) };
  }

  const tokens = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  await persistTokens(tokens);
  redirect(next);
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Your name is required";
  if (!email) fieldErrors.email = "Email is required";
  const failedRule = firstUnmetPasswordRule(password);
  if (failedRule) fieldErrors.password = failedRule.label;
  if (password !== confirmPassword) fieldErrors.confirmPassword = "Passwords do not match";
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let response: Response;
  try {
    response = await fetch(`${serverApiBaseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name,
        workspaceName: workspaceName || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }),
      cache: "no-store"
    });
  } catch {
    return { error: "Cannot reach the API right now. Please try again in a moment." };
  }

  if (!response.ok) {
    return { error: await readMessage(response) };
  }

  const tokens = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  await persistTokens(tokens);
  redirect("/");
}

export async function signOut(): Promise<void> {
  const refreshToken = await readRefreshToken();
  const accessToken = await readAccessToken();

  try {
    await fetch(`${serverApiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store"
    });
  } catch {
    // Local cookies are cleared regardless so the browser session ends.
  }

  await clearTokens();
  redirect("/login");
}
