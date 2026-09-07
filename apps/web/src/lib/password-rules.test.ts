import { describe, expect, it } from "vitest";
import { firstUnmetPasswordRule, passwordRules } from "./password-rules";

describe("password policy", () => {
  it("mirrors the three rules enforced by the API", () => {
    expect(passwordRules.map((rule) => rule.id)).toEqual(["length", "letter", "entropy"]);
  });

  it("reports the first unmet rule", () => {
    expect(firstUnmetPasswordRule("short")?.id).toBe("length");
    expect(firstUnmetPasswordRule("1234567890")?.id).toBe("letter");
    expect(firstUnmetPasswordRule("abcdefghij")?.id).toBe("entropy");
  });

  it("accepts passwords that satisfy every rule", () => {
    expect(firstUnmetPasswordRule("correct-horse-9")).toBeUndefined();
    expect(firstUnmetPasswordRule("demo-password-change-me")).toBeUndefined();
  });
});
