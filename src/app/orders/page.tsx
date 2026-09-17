import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { Pagination } from "@/components/orders/Pagination";
import { findOrders } from "@/server/data/repository";
import { parseOrderQuery, hasActiveFilters } from "@/lib/utils/query";
import { formatNumber } from "@/lib/utils/format";
import type { OrderQuery } from "@/types/domain";

/**
 * Orders — a Server Component that reads its entire state from the URL.
 *
 * There is no client-side data fetching on this route, and — as of this
 * version — no server-side HTTP fetching either: `OrdersResults` calls
 * `findOrders` from the repository directly rather than requesting this app's
 * own `/api/orders` route. A Server Component making an HTTP call back to its
 * own API is unnecessary indirection at best, and on serverless platforms
 * like Vercel it is a self-referential network request that can be slow or
 * fail outright — see the comment in `app/page.tsx` for the full reasoning.
 *
 * A filter change is still a navigation; Next re-runs this component on the
 * server with new `searchParams` and streams back only the changed part of
 * the tree. The filter bar and pagination are Client Components because they
 * *write* to the URL, but they never hold the results.
 */

export const metadata = { title: "Orders" };

// Search params make this route inherently dynamic.
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  // Next 15: searchParams is a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseOrderQuery(params);

  return (
    <>
      <Header title="Orders" description="Search, filter and inspect every order" />

      <div className="px-5 py-6 sm:px-8">
        <Card>
          <OrdersFilters query={query} />

          {/*
            Keyed on the query so a filter change remounts the boundary and
            shows the skeleton again. Without the key, React would keep the
            previous rows mounted and the user would get no feedback that a
            slow query is running.
          */}
          <Suspense key={JSON.stringify(query)} fallback={<TableSkeleton rows={query.pageSize} />}>
            <OrdersResults query={query} />
          </Suspense>
        </Card>
      </div>
    </>
  );
}

async function OrdersResults({ query }: { query: OrderQuery }) {
  const result = await findOrders(query);

  if (result.items.length === 0) {
    // The empty state distinguishes "no data at all" from "no matches" —
    // they call for different actions from the user.
    return hasActiveFilters(query) ? (
      <EmptyState
        title="No orders match these filters"
        description="Try widening the date range, clearing the search term, or selecting a different status."
      />
    ) : (
      <EmptyState
        title="No orders yet"
        description="Orders will appear here as soon as customers start placing them."
      />
    );
  }

  return (
    <>
      <div className="border-b border-line px-5 py-2">
        <p className="text-xs text-muted tnum">
          {formatNumber(result.totalItems)}{" "}
          {result.totalItems === 1 ? "order" : "orders"}
        </p>
      </div>
      <OrdersTable orders={result.items} />
      <Pagination result={result} query={query} />
    </>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      <div className="border-b border-line px-5 py-2">
        <Skeleton className="h-3 w-20" />
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-3.5 w-28" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="mt-1.5 h-3 w-52" />
            </div>
            <Skeleton className="hidden h-3.5 w-20 md:block" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}
