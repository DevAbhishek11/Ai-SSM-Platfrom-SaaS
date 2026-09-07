"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { firstUnmetPasswordRule } from "@/lib/password-rules";
import { authorizedFetch, clearTokens } from "@/lib/session";

export type AccountFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const readMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(". ");
    }
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
};

export async function updateProfile(
  _state: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const language = String(formData.get("language") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your full name";
  if (!timezone) fieldErrors.timezone = "Select a timezone";
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let response: Response;
  try {
    response = await authorizedFetch("/auth/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, timezone, language })
    });
  } catch {
    return { error: "Cannot reach the API right now. Try again shortly." };
  }

  if (!response.ok) {
    return { error: await readMessage(response, "Unable to update your profile.") };
  }

  revalidatePath("/", "layout");
  return { success: "Profile updated." };
}

/**
 * Changing a password revokes every session server-side, including this one, so
 * the local cookies are cleared and the user is bounced to a fresh sign-in.
 */
export async function changePassword(
  _state: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!currentPassword) fieldErrors.currentPassword = "Enter your current password";
  const failedRule = firstUnmetPasswordRule(newPassword);
  if (failedRule) fieldErrors.newPassword = failedRule.label;
  if (newPassword !== confirmPassword) fieldErrors.confirmPassword = "Passwords do not match";
  if (currentPassword && newPassword && currentPassword === newPassword) {
    fieldErrors.newPassword = "Choose a password you have not used before";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let response: Response;
  try {
    response = await authorizedFetch("/auth/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
  } catch {
    return { error: "Cannot reach the API right now. Try again shortly." };
  }

  if (!response.ok) {
    return { error: await readMessage(response, "Unable to change your password.") };
  }

  await clearTokens();
  redirect("/login?reason=password-changed");
}

export async function revokeSession(formData: FormData): Promise<void> {
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) {
    return;
  }

  const response = await authorizedFetch(`/auth/sessions/${encodeURIComponent(sessionId)}/revoke`, {
    method: "POST"
  });

  // Revoking the *current* session logs this browser out immediately.
  if (response.ok && formData.get("current") === "true") {
    await clearTokens();
    redirect("/login?reason=signed-out");
  }

  revalidatePath("/settings");
}
