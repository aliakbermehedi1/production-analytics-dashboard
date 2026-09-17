import { ApiError } from "@/types/api";
import {
  ACTIVITY_LEVELS,
  ORDER_STATUSES,
  type ActivityLevel,
  type AnalyticsSummary,
  type MetricSummary,
  type Order,
  type OrderDetail,
  type OrderStatus,
  type Paginated,
  type SystemActivity,
  type TimeSeriesPoint,
} from "@/types/domain";

/**
 * Runtime validation at the network boundary.
 *
 * TypeScript types are erased at build time, so `response.json() as Order[]` is
 * a promise the compiler cannot keep — a backend that renames a field or sends
 * `null` where a number was expected produces a crash deep inside a component,
 * far from the cause.
 *
 * These guards turn that into a single, catchable `MALFORMED_RESPONSE` error at
 * the edge, which the UI already knows how to render. Hand-written rather than
 * Zod so the project ships zero runtime validation dependencies; the shape of
 * the code is deliberately Zod-like so swapping it in later is mechanical.
 */

const fail = (path: string, expected: string): never => {
  throw new ApiError(
    "MALFORMED_RESPONSE",
    `Expected ${expected} at "${path}"`,
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function str(value: unknown, path: string): string {
  return typeof value === "string" ? value : fail(path, "string");
}

function num(value: unknown, path: string): number {
  // Number.isFinite rejects NaN and Infinity, both of which are valid JSON
  // round-trip results from a buggy backend and both of which render as
  // "NaN" or "∞" in the UI if they get through.
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fail(path, "finite number");
}

function nullableNum(value: unknown, path: string): number | null {
  if (value === null) return null;
  return num(value, path);
}

function nullableStr(value: unknown, path: string): string | null {
  if (value === null) return null;
  return str(value, path);
}

function int(value: unknown, path: string): number {
  const parsed = num(value, path);
  return Number.isInteger(parsed) ? parsed : fail(path, "integer");
}

function arr(value: unknown, path: string): unknown[] {
  return Array.isArray(value) ? value : fail(path, "array");
}

function obj(value: unknown, path: string): Record<string, unknown> {
  return isRecord(value) ? value : fail(path, "object");
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  const raw = str(value, path);
  return (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fail(path, `one of ${allowed.join(" | ")}`);
}

/* -------------------------------------------------------------------------- */

export function parseOrder(value: unknown, path = "order"): Order {
  const o = obj(value, path);
  return {
    id: str(o.id, `${path}.id`),
    reference: str(o.reference, `${path}.reference`),
    customerId: str(o.customerId, `${path}.customerId`),
    customerName: str(o.customerName, `${path}.customerName`),
    customerEmail: str(o.customerEmail, `${path}.customerEmail`),
    status: oneOf<OrderStatus>(o.status, ORDER_STATUSES, `${path}.status`),
    placedAt: str(o.placedAt, `${path}.placedAt`),
    subtotal: num(o.subtotal, `${path}.subtotal`),
    shipping: num(o.shipping, `${path}.shipping`),
    tax: num(o.tax, `${path}.tax`),
    total: num(o.total, `${path}.total`),
    itemCount: int(o.itemCount, `${path}.itemCount`),
  };
}

export function parseOrderDetail(value: unknown, path = "orderDetail"): OrderDetail {
  const o = obj(value, path);
  const base = parseOrder(value, path);
  const address = obj(o.shippingAddress, `${path}.shippingAddress`);

  return {
    ...base,
    items: arr(o.items, `${path}.items`).map((item, i) => {
      const it = obj(item, `${path}.items[${i}]`);
      return {
        id: str(it.id, `${path}.items[${i}].id`),
        productName: str(it.productName, `${path}.items[${i}].productName`),
        sku: str(it.sku, `${path}.items[${i}].sku`),
        quantity: int(it.quantity, `${path}.items[${i}].quantity`),
        unitPrice: num(it.unitPrice, `${path}.items[${i}].unitPrice`),
      };
    }),
    shippingAddress: {
      line1: str(address.line1, `${path}.shippingAddress.line1`),
      city: str(address.city, `${path}.shippingAddress.city`),
      postcode: str(address.postcode, `${path}.shippingAddress.postcode`),
      country: str(address.country, `${path}.shippingAddress.country`),
    },
    notes: nullableStr(o.notes, `${path}.notes`),
  };
}

export function parsePaginatedOrders(value: unknown): Paginated<Order> {
  const p = obj(value, "paginated");
  return {
    items: arr(p.items, "paginated.items").map((item, i) =>
      parseOrder(item, `paginated.items[${i}]`),
    ),
    page: int(p.page, "paginated.page"),
    pageSize: int(p.pageSize, "paginated.pageSize"),
    totalItems: int(p.totalItems, "paginated.totalItems"),
    totalPages: int(p.totalPages, "paginated.totalPages"),
  };
}

export function parseActivity(value: unknown, path = "activity"): SystemActivity {
  const a = obj(value, path);
  return {
    id: str(a.id, `${path}.id`),
    level: oneOf<ActivityLevel>(a.level, ACTIVITY_LEVELS, `${path}.level`),
    actor: str(a.actor, `${path}.actor`),
    message: str(a.message, `${path}.message`),
    occurredAt: str(a.occurredAt, `${path}.occurredAt`),
  };
}

export function parseActivities(value: unknown): SystemActivity[] {
  return arr(value, "activities").map((item, i) =>
    parseActivity(item, `activities[${i}]`),
  );
}

function parseMetric(value: unknown, path: string): MetricSummary {
  const m = obj(value, path);
  return {
    value: num(m.value, `${path}.value`),
    deltaPct: nullableNum(m.deltaPct, `${path}.deltaPct`),
  };
}

function parseSeries(value: unknown, path: string): TimeSeriesPoint[] {
  return arr(value, path).map((point, i) => {
    const p = obj(point, `${path}[${i}]`);
    return {
      date: str(p.date, `${path}[${i}].date`),
      value: num(p.value, `${path}[${i}].value`),
    };
  });
}

function parseStatusBreakdown(value: unknown, path: string) {
  return arr(value, path).map((entry, i) => {
    const s = obj(entry, `${path}[${i}]`);
    return {
      status: oneOf<OrderStatus>(s.status, ORDER_STATUSES, `${path}[${i}].status`),
      count: int(s.count, `${path}[${i}].count`),
      share: num(s.share, `${path}[${i}].share`),
    };
  });
}

export function parseAnalyticsSummary(value: unknown): AnalyticsSummary {
  const a = obj(value, "analytics");
  return {
    totalRevenue: parseMetric(a.totalRevenue, "analytics.totalRevenue"),
    totalOrders: parseMetric(a.totalOrders, "analytics.totalOrders"),
    activeCustomers: parseMetric(a.activeCustomers, "analytics.activeCustomers"),
    conversionRate: parseMetric(a.conversionRate, "analytics.conversionRate"),
    revenueSeries: parseSeries(a.revenueSeries, "analytics.revenueSeries"),
    ordersSeries: parseSeries(a.ordersSeries, "analytics.ordersSeries"),
    statusBreakdown: parseStatusBreakdown(a.statusBreakdown, "analytics.statusBreakdown"),
  };
}
