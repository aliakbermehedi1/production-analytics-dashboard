import { Card } from "@/components/ui/primitives";
import { cn, formatDelta } from "@/lib/utils/format";
import type { MetricSummary } from "@/types/domain";

/**
 * Server Component. Receives an already-formatted string rather than a raw
 * number plus a formatter function, because functions are not serialisable
 * across the server/client boundary and keeping formatting on the server means
 * `Intl` never ships to the browser for this card.
 */
export function StatCard({
  label,
  formattedValue,
  metric,
  /** Set when a rise is bad (e.g. refund rate). */
  invertDelta = false,
}: {
  label: string;
  formattedValue: string;
  metric: MetricSummary;
  invertDelta?: boolean;
}) {
  const { deltaPct } = metric;
  const isFlat = deltaPct === null || deltaPct === 0;
  const isGood = deltaPct !== null && (invertDelta ? deltaPct < 0 : deltaPct > 0);

  return (
    <Card as="div" className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tnum">
        {formattedValue}
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-xs">
        {deltaPct === null ? (
          <span className="text-muted">No prior period</span>
        ) : (
          <>
            <span
              className={cn(
                "font-medium tnum",
                isFlat ? "text-muted" : isGood ? "text-positive" : "text-negative",
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
