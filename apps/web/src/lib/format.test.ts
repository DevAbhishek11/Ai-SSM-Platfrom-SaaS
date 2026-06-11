import { describe, expect, it } from "vitest";
import { formatCompactNumber, formatPercent } from "./format";

describe("format helpers", () => {
  it("formats compact metrics and percentages for dashboards", () => {
    expect(formatCompactNumber(154200)).toBe("154.2K");
    expect(formatPercent(0.084)).toBe("8.4%");
  });
});
