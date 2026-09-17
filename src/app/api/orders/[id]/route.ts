import { findOrderById } from "@/server/data/repository";
import { ok, fail } from "@/lib/api/envelope";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  // Next 15 passes route params as a Promise.
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const order = await findOrderById(id);

    if (!order) {
      return fail("NOT_FOUND", `No order found with id "${id}"`, 404);
    }
    return ok(order);
  } catch (error) {
    console.error("[api/orders/:id]", error);
    return fail("SERVER_ERROR", "Failed to load order", 500);
  }
}
