import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, Skeleton } from "@/components/ui/primitives";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { StatusBreakdown } from "@/components/dashboard/StatusBreakdown";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { analyticsService, ordersService, activitiesService } from "@/lib/api/services";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/utils/format";

/**
 * Dashboard — a Server Component.
 *
 * The page is split into three independently-suspended sections rather than one
 * `await` at the top. Each section fetches its own data, so the metrics can
 * paint as soon as analytics resolves without waiting on the orders query, and
 * a slow endpoint degrades one card instead of the whole page.
 */

export const metadata = { title: "Dashboard" };

/**
 * Rendered per request. The metrics are relative to "now" and the activity feed
 * is live, so a statically prerendered page would be stale on arrival.
 *
 * This also has to be explicit because the page fetches from its own route
 * handlers: at build time there is no server listening, so an attempted static
 * prerender fails rather than producing a stale page.
 */
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        description="Revenue, orders and system health for the last 30 days"
      />

      <div className="space-y-5 px-5 py-6 sm:px-8">
        <Suspense fallback={<MetricsSkeleton />}>
          <MetricsSection />
        </Suspense>

        <Suspense fallback={<ChartsSkeleton />}>
          <ChartsSection />
        </Suspense>

        <div className="grid gap-5 lg:grid-cols-2">
          <Suspense fallback={<ListSkeleton title="Recent orders" rows={6} />}>
            <RecentOrdersSection />
          </Suspense>

          <Suspense fallback={<ListSkeleton title="System activity" rows={8} />}>
            <ActivitySection />
          </Suspense>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Sections                                  */
/* -------------------------------------------------------------------------- */

/**
 * Analytics is fetched once and shared by the metrics and charts sections.
 * Both call `analyticsService.getSummary()` with identical arguments, and
 * React's request deduplication collapses them into a single fetch for the
 * duration of the render — so the split into two Suspense boundaries costs
 * nothing in requests.
 */

async function MetricsSection() {
  const summary = await analyticsService.getSummary(30, { cache: "no-store" });

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total revenue"
        formattedValue={formatCurrency(summary.totalRevenue.value)}
        metric={summary.totalRevenue}
        accent="revenue"
      />
      <StatCard
        label="Total orders"
        formattedValue={formatNumber(summary.totalOrders.value)}
        metric={summary.totalOrders}
        accent="orders"
      />
      <StatCard
        label="Active customers"
        formattedValue={formatNumber(summary.activeCustomers.value)}
        metric={summary.activeCustomers}
        accent="customers"
      />
      <StatCard
        label="Conversion rate"
        formattedValue={formatPercent(summary.conversionRate.value)}
        metric={summary.conversionRate}
        accent="conversion"
      />
    </div>
  );
}

async function ChartsSection() {
  const summary = await analyticsService.getSummary(30, { cache: "no-store" });

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Revenue" description="Daily, last 30 days" />
        {/*
          `formatType` is a plain string ("currency"), not a function — a
          Server Component cannot pass a function reference to a Client
          Component across the RSC boundary. TrendChart resolves the real
          formatter internally. See its FORMATTERS lookup.
        */}
        <TrendChart
          data={summary.revenueSeries}
          variant="area"
          formatType="currency"
          ariaLabel="Daily revenue over the last 30 days"
        />
      </Card>

      <StatusBreakdown data={summary.statusBreakdown} />

      <Card className="xl:col-span-2">
        <CardHeader title="Orders" description="Daily, last 30 days" />
        <TrendChart
          data={summary.ordersSeries}
          variant="bar"
          formatType="number"
          ariaLabel="Daily order count over the last 30 days"
        />
      </Card>
    </div>
  );
}

async function RecentOrdersSection() {
  const orders = await ordersService.recent(6, { cache: "no-store" });
  return <RecentOrders orders={orders} />;
}

async function ActivitySection() {
  const activities = await activitiesService.list(8, { cache: "no-store" });
  // Server-rendered initial data; the component refreshes itself from there.
  return <ActivityFeed initialActivities={activities} limit={8} />;
}

/* -------------------------------------------------------------------------- */
/*                                  Skeletons                                 */
/* -------------------------------------------------------------------------- */

/**
 * Skeletons mirror the real layout's dimensions so the page does not shift when
 * content replaces them — a skeleton of the wrong height is a CLS regression
 * dressed up as a loading state.
 */

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} as="div" className="p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
        <div className="px-5 py-4">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </Card>

      <Card>
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
        <div className="space-y-4 px-5 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
        <div className="px-5 py-4">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </Card>
    </div>
  );
}

function ListSkeleton({ title, rows }: { title: string; rows: number }) {
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
