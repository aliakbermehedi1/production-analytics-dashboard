"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { orderQueryToSearchParams } from "@/lib/utils/query";
import { cn, formatNumber } from "@/lib/utils/format";
import type { OrderQuery, Paginated, Order } from "@/types/domain";

/**
 * Client Component — it pushes navigation on click.
 *
 * Page numbers are windowed rather than rendered in full: 42 pages of buttons
 * is both unusable and a lot of DOM. The window always shows first, last,
 * current, and one neighbour either side, with ellipses for the gaps.
 */
export function Pagination({
  result,
  query,
}: {
  result: Paginated<Order>;
  query: OrderQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const goToPage = useCallback(
    (page: number) => {
      const params = orderQueryToSearchParams({ ...query, page });
      const search = params.toString();
      startTransition(() => {
        router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
      });
    },
    [pathname, query, router],
  );

  /**
   * The windowing calculation is memoised on the two values it depends on.
   * It is not expensive in isolation, but it runs on every render of a
   * component that re-renders on each navigation, and the result is a new array
   * identity each time — which would defeat memoisation further down if this
   * list were ever passed as a prop.
   */
  const pages = useMemo(() => {
    const { page, totalPages } = result;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const window = new Set<number>([1, totalPages, page]);
    if (page - 1 > 1) window.add(page - 1);
    if (page + 1 < totalPages) window.add(page + 1);

    const sorted = Array.from(window).sort((a, b) => a - b);
    const withGaps: Array<number | "gap"> = [];

    sorted.forEach((value, index) => {
      if (index > 0 && value - sorted[index - 1] > 1) withGaps.push("gap");
      withGaps.push(value);
    });

    return withGaps;
  }, [result]);

  if (result.totalItems === 0) return null;

  const rangeStart = (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.totalItems);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3 transition-opacity sm:flex-row",
        isPending && "opacity-70",
      )}
    >
      <p className="text-xs text-muted tnum">
        {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} of{" "}
        {formatNumber(result.totalItems)}
      </p>

      <div className="flex items-center gap-1">
        <PageButton
          onClick={() => goToPage(result.page - 1)}
          disabled={result.page <= 1}
          label="Previous page"
        >
          Prev
        </PageButton>

        {pages.map((page, index) =>
          page === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-xs text-muted">
              …
            </span>
          ) : (
            <PageButton
              key={page}
              onClick={() => goToPage(page)}
              isActive={page === result.page}
              label={`Page ${page}`}
            >
              {page}
            </PageButton>
          ),
        )}

        <PageButton
          onClick={() => goToPage(result.page + 1)}
          disabled={result.page >= result.totalPages}
          label="Next page"
        >
          Next
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  isActive,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "min-w-8 rounded-md border px-2 py-1 text-xs tnum transition-colors",
        isActive
          ? "border-accent bg-accent font-medium text-white"
          : "border-line text-muted hover:bg-surface-2 hover:text-content",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
