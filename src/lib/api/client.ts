import { ApiError, type ApiEnvelope, type ApiFailure } from "@/types/api";

/** Narrows an unknown payload to a well-formed failure envelope. */
function isFailureEnvelope(value: unknown): value is ApiFailure {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.ok !== false) return false;

  const error = candidate.error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as Record<string, unknown>).code === "string" &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * The single place the application talks HTTP.
 *
 * Responsibilities kept here so no service or component repeats them:
 *   - resolving relative paths to absolute (required on the server)
 *   - timeouts, so a hanging request surfaces as an error instead of an
 *     indefinite spinner
 *   - unwrapping the `{ ok, data }` envelope
 *   - normalising every failure — thrown, non-2xx, or malformed — into ApiError
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * `fetch` needs an absolute URL when it runs on the server; in the browser a
 * relative path is correct and avoids hard-coding an origin that would break
 * across preview deployments.
 */
function resolveUrl(path: string): string {
  if (typeof window !== "undefined") return path;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    `http://localhost:${process.env.PORT ?? 3000}`;

  return new URL(path, base).toString();
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Forwarded to Next's extended fetch for route-level caching control. */
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, next, cache } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Merge the caller's signal (component unmount) with our timeout signal so
  // either can cancel the request.
  const signals = [timeoutController.signal, signal].filter(
    (s): s is AbortSignal => Boolean(s),
  );
  const combinedSignal =
    signals.length > 1 && typeof AbortSignal.any === "function"
      ? AbortSignal.any(signals)
      : signals[0];

  let response: Response;
  try {
    response = await fetch(resolveUrl(path), {
      signal: combinedSignal,
      headers: { Accept: "application/json" },
      ...(next ? { next } : {}),
      ...(cache ? { cache } : {}),
    });
  } catch (error) {
    // A caller-initiated abort is not an error condition — let it propagate so
    // `useEffect` cleanup doesn't surface a spurious error state.
    if (signal?.aborted) throw error;
    if (timeoutController.signal.aborted) {
      throw new ApiError("TIMEOUT", `Request to ${path} timed out`);
    }
    throw new ApiError(
      "NETWORK",
      error instanceof Error ? error.message : "Network request failed",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      "MALFORMED_RESPONSE",
      `Response from ${path} was not valid JSON`,
      response.status,
    );
  }

  if (!response.ok) {
    // The server may or may not have managed to send a well-formed envelope —
    // a proxy returning an HTML error page will not have. Narrow defensively
    // rather than trusting the shape.
    if (isFailureEnvelope(payload)) {
      throw new ApiError(payload.error.code, payload.error.message, response.status);
    }
    throw new ApiError(
      response.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      `Request to ${path} failed with ${response.status}`,
      response.status,
    );
  }

  const envelope = payload as ApiEnvelope<T>;
  if (!envelope || typeof envelope !== "object" || !("ok" in envelope)) {
    throw new ApiError(
      "MALFORMED_RESPONSE",
      `Response from ${path} did not match the expected envelope`,
      response.status,
    );
  }

  if (!envelope.ok) {
    throw new ApiError(envelope.error.code, envelope.error.message, response.status);
  }

  return envelope.data;
}
