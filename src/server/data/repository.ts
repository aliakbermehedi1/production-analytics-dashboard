import "server-only";

import { db, DAY_MS, isoDate } from "./seed";
import {
  ORDER_STATUSES,
  type AnalyticsSummary,
  type MetricSummary,
  type Order,
  type OrderDetail,
  type OrderQuery,
  type OrderStatus,
  type Paginated,
  type StatusShare,
  type SystemActivity,
  type TimeSeriesPoint,
} from "@/types/domain";

/**
 * The repository is the only module that touches the dataset directly.
 *
 * It stands in for what would be a database layer in production — the function
 * signatures are deliberately the ones you would keep if `db` were swapped for
 * Prisma or a REST client, so nothing above this file would have to change.
 *
 * `server-only` makes that boundary enforceable rather than a convention: if a
 * Client Component ever imports this, the build fails instead of silently
 * shipping the whole dataset to the browser.
 */

/** Simulates network/database latency so loading states are actually visible. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/*                                   Orders                                   */
/* -------------------------------------------------------------------------- */

const stripDetail = (order: OrderDetail): Order => {
  // Explicit projection rather than a spread-and-delete: the list endpoint must
  // not leak line items and addresses it has no reason to send.
  const { items, shippingAddress, notes, ...summary } = order;
  void items;
  void shippingAddress;
  void notes;
  return summary;
};

export async function findOrders(query: OrderQuery): Promise<Paginated<Order>> {
  await delay(320);

  const search = query.search.trim().toLowerCase();
  const fromTime = query.from ? new Date(`${query.from}T00:00:00.000Z`).getTime() : null;
  const toTime = query.to ? new Date(`${query.to}T23:59:59.999Z`).getTime() : null;

  const filtered = db.orders.filter((order) => {
    if (query.status !== "all" && order.status !== query.status) return false;

    if (fromTime !== null || toTime !== null) {
      const placed = new Date(order.placedAt).getTime();
      if (fromTime !== null && placed < fromTime) return false;
      if (toTime !== null && placed > toTime) return false;
    }

    if (search) {
      const haystack = `${order.reference} ${order.customerName} ${order.customerEmail}`;
      if (!haystack.toLowerCase().includes(search)) return false;
    }

    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  // Clamp rather than 404: a filter change can legitimately leave the user on a
  // page that no longer exists, and showing the last valid page beats an error.
  const page = Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * query.pageSize;

  return {
    items: filtered.slice(start, start + query.pageSize).map(stripDetail),
    page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
  };
}

export async function findOrderById(id: string): Promise<OrderDetail | null> {
  await delay(260);
  return db.orders.find((order) => order.id === id) ?? null;
}

export async function findRecentOrders(limit: number): Promise<Order[]> {
  await delay(280);
  return db.orders.slice(0, limit).map(stripDetail);
}

/* -------------------------------------------------------------------------- */
/*                                 Activities                                 */
/* -------------------------------------------------------------------------- */

export async function findActivities(limit: number): Promise<SystemActivity[]> {
  await delay(300);
  return db.activities.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*                                 Analytics                                  */
/* -------------------------------------------------------------------------- */

const REVENUE_STATUSES = new Set(["pending", "processing", "shipped", "delivered"]);

function buildMetric(current: number, previous: number): MetricSummary {
  // A 0 → n jump is not "infinite % growth"; it has no meaningful baseline, so
  // the delta is null and the UI renders "no prior data" instead of a number.
  if (previous === 0) {
    return { value: current, deltaPct: null };
  }
  return {
    value: current,
    deltaPct: Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

function seriesFor(
  windowStart: number,
  windowEnd: number,
  reducer: (bucket: { revenue: number; orders: number }) => number,
): TimeSeriesPoint[] {
  const buckets = new Map<string, { revenue: number; orders: number }>();

  // Pre-seed every day in the window so days with no orders render as a zero
  // point rather than being silently dropped from the chart.
  for (let t = windowStart; t <= windowEnd; t += DAY_MS) {
    buckets.set(isoDate(new Date(t)), { revenue: 0, orders: 0 });
  }

  for (const order of db.orders) {
    const placed = new Date(order.placedAt).getTime();
    if (placed < windowStart || placed > windowEnd) continue;

    const key = isoDate(new Date(placed));
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.orders += 1;
    if (REVENUE_STATUSES.has(order.status)) {
      bucket.revenue += order.total;
    }
  }

  return Array.from(buckets.entries()).map(([date, bucket]) => ({
    date,
    value: Math.round(reducer(bucket) * 100) / 100,
  }));
}

export async function getAnalyticsSummary(windowDays = 30): Promise<AnalyticsSummary> {
  await delay(380);

  const end = db.now.getTime();
  const start = end - (windowDays - 1) * DAY_MS;
  const prevEnd = start - 1;
  const prevStart = prevEnd - (windowDays - 1) * DAY_MS;

  const inWindow = (from: number, to: number) =>
    db.orders.filter((order) => {
      const placed = new Date(order.placedAt).getTime();
      return placed >= from && placed <= to;
    });

  const current = inWindow(start, end);
  const previous = inWindow(prevStart, prevEnd);

  const revenueOf = (orders: typeof db.orders) =>
    Math.round(
      orders
        .filter((o) => REVENUE_STATUSES.has(o.status))
        .reduce((sum, o) => sum + o.total, 0) * 100,
    ) / 100;

  const activeCustomersOf = (orders: typeof db.orders) =>
    new Set(orders.map((o) => o.customerId)).size;

  // Conversion rate is modelled as "orders per session", with sessions derived
  // from a fixed multiplier. In a real system this would come from an analytics
  // provider; it is kept as an explicit assumption rather than a magic number
  // buried in the UI.
  const SESSIONS_PER_ORDER = 23.5;
  const conversionOf = (orders: typeof db.orders) => {
    const sessions = orders.length * SESSIONS_PER_ORDER;
    return sessions === 0 ? 0 : Math.round((orders.length / sessions) * 10000) / 10000;
  };

  return {
    totalRevenue: buildMetric(revenueOf(current), revenueOf(previous)),
    totalOrders: buildMetric(current.length, previous.length),
    activeCustomers: buildMetric(
      activeCustomersOf(current),
      activeCustomersOf(previous),
    ),
    conversionRate: buildMetric(conversionOf(current), conversionOf(previous)),
    revenueSeries: seriesFor(start, end, (b) => b.revenue),
    ordersSeries: seriesFor(start, end, (b) => b.orders),
    statusBreakdown: buildStatusBreakdown(current),
  };
}

/**
 * Counts orders per status within the window and sorts by share descending, so
 * the breakdown card's bars are already in the order they should render.
 */
function buildStatusBreakdown(orders: typeof db.orders): StatusShare[] {
  const counts = new Map<OrderStatus, number>();
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }

  const total = orders.length;
  return ORDER_STATUSES.map((status) => {
    const count = counts.get(status) ?? 0;
    return {
      status,
      count,
      share: total === 0 ? 0 : Math.round((count / total) * 1000) / 1000,
    };
  }).sort((a, b) => b.count - a.count);
}
