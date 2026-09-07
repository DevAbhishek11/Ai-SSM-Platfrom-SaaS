import { describe, expect, it } from "vitest";
import { allNavItems, findNavItem, navGroups, visibleGroups } from "./navigation";

describe("navigation model", () => {
  it("exposes every group item through allNavItems", () => {
    expect(allNavItems).toHaveLength(navGroups.reduce((total, group) => total + group.items.length, 0));
    expect(new Set(allNavItems.map((item) => item.href)).size).toBe(allNavItems.length);
  });

  it("hides entries the caller lacks permission for", () => {
    const viewerGroups = visibleGroups(["posts.view"]);
    const labels = viewerGroups.flatMap((group) => group.items.map((item) => item.label));

    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Calendar");
    expect(labels).toContain("Approvals");
    expect(labels).not.toContain("Analytics");
    expect(labels).not.toContain("AI Studio");
    expect(labels).not.toContain("Accounts");
  });

  it("drops groups that end up empty", () => {
    const groups = visibleGroups([]);
    expect(groups.map((group) => group.label)).toEqual(["Overview", "Manage"]);
    expect(groups.flatMap((group) => group.items.map((item) => item.href))).toEqual(["/", "/settings"]);
  });

  it("shows everything to an owner", () => {
    const ownerPermissions = [
      "analytics.view",
      "ai.generate",
      "posts.view",
      "media.manage",
      "social_accounts.manage"
    ];
    expect(visibleGroups(ownerPermissions).flatMap((group) => group.items)).toHaveLength(
      allNavItems.length
    );
  });

  it("resolves the active item for exact and nested paths", () => {
    expect(findNavItem("/")?.label).toBe("Dashboard");
    expect(findNavItem("/analytics")?.label).toBe("Analytics");
    expect(findNavItem("/settings/security")?.label).toBe("Settings");
    // "/" must not swallow unknown routes.
    expect(findNavItem("/unknown-route")).toBeUndefined();
  });
});
