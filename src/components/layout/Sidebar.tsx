"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/format";

/**
 * Client Component — it reads `usePathname()` to mark the active route.
 *
 * That is the only reason it crosses the boundary. The alternative (passing the
 * pathname down from a Server Component) would re-render the whole tree on
 * every navigation instead of just this one small subtree.
 */

const NAV = [
  {
    href: "/",
    label: "Dashboard",
    icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  },
  {
    href: "/orders",
    label: "Orders",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="flex gap-1 overflow-x-auto border-b border-line px-4 py-2 md:h-full md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
    >
      <div className="hidden px-2 pb-4 md:block">
        <span className="text-sm font-semibold tracking-tight">Northwind</span>
        <span className="mt-0.5 block text-[11px] text-muted">Analytics</span>
      </div>

      {NAV.map((item) => {
        // Exact match for the dashboard root, prefix match elsewhere, so
        // /orders/ord_001 still highlights "Orders".
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-surface-2 font-medium text-content"
                : "text-muted hover:bg-surface-2 hover:text-content",
            )}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
              <path
                d={item.icon}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
