import { describe, expect, it } from "vitest";
import { platforms, roles } from "@ssm/domain";
import { platformEnum, roleEnum } from "./schema.js";

describe("database enum coverage", () => {
  it("keeps Drizzle enums aligned with the shared domain", () => {
    expect(roleEnum.enumValues).toEqual(roles);
    expect(platformEnum.enumValues).toEqual(platforms);
  });
});
