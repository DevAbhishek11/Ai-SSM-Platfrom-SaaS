import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { authorizedFetch, getSession, initialsFor } from "@/lib/session";
import { findNavItem } from "@/lib/navigation";
import { ShellFrame } from "./shell-frame";
import type { TopbarNotification } from "./topbar";

async function loadNotifications(): Promise<TopbarNotification[]> {
  try {
    const response = await authorizedFetch("/notifications");
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as TopbarNotification[];
    return Array.isArray(payload) ? payload : [];
  } catch {
    // A degraded notification feed must never take down the dashboard shell.
    return [];
  }
}

/**
 * Authenticated application shell.
 *
 * Every dashboard page renders inside this component, which resolves the
 * session server-side and hands the presentation layer only what it needs.
 */
export async function AppShell({
  title,
  description,
  actions,
  activePath,
  children
}: Readonly<{
  title: string;
  description?: string;
  actions?: ReactNode;
  activePath: string;
  children: ReactNode;
}>) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const notifications = await loadNotifications();
  const navItem = findNavItem(activePath);
  const breadcrumb = [session.workspace.workspaceName, navItem?.label ?? title];

  return (
    <ShellFrame
      title={title}
      description={description}
      breadcrumb={breadcrumb}
      actions={actions}
      permissions={session.permissions}
      workspaces={session.user.memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspaceName,
        role: membership.role
      }))}
      activeWorkspaceId={session.workspace.workspaceId}
      notifications={notifications}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.role,
        initials: initialsFor(session.user.name)
      }}
    >
      {children}
    </ShellFrame>
  );
}
