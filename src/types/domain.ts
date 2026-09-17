/**
 * Domain types.
 *
 * These describe the shapes the UI is allowed to consume. They are deliberately
 * kept separate from the raw API payload shapes (see `api.ts`): the transform
 * layer is responsible for turning one into the other, so a change in the
 * backend contract never leaks directly into components.
 */

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Customer {
  id: string;
  name: string;
  email: string;
  /** ISO-8601 timestamp */
  joinedAt: string;
  isActive: boolean;
  totalSpent: number;
  orderCount: number;
}

export interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  /** ISO-8601 timestamp */
  placedAt: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
}

/** An order with its line items and address — only loaded on the detail route. */
export interface OrderDetail extends Order {
  items: OrderItem[];
  shippingAddress: {
    line1: string;
    city: string;
    postcode: string;
    country: string;
  };
  notes: string | null;
}

export const ACTIVITY_LEVELS = ["info", "success", "warning", "error"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export interface SystemActivity {
  id: string;
  level: ActivityLevel;
  actor: string;
  message: string;
  /** ISO-8601 timestamp */
  occurredAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                 Analytics                                  */
/* -------------------------------------------------------------------------- */

/**
 * A single headline metric. `deltaPct` is the change vs. the previous
 * equivalent period — `null` when there is no prior period to compare against,
 * which the UI renders differently from a 0% change.
 */
export interface MetricSummary {
  value: number;
  deltaPct: number | null;
}

export interface TimeSeriesPoint {
  /** ISO-8601 date (yyyy-mm-dd) */
  date: string;
  value: number;
}

export interface AnalyticsSummary {
  totalRevenue: MetricSummary;
  totalOrders: MetricSummary;
  activeCustomers: MetricSummary;
  /** Stored as a fraction (0.042), formatted as a percentage at the edge. */
  conversionRate: MetricSummary;
  revenueSeries: TimeSeriesPoint[];
  ordersSeries: TimeSeriesPoint[];
}

/* -------------------------------------------------------------------------- */
/*                            Query / pagination                              */
/* -------------------------------------------------------------------------- */

export interface OrderQuery {
  search: string;
  status: OrderStatus | "all";
  /** ISO-8601 date (yyyy-mm-dd) or empty string for "no bound" */
  from: string;
  to: string;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
