"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LevelDot,
} from "@/components/ui/primitives";
import { activitiesService } from "@/lib/api/services";
import { formatRelativeTime, cn } from "@/lib/utils/format";
import { ApiError } from "@/types/api";
import type { SystemActivity } from "@/types/domain";

/**
 * The one component that fetches on the client, and the reasoning is worth
 * stating because the default in this app is the opposite:
 *
 *  - Initial data arrives as a prop, already rendered on the server. There is
 *    no `useEffect(() => { fetch() }, [])` on mount — that pattern would ship
 *    an empty list, then a spinner, then content, and delay the first paint for
 *    data the server already had.
 *  - A refresh is a user-initiated event, which is exactly what client fetching
 *    is for. `useEffect` appears once, and only to abort an in-flight request
 *    when the component unmounts.
 */
export function ActivityFeed({
  initialActivities,
  limit = 8,
}: {
  initialActivities: SystemActivity[];
  limit?: number;
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Relative timestamps ("4m ago") must be computed in the browser: rendering
  // them on the server would bake in the build time and mismatch on hydration.
  // Rendering absolute time first, then swapping after mount, keeps the markup
  // identical on both sides.
  const [mounted, setMounted] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Cancel any request still in flight when the user navigates away, so it
      // cannot resolve and call setState on an unmounted component.
      abortRef.current?.abort();
    };
  }, []);

  const refresh = useCallback(async () => {
    // Supersede any previous refresh so two rapid clicks cannot resolve out of
    // order and show stale data.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRefreshing(true);
    setError(null);

    try {
      const next = await activitiesService.list(limit, {
        signal: controller.signal,
        cache: "no-store",
      });
      setActivities(next);
    } catch (caught) {
      if (controller.signal.aborted) return; // superseded, not a failure
      setError(
        caught instanceof ApiError
          ? caught.userMessage
          : "We couldn't refresh the activity feed.",
      );
    } finally {
      if (!controller.signal.aborted) setIsRefreshing(false);
    }
  }, [limit]);

  return (
    <Card>
      <CardHeader
        title="System activity"
        description="Events from services and integrations"
        action={
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-content disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              className={cn("size-3.5", isRefreshing && "animate-spin")}
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 11a8 8 0 1 0-.7 4.3M20 5v6h-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        }
      />

      {/* Errors are non-destructive: the previously loaded list stays on screen
          so a failed refresh doesn't wipe out data the user was reading. */}
      {error ? (
        <div className="border-b border-line px-5 py-2.5">
          <p role="alert" className="text-xs text-negative">
            {error}
          </p>
        </div>
      ) : null}

      {activities.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="System events from the last few hours will show up here."
        />
      ) : (
        <ul
          // Politely announce refreshed content without stealing focus.
          aria-live="polite"
          aria-busy={isRefreshing}
          className={cn(
            "divide-y divide-line transition-opacity",
            isRefreshing && "opacity-60",
          )}
        >
          {activities.map((activity) => (
            <li key={activity.id} className="flex gap-3 px-5 py-3">
              <LevelDot level={activity.level} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{activity.message}</p>
                <p className="mt-0.5 text-xs text-muted">
                  <span className="font-mono text-[11px]">{activity.actor}</span>
                  {" · "}
                  <time dateTime={activity.occurredAt} className="tnum">
                    {mounted
                      ? formatRelativeTime(activity.occurredAt)
                      : activity.occurredAt.slice(11, 16)}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Fallback used while the feed's Suspense boundary resolves. */
export function ActivityFeedError({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader title="System activity" />
      <ErrorState description={message} />
    </Card>
  );
}
