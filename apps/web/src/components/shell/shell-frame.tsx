"use client";

import { useCallback, useState, type ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { Topbar, type TopbarNotification } from "./topbar";
import type { WorkspaceOption } from "./workspace-switcher";

export function ShellFrame({
  title,
  description,
  breadcrumb,
  actions,
  permissions,
  workspaces,
  activeWorkspaceId,
  notifications,
  user,
  children
}: {
  title: string;
  description?: string;
  breadcrumb: string[];
  actions?: ReactNode;
  permissions: string[];
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  notifications: TopbarNotification[];
  user: { name: string; email: string; role: string; initials: string };
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <SidebarNav
        permissions={permissions}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        mobileOpen={mobileNavOpen}
        onCloseMobile={closeMobileNav}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          actions={actions}
          notifications={notifications}
          user={user}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main id="main-content" className="flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] md:px-6">
          AI SSM Platform · workspace data is scoped to your active membership and every action is
          written to the audit log.
        </footer>
      </div>
    </div>
  );
}
