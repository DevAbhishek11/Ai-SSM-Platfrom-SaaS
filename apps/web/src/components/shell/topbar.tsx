"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export type TopbarNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export function Topbar({
  title,
  description,
  breadcrumb,
  actions,
  notifications,
  user,
  onOpenMobileNav
}: {
  title: string;
  description?: string;
  breadcrumb: string[];
  actions?: React.ReactNode;
  notifications: TopbarNotification[];
  user: { name: string; email: string; role: string; initials: string };
  onOpenMobileNav: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!bellRef.current?.contains(event.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [bellOpen]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-blur)] backdrop-blur">
        <div className="flex items-center gap-2.5 px-4 py-2.5 md:px-6">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-xs)] lg:hidden"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb" className="hidden text-xs text-[var(--muted)] sm:block">
              <ol className="flex items-center gap-1.5">
                {breadcrumb.map((crumb, index) => (
                  <li key={crumb} className="flex items-center gap-1.5">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    <span>{crumb}</span>
                  </li>
                ))}
              </ol>
            </nav>
            <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight md:text-lg">
              {title}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel)] px-3 text-sm text-[var(--muted)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)] lg:flex"
          >
            <Search size={15} aria-hidden="true" />
            <span>Search or jump to…</span>
            <kbd className="kbd ml-auto">⌘K</kbd>
          </button>

          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen((value) => !value)}
              aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
              aria-expanded={bellOpen}
              className="relative grid size-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            >
              <Bell size={16} aria-hidden="true" />
              {unread > 0 ? (
                <span className="pulse-ring absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </button>

            {bellOpen ? (
              <div className="animate-in absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-pop)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className="text-xs text-[var(--muted)]">{unread} unread</span>
                </div>
                <ul className="scroll-thin max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                      You are all caught up.
                    </li>
                  ) : (
                    notifications.slice(0, 6).map((notification) => (
                      <li
                        key={notification.id}
                        className="border-b border-[var(--border)] px-4 py-3 last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          {!notification.read ? (
                            <span
                              aria-hidden="true"
                              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                            />
                          ) : (
                            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                              {notification.body}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                <Link
                  href="/approvals"
                  onClick={() => setBellOpen(false)}
                  className="block border-t border-[var(--border)] px-4 py-2.5 text-center text-xs font-medium text-[var(--accent)] hover:bg-[var(--panel-soft)]"
                >
                  Open review queue
                </Link>
              </div>
            ) : null}
          </div>

          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} role={user.role} initials={user.initials} />
        </div>

        {(description || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-2 md:px-6">
            {description ? (
              <p className="max-w-3xl text-sm text-[var(--muted)]">{description}</p>
            ) : (
              <span />
            )}
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        )}
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
