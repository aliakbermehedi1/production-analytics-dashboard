import {
  ORDER_STATUSES,
  type OrderQuery,
  type OrderStatus,
} from "@/types/domain";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/**
 * Filter state lives in the URL, which means it arrives as untrusted strings
 * from three different places: a user typing in the address bar, a shared link,
 * and our own router pushes. Parsing is therefore total — every branch has a
 * defined fallback, so a malformed URL renders a valid default page instead of
 * throwing.
 */

const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

/** Accepts yyyy-mm-dd only, and rejects impossible dates like 2026-02-31. */
function parseDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10) === value ? value : "";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type RawParams = Record<string, string | string[] | undefined>;

/** Takes the first value when a param is repeated (`?status=a&status=b`). */
const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function parseOrderQuery(params: RawParams): OrderQuery {
  const statusRaw = first(params.status) ?? "all";
  const pageSize = parsePositiveInt(first(params.pageSize), DEFAULT_PAGE_SIZE);

  let from = parseDate(first(params.from));
  let to = parseDate(first(params.to));

  // An inverted range would always return zero rows and look like a bug to the
  // user, so swap rather than silently return nothing.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  return {
    search: (first(params.search) ?? "").slice(0, 120),
    status: isOrderStatus(statusRaw) ? statusRaw : "all",
    from,
    to,
    page: parsePositiveInt(first(params.page), 1),
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize)
      ? pageSize
      : DEFAULT_PAGE_SIZE,
  };
}

/** Serialises query state back to a URL, omitting defaults to keep links clean. */
export function orderQueryToSearchParams(query: Partial<OrderQuery>): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.pageSize && query.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }
  return params;
}

/** True when any filter is narrowing the result set — drives the empty state copy. */
export function hasActiveFilters(query: OrderQuery): boolean {
  return Boolean(query.search || query.status !== "all" || query.from || query.to);
}
