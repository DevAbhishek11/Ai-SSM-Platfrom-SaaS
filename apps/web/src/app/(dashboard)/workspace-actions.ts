"use server";

import { revalidatePath } from "next/cache";
import { serverApiBaseUrl } from "@/lib/api";
import { persistTokens, readAccessToken } from "@/lib/session";

/**
 * Re-issues the session against another workspace membership. The API decides
 * whether the caller actually belongs to the target workspace, so a forged id
 * simply fails.
 */
export async function switchWorkspace(workspaceId: string): Promise<{ ok: boolean; message?: string }> {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    return { ok: false, message: "Session expired" };
  }

  const response = await fetch(`${serverApiBaseUrl}/auth/switch-workspace`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ workspaceId }),
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, message: "Unable to switch workspace" };
  }

  const tokens = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  await persistTokens(tokens);
  revalidatePath("/", "layout");
  return { ok: true };
}
