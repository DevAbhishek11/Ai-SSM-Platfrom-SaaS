"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, PanelLeftClose, X } from "lucide-react";
import { visibleGroups, type NavGroup } from "@/lib/navigation";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";

const COLLAPSE_KEY = "ssm:sidebar-collapsed";

export function SidebarNav({
  permissions,
  workspaces,
  activeWorkspaceId,
  mobileOpen,
  onCloseMobile
}: {
  permissions: string[];
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const groups: NavGroup[] = visibleGroups(permissions);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "true");
  }, []);

  useEffect(() => {
    onCloseMobile();
    // Navigating on mobile should always dismiss the drawer.
  }, [pathname, onCloseMobile]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      window.localStorage.setItem(COLLAPSE_KEY, String(!value));
      return !value;
    });
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      ) : null}

      <aside
        data-collapsed={collapsed}
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 data-[collapsed=true]:lg:w-[76px] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-base font-bold text-white">
              S
            </span>
            {!collapsed ? (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">AI SSM Platform</span>
                <span className="block truncate text-[11px] text-[var(--sidebar-muted)]">
                  Social command center
                </span>
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto grid size-9 place-items-center rounded-md text-[var(--sidebar-muted)] hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {!collapsed ? (
          <div className="px-3 pb-2">
            <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
          </div>
        ) : null}

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-1">
              {!collapsed ? (
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">
                  {group.label}
                </p>
              ) : (
                <div className="mx-2 my-3 h-px bg-white/10" />
              )}
              <ul className="grid gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-[var(--accent)] text-white shadow-sm"
                            : "text-[var(--sidebar-muted)] hover:bg-white/10 hover:text-white"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        <item.icon size={18} aria-hidden="true" className="shrink-0" />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden items-center gap-2 border-t border-white/10 px-4 py-3 text-xs font-medium text-[var(--sidebar-muted)] hover:text-white lg:flex"
        >
          {collapsed ? (
            <PanelLeftClose size={16} aria-hidden="true" />
          ) : (
            <ChevronsLeft size={16} aria-hidden="true" />
          )}
          {!collapsed ? "Collapse sidebar" : null}
        </button>
      </aside>
    </>
  );
}
