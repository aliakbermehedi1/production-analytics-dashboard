import { findOrders } from "@/server/data/repository";
import { parseOrderQuery } from "@/lib/utils/query";
import { ok, fail } from "@/lib/api/envelope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Reuse the same parser the pages use, so a filter behaves identically
    // whether it arrives via the UI or a direct API call.
    const query = parseOrderQuery(Object.fromEntries(searchParams.entries()));

    return ok(await findOrders(query));
  } catch (error) {
    console.error("[api/orders]", error);
    return fail("SERVER_ERROR", "Failed to load orders", 500);
  }
}
