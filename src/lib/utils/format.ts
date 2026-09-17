/**
 * Formatting helpers.
 *
 * `Intl` formatters are comparatively expensive to construct, so they are
 * created once at module scope and reused rather than instantiated per render.
 *
 * Every formatter is pinned to an explicit locale and UTC. Without that, the
 * server would format in the container's locale and the client in the viewer's,
 * producing different strings for the same value and a hydration mismatch.
 */

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyPreciseFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export const formatCurrency = (value: number): string =>
  currencyFormatter.format(value);

export const formatCurrencyPrecise = (value: number): string =>
  currencyPreciseFormatter.format(value);

export const formatCompactCurrency = (value: number): string =>
  `$${compactFormatter.format(value)}`;

export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

export const formatDate = (iso: string): string =>
  dateFormatter.format(new Date(iso));

export const formatDateTime = (iso: string): string =>
  dateTimeFormatter.format(new Date(iso));

export const formatShortDate = (iso: string): string =>
  shortDateFormatter.format(new Date(iso));

/** Fractions in, display percentage out: 0.0425 → "4.25%" */
export const formatPercent = (fraction: number, digits = 2): string =>
  `${(fraction * 100).toFixed(digits)}%`;

/** Already-a-percentage in, signed string out: 12.4 → "+12.4%" */
export const formatDelta = (deltaPct: number): string =>
  `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;

/**
 * Relative time for the activity feed.
 *
 * Rendered on the client only (see ActivityFeed) — a server-rendered "2 minutes
 * ago" is stale the moment it reaches the browser and would mismatch on
 * hydration.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(iso);
}

/** Minimal class-name joiner — avoids pulling in `clsx` for this one use. */
export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(" ");
