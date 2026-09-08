import { describe, expect, it } from "vitest";
import {
  deltaTone,
  describeAnomaly,
  formatDelta,
  hourLabel,
  insightsQueryString,
  presetRange,
  slotLabel,
  weekdayLabel,
  type Anomaly
} from "./insights";

describe("presetRange", () => {
  it("ends on today and counts inclusively", () => {
    const range = presetRange(7, new Date("2026-06-10T18:00:00.000Z"));
    expect(range).toEqual({ from: "2026-06-04", to: "2026-06-10" });
  });

  it("collapses to a single day", () => {
    const range = presetRange(1, new Date("2026-06-10T00:00:00.000Z"));
    expect(range).toEqual({ from: "2026-06-10", to: "2026-06-10" });
  });

  it("crosses a month boundary", () => {
    const range = presetRange(3, new Date("2026-03-02T09:00:00.000Z"));
    expect(range).toEqual({ from: "2026-02-28", to: "2026-03-02" });
  });

  it("treats a nonsensical span as one day rather than inverting the range", () => {
    const range = presetRange(0, new Date("2026-06-10T00:00:00.000Z"));
    expect(range.from).toBe(range.to);
  });
});

describe("insightsQueryString", () => {
  it("omits unset fields", () => {
    expect(insightsQueryString({ from: "2026-06-01", platform: undefined })).toBe(
      "?from=2026-06-01"
    );
  });

  it("drops empty strings so a cleared filter does not become platform=", () => {
    expect(insightsQueryString({ platform: "" })).toBe("");
  });

  it("returns an empty string when nothing is set", () => {
    expect(insightsQueryString({})).toBe("");
  });

  it("encodes a time zone slash", () => {
    expect(insightsQueryString({ timeZone: "Asia/Kolkata" })).toContain("Asia%2FKolkata");
  });

  it("keeps a zero limit out rather than sending limit=0", () => {
    expect(insightsQueryString({ limit: 0 })).toBe("?limit=0");
  });
});

describe("formatDelta", () => {
  it("signs a gain", () => {
    expect(formatDelta(0.128)).toBe("+12.8%");
  });

  it("signs a loss", () => {
    expect(formatDelta(-0.042)).toBe("-4.2%");
  });

  it("says New when there was no baseline", () => {
    // Not "+Infinity%", and not a fabricated "+100%".
    expect(formatDelta(null)).toBe("New");
  });

  it("renders no change without a sign", () => {
    expect(formatDelta(0)).toBe("0.0%");
  });
});

describe("deltaTone", () => {
  it("paints growth as up by default", () => {
    expect(deltaTone("up")).toBe("up");
  });

  it("inverts when lower is better", () => {
    // A falling cost per conversion is good news and must not render red.
    expect(deltaTone("up", { lowerIsBetter: true })).toBe("down");
    expect(deltaTone("down", { lowerIsBetter: true })).toBe("up");
  });

  it("leaves flat alone in both modes", () => {
    expect(deltaTone("flat")).toBe("flat");
    expect(deltaTone("flat", { lowerIsBetter: true })).toBe("flat");
  });
});

describe("hourLabel", () => {
  it("renders midnight as 12am", () => {
    expect(hourLabel(0)).toBe("12am");
  });

  it("renders noon as 12pm", () => {
    expect(hourLabel(12)).toBe("12pm");
  });

  it("renders morning and afternoon hours", () => {
    expect(hourLabel(9)).toBe("9am");
    expect(hourLabel(13)).toBe("1pm");
    expect(hourLabel(23)).toBe("11pm");
  });

  it("wraps an out-of-range hour instead of printing nonsense", () => {
    expect(hourLabel(24)).toBe("12am");
    expect(hourLabel(-1)).toBe("11pm");
  });
});

describe("weekdayLabel", () => {
  it("abbreviates by default", () => {
    expect(weekdayLabel(2)).toBe("Tue");
  });

  it("spells out the long form", () => {
    expect(weekdayLabel(0, "long")).toBe("Sunday");
  });

  it("returns an empty string for an unknown index", () => {
    expect(weekdayLabel(9)).toBe("");
  });
});

describe("slotLabel", () => {
  it("reads the way a recommendation is spoken", () => {
    expect(slotLabel({ weekday: 2, hour: 9 })).toBe("Tue 9am");
  });
});

describe("describeAnomaly", () => {
  const anomaly = (overrides: Partial<Anomaly>): Anomaly => ({
    date: "2026-06-05",
    metric: "engagements",
    value: 400,
    expected: 100,
    deviation: 3.1,
    kind: "spike",
    ...overrides
  });

  it("describes a spike as a percentage above the average", () => {
    // Nobody outside the team knows what 3.1 sigma means.
    expect(describeAnomaly(anomaly({}))).toBe("Engagements ran 300% above the recent average.");
  });

  it("describes a drop", () => {
    expect(describeAnomaly(anomaly({ value: 40, kind: "drop" }))).toBe(
      "Engagements ran 60% below the recent average."
    );
  });

  it("avoids dividing by a zero baseline", () => {
    expect(describeAnomaly(anomaly({ expected: 0 }))).toBe(
      "Engagements ran well above the recent average."
    );
  });

  it("uses the metric's display name", () => {
    expect(describeAnomaly(anomaly({ metric: "clicks" }))).toContain("Clicks");
  });
});
