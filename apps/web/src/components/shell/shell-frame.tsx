"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { emptySequence, matchShortcut, type SequenceState } from "@/lib/shortcuts";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "./command-palette";
import { ShortcutHelp } from "./shortcut-help";
import { SidebarNav } from "./sidebar-nav";
import { Topbar, type TopbarNotification } from "./topbar";
import type { WorkspaceOption } from "./workspace-switcher";

/** Where each navigation shortcut goes. */
const shortcutRoutes: Record<string, string> = {
  "goto-dashboard": "/",
  "goto-composer": "/composer",
  "goto-calendar": "/calendar",
  "goto-analytics": "/analytics",
  "goto-approvals": "/approvals",
  "goto-settings": "/settings",
  "new-post": "/composer"
};

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
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const sequence = useRef<SequenceState>(emptySequence);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  /**
   * One global key handler for the whole shell.
   *
   * Matching is delegated to `lib/shortcuts`, which knows not to fire while the
   * user is typing and how to assemble `g` `c` style sequences.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const match = matchShortcut(event, {
        sequence: sequence.current,
        target: event.target as HTMLElement | null
      });
      sequence.current = match.sequence;

      if (!match.shortcut) return;
      event.preventDefault();

      switch (match.shortcut.id) {
        case "open-search":
          setPaletteOpen((value) => !value);
          return;
        case "show-help":
          setHelpOpen((value) => !value);
          return;
        case "close":
          setPaletteOpen(false);
          setHelpOpen(false);
          return;
        default: {
          const target = shortcutRoutes[match.shortcut.id];
          if (target) router.push(target as Route);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
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
            onOpenSearch={() => setPaletteOpen(true)}
          />
          {/* Capped measure keeps line lengths readable on ultrawide displays. */}
          <main id="main-content" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 md:px-6 md:py-6">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-2 text-xs text-[var(--muted)] md:px-6">
            <div className="hairline flex flex-wrap items-center justify-between gap-2 pt-3">
              <span>
                Workspace data is scoped to your active membership; every action is written to the
                audit log.
              </span>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="chip"
                aria-label="Show keyboard shortcuts"
              >
                Press ? for shortcuts
              </button>
            </div>
          </footer>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </ToastProvider>
  );
}
