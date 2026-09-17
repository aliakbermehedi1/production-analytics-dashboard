import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, StatusBadge } from "@/components/ui/primitives";
import { Header } from "@/components/layout/Header";
import { ordersService } from "@/lib/api/services";
import {
  formatCurrencyPrecise,
  formatDateTime,
  formatNumber,
} from "@/lib/utils/format";
import { ApiError } from "@/types/api";
import type { OrderDetail } from "@/types/domain";

/**
 * Order detail — a Server Component.
 *
 * Nothing on this page is interactive, so nothing here reaches the client
 * bundle. A `NOT_FOUND` from the service is translated into Next's `notFound()`
 * so a bad id renders the 404 route rather than the generic error boundary.
 */

/**
 * Wrapped in React's `cache` so `generateMetadata` and the component itself
 * share one fetch per request instead of hitting the API twice for the same
 * record.
 */
const loadOrder = cache(async (id: string): Promise<OrderDetail> => {
  try {
    return await ordersService.getById(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      // Called from `generateMetadata` first, which runs *before* the response
      // starts streaming. That ordering matters: once the shell has been
      // flushed the status line is already on the wire, and a `notFound()` from
      // inside the component body would render the 404 page under a 200.
      notFound();
    }
    // Anything else is a genuine failure — let error.tsx handle it.
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);
  return { title: order.reference };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);

  return (
    <>
      <Header
        title={order.reference}
        description={`Placed ${formatDateTime(order.placedAt)}`}
        action={<StatusBadge status={order.status} />}
      />

      <div className="px-5 py-6 sm:px-8">
        <Link
          href="/orders"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-content"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to orders
        </Link>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardHeader
                title="Line items"
                description={`${formatNumber(order.itemCount)} ${
                  order.itemCount === 1 ? "unit" : "units"
                }`}
              />
              <ul className="divide-y divide-line">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{item.productName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {item.sku}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tnum">
                        {item.quantity} × {formatCurrencyPrecise(item.unitPrice)}
                      </p>
                      <p className="mt-0.5 text-xs font-medium tnum">
                        {formatCurrencyPrecise(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
                <SummaryRow label="Subtotal" value={order.subtotal} />
                <SummaryRow label="Shipping" value={order.shipping} />
                <SummaryRow label="Tax" value={order.tax} />
                <div className="flex justify-between border-t border-line pt-2 font-medium">
                  <dt>Total</dt>
                  <dd className="tnum">{formatCurrencyPrecise(order.total)}</dd>
                </div>
              </dl>
            </Card>

            {order.notes ? (
              <Card>
                <CardHeader title="Notes" />
                <p className="px-5 py-4 text-sm leading-relaxed">{order.notes}</p>
              </Card>
            ) : null}
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Customer" />
              <div className="px-5 py-4">
                <p className="text-sm font-medium">{order.customerName}</p>
                <p className="mt-0.5 break-all text-xs text-muted">
                  {order.customerEmail}
                </p>
                <p className="mt-3 font-mono text-[11px] text-muted">
                  {order.customerId}
                </p>
              </div>
            </Card>

            <Card>
              <CardHeader title="Shipping address" />
              <address className="px-5 py-4 text-sm not-italic leading-relaxed">
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.city} {order.shippingAddress.postcode}
                <br />
                {order.shippingAddress.country}
              </address>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted">
      <dt>{label}</dt>
      <dd className="tnum">
        {value === 0 && label === "Shipping"
          ? "Free"
          : formatCurrencyPrecise(value)}
      </dd>
    </div>
  );
}
