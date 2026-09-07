import { describe, expect, it } from "vitest";
import { formatCompactNumber, formatDate, formatPercent, formatRelativeTime, formatTime } from "./format";

describe("format helpers", () => {
  it("formats compact metrics and percentages for dashboards", () => {
    expect(formatCompactNumber(154200)).toBe("154.2K");
    expect(formatPercent(0.084)).toBe("8.4%");
  });

  it("renders timestamps in a fixed zone so SSR and the browser agree", () => {
    // Any TZ-dependent output here would reintroduce the hydration mismatch.
    expect(formatTime("2026-06-11T05:45:00.000Z")).toBe("Jun 11, 5:45 AM");
    expect(formatDate("2026-06-11T05:45:00.000Z")).toBe("Jun 11, 2026");
  });

  it("degrades gracefully for missing and invalid input", () => {
    expect(formatTime(undefined)).toBe("Not scheduled");
    expect(formatTime("not-a-date")).toBe("Unknown");
    expect(formatDate(undefined)).toBe("—");
  });

  it("describes relative time against a fixed reference point", () => {
    const now = Date.parse("2026-06-11T06:00:00.000Z");
    expect(formatRelativeTime("2026-06-11T05:45:00.000Z", now)).toBe("15 minutes ago");
    expect(formatRelativeTime("2026-06-12T06:00:00.000Z", now)).toBe("tomorrow");
  });
});
