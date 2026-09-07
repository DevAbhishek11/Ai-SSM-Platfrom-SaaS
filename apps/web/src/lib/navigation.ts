import type { Route } from "next";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  Library,
  Megaphone,
  Settings,
  Sparkles,
  Users,
  type LucideIcon
} from "lucide-react";

export type NavItem = {
  label: string;
  href: Route;
  icon: LucideIcon;
  description: string;
  /** Permission required to see the entry; omitted entries are always visible. */
  permission?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        description: "Workspace health, activation, and live alerts"
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        description: "Performance, listening, and executive reporting",
        permission: "analytics.view"
      }
    ]
  },
  {
    label: "Create",
    items: [
      {
        label: "AI Studio",
        href: "/ai-studio",
        icon: Sparkles,
        description: "Generate on-brand variants with model routing",
        permission: "ai.generate"
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        description: "Campaign portfolio, templates, and smart slots",
        permission: "posts.view"
      },
      {
        label: "Media",
        href: "/media",
        icon: Library,
        description: "Asset library and processing pipeline",
        permission: "media.manage"
      }
    ]
  },
  {
    label: "Deliver",
    items: [
      {
        label: "Approvals",
        href: "/approvals",
        icon: CheckCircle2,
        description: "Review queue, comments, and SLA tracking",
        permission: "posts.view"
      },
      {
        label: "Publishing",
        href: "/publishing",
        icon: Megaphone,
        description: "Queue, idempotency, and retry visibility",
        permission: "posts.view"
      }
    ]
  },
  {
    label: "Manage",
    items: [
      {
        label: "Accounts",
        href: "/accounts",
        icon: Users,
        description: "Connected networks, scopes, and rate limits",
        permission: "social_accounts.manage"
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Security, billing, team, and integrations"
      }
    ]
  }
];

export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items);

export function visibleGroups(permissions: string[]): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || permissions.includes(item.permission))
    }))
    .filter((group) => group.items.length > 0);
}

export function findNavItem(pathname: string): NavItem | undefined {
  const exact = allNavItems.find((item) => item.href === pathname);
  if (exact) {
    return exact;
  }

  return allNavItems
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
