import { describe, expect, it } from "vitest";
import {
  csvFileName,
  escapeCsvValue,
  filterRows,
  paginate,
  sortRows,
  toCsv,
  toggleSort
} from "./table";

type Row = {
  name: string;
  count: number;
  scheduledAt: string | null;
  active: boolean;
};

const rows: Row[] = [
  { name: "Beta", count: 10, scheduledAt: "2026-02-01T00:00:00.000Z", active: true },
  { name: "alpha", count: 9, scheduledAt: "2026-01-01T00:00:00.000Z", active: false },
  { name: "Gamma", count: 2, scheduledAt: null, active: true }
];

describe("filterRows", () => {
  it("returns everything for an empty query", () => {
    expect(filterRows(rows, "   ")).toHaveLength(3);
  });

  it("matches case-insensitively across all columns by default", () => {
    expect(filterRows(rows, "ALPHA").map((row) => row.name)).toEqual(["alpha"]);
  });

  it("matches numeric columns as text", () => {
    expect(filterRows(rows, "10")).toHaveLength(1);
  });

  it("restricts matching to the named columns", () => {
    expect(filterRows(rows, "10", ["name"])).toHaveLength(0);
  });
});

describe("sortRows", () => {
  it("returns a copy when no sort is applied", () => {
    const result = sortRows(rows);
    expect(result).not.toBe(rows);
    expect(result).toEqual(rows);
  });

  it("sorts numbers numerically rather than lexically", () => {
    const numeric = [{ n: 9 }, { n: 10 }, { n: 2 }];
    expect(sortRows(numeric, { column: "n", direction: "asc" }).map((row) => row.n)).toEqual([
      2, 9, 10
    ]);
  });

  it("sorts strings without regard to case", () => {
    expect(sortRows(rows, { column: "name", direction: "asc" }).map((row) => row.name)).toEqual([
      "alpha",
      "Beta",
      "Gamma"
    ]);
  });

  it("reverses on descending", () => {
    expect(sortRows(rows, { column: "count", direction: "desc" }).map((row) => row.count)).toEqual([
      10, 9, 2
    ]);
  });

  it("keeps empty values at the bottom in both directions", () => {
    const asc = sortRows(rows, { column: "scheduledAt", direction: "asc" });
    const desc = sortRows(rows, { column: "scheduledAt", direction: "desc" });

    expect(asc.at(-1)?.name).toBe("Gamma");
    expect(desc.at(-1)?.name).toBe("Gamma");
  });

  it("is stable for equal values", () => {
    const tied = [
      { id: "a", group: 1 },
      { id: "b", group: 1 },
      { id: "c", group: 1 }
    ];

    expect(sortRows(tied, { column: "group", direction: "desc" }).map((row) => row.id)).toEqual([
      "a",
      "b",
      "c"
    ]);
  });

  it("sorts booleans false-first ascending", () => {
    expect(sortRows(rows, { column: "active", direction: "asc" }).map((row) => row.active)).toEqual([
      false,
      true,
      true
    ]);
  });

  it("does not mutate the input", () => {
    const input = [...rows];
    sortRows(input, { column: "name", direction: "desc" });
    expect(input.map((row) => row.name)).toEqual(["Beta", "alpha", "Gamma"]);
  });
});

describe("paginate", () => {
  const many = Array.from({ length: 12 }, (_, index) => ({ index }));

  it("slices the requested page and reports the range", () => {
    const result = paginate(many, { page: 2, pageSize: 5 });

    expect(result.rows.map((row) => row.index)).toEqual([5, 6, 7, 8, 9]);
    expect(result).toMatchObject({ page: 2, totalPages: 3, from: 6, to: 10, totalRows: 12 });
  });

  it("clamps a page past the end so the table is never blank", () => {
    expect(paginate(many, { page: 99, pageSize: 5 }).page).toBe(3);
  });

  it("clamps a page below one", () => {
    expect(paginate(many, { page: 0, pageSize: 5 }).page).toBe(1);
  });

  it("handles an empty data set without dividing by zero", () => {
    const result = paginate([], { page: 1, pageSize: 10 });

    expect(result).toMatchObject({ totalPages: 1, from: 0, to: 0, hasNext: false, hasPrevious: false });
  });

  it("guards against a zero or fractional page size", () => {
    expect(paginate(many, { page: 1, pageSize: 0 }).pageSize).toBe(1);
    expect(paginate(many, { page: 1, pageSize: 2.7 }).pageSize).toBe(2);
  });

  it("reports a short final page correctly", () => {
    const result = paginate(many, { page: 3, pageSize: 5 });
    expect(result).toMatchObject({ from: 11, to: 12, hasNext: false, hasPrevious: true });
  });
});

describe("toggleSort", () => {
  it("starts ascending on a new column", () => {
    expect(toggleSort<Row>(undefined, "name")).toEqual({ column: "name", direction: "asc" });
  });

  it("flips direction on the active column", () => {
    expect(toggleSort<Row>({ column: "name", direction: "asc" }, "name")).toEqual({
      column: "name",
      direction: "desc"
    });
  });

  it("resets to ascending when switching columns", () => {
    expect(toggleSort<Row>({ column: "name", direction: "desc" }, "count")).toEqual({
      column: "count",
      direction: "asc"
    });
  });
});

describe("escapeCsvValue", () => {
  it("leaves a plain value alone", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
  });

  it("quotes and doubles embedded quotes", () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes values containing a comma or newline", () => {
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue("a\nb")).toBe('"a\nb"');
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(escapeCsvValue("=1+1")).toBe("'=1+1");
    expect(escapeCsvValue("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(escapeCsvValue("-2")).toBe("'-2");
    expect(escapeCsvValue("@import")).toBe("'@import");
  });

  it("quotes a formula that also contains a comma", () => {
    expect(escapeCsvValue("=HYPERLINK(a,b)")).toBe('"\'=HYPERLINK(a,b)"');
  });

  it("renders empty for null and undefined", () => {
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    const csv = toCsv(rows, [
      { key: "name", header: "Name" },
      { key: "count", header: "Count" }
    ]);

    expect(csv.split("\r\n")).toEqual(["Name,Count", "Beta,10", "alpha,9", "Gamma,2"]);
  });

  it("emits only the header for no rows", () => {
    expect(toCsv([] as Row[], [{ key: "name", header: "Name" }])).toBe("Name");
  });
});

describe("csvFileName", () => {
  it("slugifies the base and appends the date", () => {
    expect(csvFileName("Publishing Queue", new Date("2026-09-07T10:00:00Z"))).toBe(
      "publishing-queue-2026-09-07.csv"
    );
  });

  it("falls back to a generic name when the base has no usable characters", () => {
    expect(csvFileName("!!!", new Date("2026-09-07T10:00:00Z"))).toBe("export-2026-09-07.csv");
  });
});
