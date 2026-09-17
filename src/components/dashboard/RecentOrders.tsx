import Link from "next/link";
import { Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatCurrencyPrecise, formatDate } from "@/lib/utils/format";
import type { Order } from "@/types/domain";

/** Server Component — a static list, no interactivity beyond navigation. */
export function RecentOrders({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader
        title="Recent orders"
        description="Latest activity across all channels"
        action={
          <Link
            href="/orders"
            className="text-xs font-medium text-accent hover:underline"
          >
            View all
          </Link>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Once orders start coming in, the most recent ones will appear here."
        />
      ) : (
        <ul className="divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{order.customerName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted tnum">
                    {order.reference} · {formatDate(order.placedAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
                <span className="w-20 shrink-0 text-right text-sm font-medium tnum">
                  {formatCurrencyPrecise(order.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
