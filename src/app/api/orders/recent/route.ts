import { findRecentOrders } from "@/server/data/repository";
import { ok, fail } from "@/lib/api/envelope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Number.parseInt(searchParams.get("limit") ?? "6", 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 25) : 6;

    return ok(await findRecentOrders(limit));
  } catch (error) {
    console.error("[api/orders/recent]", error);
    return fail("SERVER_ERROR", "Failed to load recent orders", 500);
  }
}
