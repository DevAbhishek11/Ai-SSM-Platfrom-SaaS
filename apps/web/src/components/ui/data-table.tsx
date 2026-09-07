"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import {
  csvFileName,
  filterRows,
  paginate,
  sortRows,
  toCsv,
  toggleSort,
  type SortState
} from "@/lib/table";

export type DataTableColumn<T> = {
  key: keyof T & string;
  header: string;
  /** Custom cell rendering; the raw value is still what sorting and CSV use. */
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right";
  className?: string;
};

export type DataTableProps<T extends Record<string, unknown>> = {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  getRowId: (row: T) => string;
  caption: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  exportName?: string;
  emptyState?: ReactNode;
  /** Renders a selection column and reports the chosen ids. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  toolbar?: ReactNode;
};

/**
 * Sortable, filterable, paginated table.
 *
 * All of the logic lives in `lib/table.ts`; this component is the renderer, so
 * the behaviour that is easy to get wrong is unit tested separately.
 */
export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  getRowId,
  caption,
  searchable = true,
  searchPlaceholder = "Filter…",
  pageSize = 10,
  exportName,
  emptyState,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  toolbar
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState<T> | undefined>();
  const [page, setPage] = useState(1);

  const searchableKeys = useMemo(() => columns.map((column) => column.key), [columns]);
  const filtered = useMemo(
    () => filterRows(rows, query, searchableKeys),
    [rows, query, searchableKeys]
  );
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort]);
  const view = useMemo(() => paginate(sorted, { page, pageSize }), [sorted, page, pageSize]);

  const pageIds = view.rows.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const togglePageSelection = () => {
    if (!onSelectionChange) return;
    onSelectionChange(
      allOnPageSelected
        ? selectedIds.filter((id) => !pageIds.includes(id))
        : [...new Set([...selectedIds, ...pageIds])]
    );
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id]
    );
  };

  const download = () => {
    // Exports the filtered and sorted set, not just the visible page: what the
    // user sees on screen is a window, what they mean by "export" is the result.
    const csv = toCsv(
      sorted,
      columns.map((column) => ({ key: column.key, header: column.header }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = csvFileName(exportName ?? caption);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-3">
      {(searchable || exportName || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable ? (
            <label className="relative flex-1 min-w-[180px]">
              <span className="sr-only">{`Filter ${caption}`}</span>
              <Search
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  // A filter that shrinks the result set must not strand the
                  // user on a page that no longer exists.
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] py-1.5 pl-8 pr-2 text-sm"
              />
            </label>
          ) : null}
          {toolbar}
          {exportName ? (
            <button type="button" onClick={download} className="btn-secondary">
              <Download size={14} aria-hidden="true" />
              Export CSV
            </button>
          ) : null}
        </div>
      )}

      <div className="data-table-wrap overflow-x-auto">
        <table className="data-table w-full">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className="w-9">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={togglePageSelection}
                    aria-label={`Select all rows on this page of ${caption}`}
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const active = sort?.column === column.key;
                const Icon = active && sort?.direction === "desc" ? ArrowDown : ArrowUp;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : "none"}
                    className={column.align === "right" ? "text-right" : undefined}
                  >
                    {column.sortable === false ? (
                      column.header
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSort((current) => toggleSort(current, column.key))}
                        className="inline-flex items-center gap-1 font-inherit"
                      >
                        {column.header}
                        <Icon
                          size={12}
                          aria-hidden="true"
                          className={active ? "opacity-100" : "opacity-25"}
                        />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-6 text-center text-sm text-[var(--muted)]">
                  {emptyState ?? (query ? `No matches for “${query}”.` : "Nothing here yet.")}
                </td>
              </tr>
            ) : (
              view.rows.map((row) => {
                const id = getRowId(row);
                return (
                  <tr key={id} data-selected={selectedIds.includes(id) || undefined}>
                    {selectable ? (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleRow(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={[column.align === "right" ? "text-right" : "", column.className ?? ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {view.totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            {view.from}–{view.to} of {view.totalRows}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-ghost"
              disabled={!view.hasPrevious}
              onClick={() => setPage(view.page - 1)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              <span className="sr-only">Previous page</span>
            </button>
            <span aria-live="polite">
              Page {view.page} of {view.totalPages}
            </span>
            <button
              type="button"
              className="btn-ghost"
              disabled={!view.hasNext}
              onClick={() => setPage(view.page + 1)}
            >
              <ChevronRight size={14} aria-hidden="true" />
              <span className="sr-only">Next page</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
