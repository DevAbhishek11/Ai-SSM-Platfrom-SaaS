import { describe, expect, it } from "vitest";
import { hasPermission, rolePermissions } from "./permissions.js";

describe("role permissions", () => {
  it("allows owners to manage billing but prevents viewers from editing posts", () => {
    expect(hasPermission("owner", "billing.manage")).toBe(true);
    expect(hasPermission("viewer", "posts.edit")).toBe(false);
  });

  it("keeps super admins mapped to the broadest permission set", () => {
    expect(rolePermissions.super_admin.length).toBeGreaterThan(rolePermissions.admin.length);
    expect(hasPermission("super_admin", "platform.manage")).toBe(true);
  });
});
