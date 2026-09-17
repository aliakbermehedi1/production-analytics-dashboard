import { findActivities } from "@/server/data/repository";
import { ok, fail } from "@/lib/api/envelope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Number.parseInt(searchParams.get("limit") ?? "8", 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 50) : 8;

    return ok(await findActivities(limit));
  } catch (error) {
    console.error("[api/activities]", error);
    return fail("SERVER_ERROR", "Failed to load system activities", 500);
  }
}
