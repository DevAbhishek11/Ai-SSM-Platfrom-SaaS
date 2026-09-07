/**
 * Display formatting helpers.
 *
 * Everything is pinned to an explicit locale *and* time zone. Without a fixed
 * zone the server renders dates in the container's TZ and the browser renders
 * them in the visitor's, which produced React hydration mismatches on every
 * page that shows a timestamp.
 */
export const DISPLAY_LOCALE = "en-US";
export const DISPLAY_TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE ?? "UTC";

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatTime(value?: string): string {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE
  }).format(parsed);
}

export function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE
  }).format(parsed);
}

/** Compact "3 minutes ago" style label, stable across server and client. */
export function formatRelativeTime(value?: string, now: number = Date.now()): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  const deltaSeconds = Math.round((parsed.getTime() - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60]
  ];

  const formatter = new Intl.RelativeTimeFormat(DISPLAY_LOCALE, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds) {
      return formatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }

  return formatter.format(deltaSeconds, "second");
}
