import { apiRequest, type RequestOptions } from "./client";
import {
  parseActivities,
  parseAnalyticsSummary,
  parseOrder,
  parseOrderDetail,
  parsePaginatedOrders,
} from "@/lib/transforms/guards";
import { orderQueryToSearchParams } from "@/lib/utils/query";
import type {
  AnalyticsSummary,
  Order,
  OrderDetail,
  OrderQuery,
  Paginated,
  SystemActivity,
} from "@/types/domain";

/**
 * The service layer is what components call. Each function owns one endpoint:
 * it builds the URL, delegates transport to the client, and runs the response
 * through a guard before returning a typed domain object.
 *
 * Because validation happens here, a component receiving `Order[]` has a
 * runtime guarantee, not just a compile-time assertion.
 */

export const analyticsService = {
  getSummary(
    windowDays = 30,
    options?: RequestOptions,
  ): Promise<AnalyticsSummary> {
    return apiRequest<unknown>(
      `/api/analytics?windowDays=${windowDays}`,
      options,
    ).then(parseAnalyticsSummary);
  },
};

export const ordersService = {
  list(query: OrderQuery, options?: RequestOptions): Promise<Paginated<Order>> {
    const params = orderQueryToSearchParams(query);
    // Page and pageSize are omitted from the URL by the serialiser when they
    // are defaults; the list endpoint needs them explicitly.
    params.set("page", String(query.page));
    params.set("pageSize", String(query.pageSize));

    return apiRequest<unknown>(`/api/orders?${params.toString()}`, options).then(
      parsePaginatedOrders,
    );
  },

  getById(id: string, options?: RequestOptions): Promise<OrderDetail> {
    return apiRequest<unknown>(
      `/api/orders/${encodeURIComponent(id)}`,
      options,
    ).then(parseOrderDetail);
  },

  recent(limit = 6, options?: RequestOptions): Promise<Order[]> {
    return apiRequest<unknown>(`/api/orders/recent?limit=${limit}`, options).then(
      (value) => {
        if (!Array.isArray(value)) {
          return parsePaginatedOrders(value).items;
        }
        return value.map((item, i) => parseOrder(item, `recent[${i}]`));
      },
    );
  },
};

export const activitiesService = {
  list(limit = 8, options?: RequestOptions): Promise<SystemActivity[]> {
    return apiRequest<unknown>(`/api/activities?limit=${limit}`, options).then(
      parseActivities,
    );
  },
};
