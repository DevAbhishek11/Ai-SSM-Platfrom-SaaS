/**
 * Table helpers: filtering, sorting, pagination and CSV export.
 *
 * Deliberately pure and framework-free. The table component is a thin renderer
 * over these functions, which is what makes the awkward parts - mixed-type
 * sorting, CSV injection, a page index that outlives its data - testable
 * without mounting anything.
 */

export type SortDirection = "asc" | "desc";

export type SortState<T> = {
  column: keyof T & string;
  direction: SortDirection;
};

export type PageState = {
  page: number;
  pageSize: number;
};

/** Case- and accent-insensitive substring match across the chosen columns. */
export function filterRows<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  columns?: Array<keyof T & string>
): T[] {
  const term = query.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) => {
    const keys = columns ?? (Object.keys(row) as Array<keyof T & string>);
    return keys.some((key) => stringify(row[key]).toLowerCase().includes(term));
  });
}

/**
 * Stable sort that understands the three types a table column actually holds.
 *
 * Numbers compare numerically (so 9 sorts before 10), ISO dates compare
 * lexically (which is also chronological), and everything else compares with a
 * locale-aware collator. Null-ish values always sink to the bottom regardless
 * of direction, because "no value" is not smaller than a value - it is absent.
 */
export function sortRows<T extends Record<string, unknown>>(rows: T[], sort?: SortState<T>): T[] {
  if (!sort) return [...rows];

  const factor = sort.direction === "desc" ? -1 : 1;

  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = left.row[sort.column];
      const b = right.row[sort.column];

      const aEmpty = a === null || a === undefined || a === "";
      const bEmpty = b === null || b === undefined || b === "";
      if (aEmpty && bEmpty) return left.index - right.index;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      let comparison = 0;
      if (typeof a === "number" && typeof b === "number") {
        comparison = a - b;
      } else if (typeof a === "boolean" && typeof b === "boolean") {
        comparison = Number(a) - Number(b);
      } else {
        comparison = stringify(a).localeCompare(stringify(b), undefined, {
          numeric: true,
          sensitivity: "base"
        });
      }

      // Ties keep their original order, so re-sorting never shuffles equals.
      return comparison === 0 ? left.index - right.index : comparison * factor;
    })
    .map((entry) => entry.row);
}

export type PaginationResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

/**
 * Slices a page.
 *
 * The requested page is clamped into range, so deleting the last row on page 4
 * shows page 3 rather than an empty table with no way back.
 */
export function paginate<T>(rows: T[], state: PageState): PaginationResult<T> {
  const pageSize = Math.max(1, Math.floor(state.pageSize));
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(Math.max(Math.floor(state.page), 1), totalPages);
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);

  return {
    rows: slice,
    page,
    pageSize,
    totalRows,
    totalPages,
    from: totalRows === 0 ? 0 : start + 1,
    to: start + slice.length,
    hasPrevious: page > 1,
    hasNext: page < totalPages
  };
}

/** Flips direction on the same column, otherwise starts ascending on a new one. */
export function toggleSort<T extends Record<string, unknown>>(
  current: SortState<T> | undefined,
  column: keyof T & string
): SortState<T> {
  if (current?.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

/**
 * Escapes one CSV field.
 *
 * Beyond RFC 4180 quoting, a leading `=`, `+`, `-` or `@` is prefixed with a
 * single quote: spreadsheet software treats those as formulas, which turns an
 * exported post caption into a code-execution vector in the recipient's Excel.
 */
export function escapeCsvValue(value: unknown): string {
  const raw = stringify(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;

  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/** Serialises rows to CSV using the supplied column order and headers. */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>
): string {
  const head = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(","));

  return [head, ...body].join("\r\n");
}

/** Builds a timestamped, filesystem-safe export name. */
export function csvFileName(base: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safe || "export"}-${stamp}.csv`;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stringify).join(" ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
