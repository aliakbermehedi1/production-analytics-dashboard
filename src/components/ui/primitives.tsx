import type { ReactNode } from "react";
import { cn } from "@/lib/utils/format";
import type { ActivityLevel, OrderStatus } from "@/types/domain";

/**
 * Presentational primitives. All Server Components — they render markup from
 * props and hold no state, so there is no reason to ship them to the browser.
 */

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-line bg-surface",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/* --------------------------------- Badge ---------------------------------- */

/**
 * Status colours are mapped explicitly rather than generated, so the set of
 * possible classes is statically visible to Tailwind's content scanner.
 * Interpolated class names (`bg-${colour}-100`) would be purged from the build.
 */
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-warning",
  processing: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent",
  shipped: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent",
  delivered: "bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] text-positive",
  cancelled: "bg-[color-mix(in_srgb,var(--negative)_14%,transparent)] text-negative",
  refunded: "bg-surface-2 text-muted",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

const LEVEL_DOT: Record<ActivityLevel, string> = {
  info: "bg-muted",
  success: "bg-positive",
  warning: "bg-warning",
  error: "bg-negative",
};

export function LevelDot({ level }: { level: ActivityLevel }) {
  return (
    <span
      // Decorative: the level is already conveyed by the adjacent text.
      aria-hidden="true"
      className={cn("mt-1.5 size-2 shrink-0 rounded-full", LEVEL_DOT[level])}
    />
  );
}

/* -------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} aria-hidden="true" />;
}

/* ------------------------------- Empty state ------------------------------ */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="mb-3 flex size-10 items-center justify-center rounded-full border border-line bg-surface-2"
      >
        <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none">
          <path
            d="M4 7h16M4 12h10M4 17h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------- Error state ------------------------------ */

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      // Announced to screen readers: errors usually appear after an action the
      // user took, so they need to hear about it without moving focus.
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div
        aria-hidden="true"
        className="mb-3 flex size-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--negative)_12%,transparent)]"
      >
        <svg viewBox="0 0 24 24" className="size-5 text-negative" fill="none">
          <path
            d="M12 8v5M12 16.5v.5M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
