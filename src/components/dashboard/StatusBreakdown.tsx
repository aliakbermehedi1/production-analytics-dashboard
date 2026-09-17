import { Card, CardHeader } from "@/components/ui/primitives";
import { formatNumber } from "@/lib/utils/format";
import type { OrderStatus, StatusShare } from "@/types/domain";

/**
 * Server Component — static bars from props, no interactivity.
 *
 * Colours are looked up from a fixed map (not interpolated) for the same
 * reason as `StatusBadge`: Tailwind's build-time class scanner needs to see
 * every class name literally in the source.
 */
const STATUS_COLOR: Record<OrderStatus, string> = {
  delivered: "var(--positive)",
  shipped: "var(--stat-blue)",
  processing: "var(--stat-purple)",
  pending: "var(--warning)",
  cancelled: "var(--negative)",
  refunded: "var(--muted)",
};

export function StatusBreakdown({ data }: { data: StatusShare[] }) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Card>
      <CardHeader
        title="Orders by status"
        description="Share of orders placed in the last 30 days"
      />
      <div className="space-y-4 px-5 py-4">
        {total === 0 ? (
          <p className="py-6 text-center text-xs text-muted">
            No orders in this period.
          </p>
        ) : (
          data.map((entry) => (
            <div key={entry.status}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="capitalize">{entry.status}</span>
                <span className="text-muted tnum">
                  {formatNumber(entry.count)} · {Math.round(entry.share * 100)}%
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label={`${entry.status} orders`}
                aria-valuenow={Math.round(entry.share * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${Math.max(entry.share * 100, entry.count > 0 ? 2 : 0)}%`,
                    background: STATUS_COLOR[entry.status],
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
