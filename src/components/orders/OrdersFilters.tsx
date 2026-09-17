"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ORDER_STATUSES, type OrderQuery, type OrderStatus } from "@/types/domain";
import { orderQueryToSearchParams, PAGE_SIZE_OPTIONS } from "@/lib/utils/query";
import { cn } from "@/lib/utils/format";

/**
 * Filter state lives in the URL, not in React state.
 *
 * That choice drives everything else here: filtered views are shareable and
 * bookmarkable, the back button steps through filter changes, and the table
 * stays a Server Component because it reads `searchParams` rather than
 * subscribing to a client store. The trade-off is that every change is a
 * navigation, which `useTransition` keeps from feeling like one.
 */

const SEARCH_DEBOUNCE_MS = 300;

export function OrdersFilters({ query }: { query: OrderQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  // `isPending` stays true while the server re-renders the table, which is what
  // dims the results instead of swapping them for a spinner.
  const [isPending, startTransition] = useTransition();

  // The input is controlled locally so typing stays instant; the URL is the
  // source of truth but is only written to after the user pauses.
  const [searchInput, setSearchInput] = useState(query.search);

  const pushQuery = useCallback(
    (next: Partial<OrderQuery>) => {
      // Any filter change resets to page 1 — staying on page 7 of a result set
      // that now has two pages would show an empty table.
      const merged: Partial<OrderQuery> = { ...query, page: 1, ...next };
      const params = orderQueryToSearchParams(merged);
      const search = params.toString();

      startTransition(() => {
        router.push(search ? `${pathname}?${search}` : pathname, {
          // The filter bar is already in view; jumping to the top on every
          // keystroke would be disorienting.
          scroll: false,
        });
      });
    },
    [pathname, query, router],
  );

  /**
   * Debounce: this effect synchronises local input state out to external state
   * (the URL). Synchronising with something outside React is precisely what an
   * effect is for — the alternative, navigating on every keystroke, would fire
   * a server round-trip per character.
   */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchInput === query.search) return;

    const timer = setTimeout(() => {
      pushQuery({ search: searchInput });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput, query.search, pushQuery]);

  // Keep the input in sync when the URL changes from outside this component —
  // a back-button press, or the "Clear filters" button in the empty state.
  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  const handleReset = useCallback(() => {
    setSearchInput("");
    startTransition(() => router.push(pathname, { scroll: false }));
  }, [pathname, router]);

  const hasFilters = Boolean(
    query.search || query.status !== "all" || query.from || query.to,
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line px-5 py-4 transition-opacity lg:flex-row lg:items-end",
        isPending && "opacity-70",
      )}
    >
      <Field label="Search" className="lg:flex-1">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Reference, customer name or email"
            className="w-full rounded-md border border-line bg-surface py-1.5 pl-9 pr-3 text-sm placeholder:text-muted"
          />
        </div>
      </Field>

      <Field label="Status">
        <select
          value={query.status}
          onChange={(event) =>
            pushQuery({ status: event.target.value as OrderStatus | "all" })
          }
          className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm capitalize lg:w-36"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status} className="capitalize">
              {status}
            </option>
          ))}
        </select>
      </Field>

      <Field label="From">
        <input
          type="date"
          value={query.from}
          max={query.to || undefined}
          onChange={(event) => pushQuery({ from: event.target.value })}
          className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm tnum lg:w-36"
        />
      </Field>

      <Field label="To">
        <input
          type="date"
          value={query.to}
          min={query.from || undefined}
          onChange={(event) => pushQuery({ to: event.target.value })}
          className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm tnum lg:w-36"
        />
      </Field>

      <Field label="Per page">
        <select
          value={query.pageSize}
          onChange={(event) =>
            pushQuery({ pageSize: Number.parseInt(event.target.value, 10) })
          }
          className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm tnum lg:w-20"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </Field>

      {hasFilters ? (
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-content"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
