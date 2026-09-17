import { Card } from "@/components/ui/primitives";
import { cn, formatDelta } from "@/lib/utils/format";
import type { MetricSummary } from "@/types/domain";

/**
 * Server Component. Receives an already-formatted string rather than a raw
 * number plus a formatter function, because formatting stays on the server —
 * `Intl` never ships to the browser for this card.
 */

type Accent = "revenue" | "orders" | "customers" | "conversion";

/**
 * Colours and icon paths are looked up explicitly by a fixed key, not built
 * from an interpolated string — Tailwind's content scanner can only see class
 * names that appear literally in the source, so `bg-${accent}-100` would be
 * silently dropped from the production build.
 */
const ACCENT_STYLES: Record<Accent, { bg: string; fg: string; icon: string }> = {
  revenue: {
    bg: "color-mix(in srgb, var(--positive) 15%, transparent)",
    fg: "var(--positive)",
    icon: "M12 3v18M8 7.5h5.5a2.5 2.5 0 0 1 0 5H10a2.5 2.5 0 0 0 0 5h6",
  },
  orders: {
    bg: "color-mix(in srgb, var(--stat-blue) 15%, transparent)",
    fg: "var(--stat-blue)",
    icon: "M4 7h16l-1.5 10.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 7Zm3-3h10l1 3H6l1-3Z",
  },
  customers: {
    bg: "color-mix(in srgb, var(--stat-purple) 15%, transparent)",
    fg: "var(--stat-purple)",
    icon: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5 6-5s6 2 6 5M14 15.2c2.9.3 6 2.1 6 4.8",
  },
  conversion: {
    bg: "color-mix(in srgb, var(--stat-orange) 15%, transparent)",
    fg: "var(--stat-orange)",
    icon: "M4 17V9m5.5 8V5M15 17v-5m5.5 5V8",
  },
};

function AccentIcon({ accent }: { accent: Accent }) {
  const style = ACCENT_STYLES[accent];
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
      style={{ background: style.bg }}
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none">
        <path
          d={style.icon}
          stroke={style.fg}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function StatCard({
  label,
  formattedValue,
  metric,
  accent,
  /** Set when a rise is bad (e.g. refund rate). */
  invertDelta = false,
}: {
  label: string;
  formattedValue: string;
  metric: MetricSummary;
  accent: Accent;
  invertDelta?: boolean;
}) {
  const { deltaPct } = metric;
  const isFlat = deltaPct === null || deltaPct === 0;
  const isGood = deltaPct !== null && (invertDelta ? deltaPct < 0 : deltaPct > 0);

  return (
    <Card as="div" className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted">{label}</p>
        <AccentIcon accent={accent} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tnum">
        {formattedValue}
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-xs">
        {deltaPct === null ? (
          <span className="text-muted">No prior period</span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tnum",
                isFlat
                  ? "bg-surface-2 text-muted"
                  : isGood
                    ? "bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] text-positive"
                    : "bg-[color-mix(in_srgb,var(--negative)_14%,transparent)] text-negative",
              )}
            >
              {formatDelta(deltaPct)}
            </span>
            <span className="text-muted">vs previous 30 days</span>
          </>
        )}
      </p>
    </Card>
  );
}
