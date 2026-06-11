import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  Library,
  Megaphone,
  Sparkles,
  Users
} from "lucide-react";
import type { ReactNode } from "react";
import type { Workspace } from "@ssm/domain";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Publishing", href: "/publishing", icon: Megaphone },
  { label: "AI Studio", href: "/ai-studio", icon: Sparkles },
  { label: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Accounts", href: "/accounts", icon: Users },
  { label: "Assets", href: "/media", icon: Library },
  { label: "Settings", href: "/settings", icon: Users }
];

export function AppShell({
  workspace,
  children,
  activeItem = "Dashboard"
}: Readonly<{ workspace: Workspace; children: ReactNode; activeItem?: string }>) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--panel)] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--accent)]">AI SSM</p>
            <h1 className="mt-1 text-lg font-semibold">{workspace.name}</h1>
          </div>
          <button
            className="grid size-10 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] lg:hidden"
            aria-label="Open notifications"
          >
            <Bell size={18} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Primary" className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                item.label === activeItem
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]"
              }`}
              aria-current={item.label === activeItem ? "page" : undefined}
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(248,250,249,0.92)] px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">Workspace command center</p>
              <h2 className="text-xl font-semibold">Campaign operations</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm">
                Export report
              </button>
              <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]">
                New post
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
