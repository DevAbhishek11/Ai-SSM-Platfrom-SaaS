/**
 * Streaming fallback for the dashboard segments.
 *
 * Mirrors the real layout's rhythm (header block, KPI row, two-column body) so
 * the page does not visibly jump when the data resolves.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="skeleton h-24 w-full rounded-[var(--radius-lg)]" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="skeleton h-80 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-80 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
