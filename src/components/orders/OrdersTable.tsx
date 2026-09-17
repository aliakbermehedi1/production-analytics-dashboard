import Link from "next/link";
import { StatusBadge } from "@/components/ui/primitives";
import { formatCurrencyPrecise, formatDate } from "@/lib/utils/format";
import type { Order } from "@/types/domain";

/**
 * Server Component. Rows are links, not click handlers — navigation works
 * without JavaScript, keyboard users get it for free, and there is no reason
 * for this table to exist in the client bundle.
 *
 * The same data renders as a table on wide screens and as stacked cards on
 * narrow ones, which is why the markup appears twice rather than trying to make
 * one `<table>` reflow.
 */
export function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <>
      {/* Wide screens */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Orders matching the current filters
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Reference</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Customer</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Items</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-surface-2">
                <td className="px-5 py-3">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium text-accent tnum hover:underline"
                  >
                    {order.reference}
                  </Link>
                </td>
                <td className="max-w-[16rem] px-5 py-3">
                  <span className="block truncate">{order.customerName}</span>
                  <span className="block truncate text-xs text-muted">
                    {order.customerEmail}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted tnum">
                  {formatDate(order.placedAt)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-5 py-3 text-right text-muted tnum">
                  {order.itemCount}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-medium tnum">
                  {formatCurrencyPrecise(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens */}
      <ul className="divide-y divide-line md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="block px-5 py-3.5 transition-colors hover:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{order.customerName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted tnum">
                    {order.reference}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted tnum">{formatDate(order.placedAt)}</span>
                <span className="font-medium tnum">
                  {formatCurrencyPrecise(order.total)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
