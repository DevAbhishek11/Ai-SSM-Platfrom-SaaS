import type { MediaAsset } from "@ssm/domain";
import { formatCompactNumber } from "@/lib/format";

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Media library</h3>
          <p className="text-sm text-[var(--muted)]">Tagged assets ready for scheduled content.</p>
        </div>
        <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
          Upload
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {assets.map((asset) => (
          <article key={asset.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="aspect-[16/9] rounded-md bg-gradient-to-br from-teal-100 to-slate-100" />
            <p className="mt-3 truncate text-sm font-semibold">{asset.fileName}</p>
            <p className="mt-1 text-xs capitalize text-[var(--muted)]">
              {asset.assetType} · {formatCompactNumber(asset.fileSize)}B
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {asset.tags.map((tag) => (
                <span key={tag} className="rounded bg-white px-2 py-1 text-xs text-[var(--muted)]">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
