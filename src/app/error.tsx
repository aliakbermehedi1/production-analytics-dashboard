"use client";

import { useEffect } from "react";
import { Card, ErrorState } from "@/components/ui/primitives";

/**
 * Route-level error boundary.
 *
 * Must be a Client Component — React error boundaries rely on class-component
 * lifecycle, and the retry control needs an event handler.
 *
 * It catches anything thrown while rendering this route, including errors from
 * the Server Components above it, which arrive here serialised.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where a Sentry/Datadog report would go. `digest` is
    // the server-side id, which is what makes a client report traceable back to
    // the server log line.
    console.error("[dashboard] render failed", error);
  }, [error]);

  return (
    <div className="px-5 py-6 sm:px-8">
      <Card>
        <ErrorState
          title="We couldn't load this page"
          description="The data didn't come back as expected. This is usually temporary."
          action={
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-accent px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          }
        />
        {error.digest ? (
          <p className="border-t border-line px-5 py-2.5 text-center font-mono text-[11px] text-muted">
            Reference: {error.digest}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
