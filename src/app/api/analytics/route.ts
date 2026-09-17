import { getAnalyticsSummary } from "@/server/data/repository";
import { ok, fail } from "@/lib/api/envelope";

/**
 * Analytics is recomputed per request rather than cached: the window is
 * relative to "now" and the dataset is small enough that aggregation is cheap.
 * A production version would cache per (windowDays, day) key.
 */
export const dynamic = "force-dynamic";

const ALLOWED_WINDOWS = [7, 30, 90];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Number.parseInt(searchParams.get("windowDays") ?? "30", 10);
    const windowDays = ALLOWED_WINDOWS.includes(raw) ? raw : 30;

    return ok(await getAnalyticsSummary(windowDays));
  } catch (error) {
    console.error("[api/analytics]", error);
    return fail("SERVER_ERROR", "Failed to compute analytics summary", 500);
  }
}
