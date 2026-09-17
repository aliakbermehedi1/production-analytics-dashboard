"use client";

import { memo, useCallback, useId, useMemo, useState } from "react";
import {
  formatShortDate,
  formatCompactCurrency,
  formatNumber,
  cn,
} from "@/lib/utils/format";
import type { TimeSeriesPoint } from "@/types/domain";

/**
 * Charts are hand-rolled SVG rather than a charting library.
 *
 * Recharts and its peers cost 90–130 kB gzipped and would need to ship to the
 * browser for what is, geometrically, a polyline and a set of rects. Two small
 * chart shapes are cheaper to write than to import, and the client bundle stays
 * proportional to what the page actually does.
 *
 * This is a Client Component because it tracks a hovered index for the tooltip.
 */

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 200;
const PADDING = { top: 12, right: 8, bottom: 22, left: 8 };

/**
 * A lookup rather than a prop function.
 *
 * The Server Component parent cannot pass `formatCompactCurrency` itself as a
 * prop — the React Server Components boundary only allows serializable values
 * (strings, numbers, plain objects/arrays) to cross from server to client,
 * and a function reference is not serializable. Passing one throws exactly the
 * "Functions cannot be passed directly to Client Components" error. The fix is
 * to send a plain string tag and resolve it to the real formatter *inside* the
 * Client Component, where the function actually lives.
 */
const FORMATTERS = {
  currency: formatCompactCurrency,
  number: formatNumber,
} as const;

type FormatType = keyof typeof FORMATTERS;

interface TrendChartProps {
  data: TimeSeriesPoint[];
  variant: "area" | "bar";
  formatType: FormatType;
  ariaLabel: string;
}

function TrendChartImpl({
  data,
  variant,
  formatType,
  ariaLabel,
}: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // useId keeps the gradient id unique when two charts render on one page —
  // duplicate SVG ids would make the second chart reference the first's fill.
  const gradientId = useId();
  const formatValue = FORMATTERS[formatType];

  /**
   * Geometry is derived from `data` only. Without useMemo this recomputes on
   * every hover — the state that changes most often here — rebuilding every
   * path string for a value that did not change.
   */
  const geometry = useMemo(() => {
    const innerWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;

    if (data.length === 0) {
      return { points: [], areaPath: "", linePath: "", max: 0, innerHeight, innerWidth };
    }

    const max = Math.max(...data.map((d) => d.value), 0);
    // A flat all-zero series would divide by zero; fall back to 1 so the
    // baseline renders instead of producing NaN coordinates.
    const scale = max === 0 ? 1 : max;

    const step = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

    const points = data.map((point, index) => ({
      ...point,
      x: PADDING.left + index * step,
      y: PADDING.top + innerHeight - (point.value / scale) * innerHeight,
      index,
    }));

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");

    const baseline = PADDING.top + innerHeight;
    const areaPath =
      points.length > 0
        ? `${linePath} L${points[points.length - 1].x.toFixed(2)} ${baseline} L${points[0].x.toFixed(2)} ${baseline} Z`
        : "";

    return { points, areaPath, linePath, max, innerHeight, innerWidth };
  }, [data]);

  /**
   * Stable handler so the invisible hit-area rects below don't get a new
   * onMouseEnter identity on every render.
   */
  const handleEnter = useCallback((index: number) => {
    setHoverIndex(index);
  }, []);

  const handleLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const { points, areaPath, linePath, innerHeight, innerWidth } = geometry;
  const active = hoverIndex !== null ? points[hoverIndex] : null;
  const barWidth = points.length > 0 ? Math.max(2, (innerWidth / points.length) * 0.6) : 0;

  if (points.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-xs text-muted">
        No data for this period.
      </p>
    );
  }

  return (
    <div className="relative px-5 pb-4 pt-2">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
        onMouseLeave={handleLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal guides at 0/50/100% of the range. */}
        {[0, 0.5, 1].map((ratio) => {
          const y = PADDING.top + innerHeight * ratio;
          return (
            <line
              key={ratio}
              x1={PADDING.left}
              x2={VIEWBOX_WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {variant === "area" ? (
          <>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          points.map((point) => (
            <rect
              key={point.date}
              x={point.x - barWidth / 2}
              y={point.y}
              width={barWidth}
              height={Math.max(0, PADDING.top + innerHeight - point.y)}
              rx="1"
              fill="var(--accent)"
              opacity={hoverIndex === null || hoverIndex === point.index ? 0.85 : 0.35}
            />
          ))
        )}

        {active ? (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              stroke="var(--muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            {variant === "area" ? (
              <circle
                cx={active.x}
                cy={active.y}
                r="4"
                fill="var(--surface)"
                stroke="var(--accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </>
        ) : null}

        {/*
          Transparent hit areas. One per point, full height, so the tooltip
          triggers anywhere in the column rather than only on the 2px line.
        */}
        {points.map((point) => (
          <rect
            key={`hit-${point.date}`}
            x={point.x - innerWidth / points.length / 2}
            y={0}
            width={innerWidth / points.length}
            height={VIEWBOX_HEIGHT}
            fill="transparent"
            onMouseEnter={() => handleEnter(point.index)}
          />
        ))}
      </svg>

      {/* First / middle / last date labels — a label per day would be unreadable. */}
      <div className="mt-1 flex justify-between text-[10px] text-muted tnum">
        <span>{formatShortDate(points[0].date)}</span>
        {points.length > 2 ? (
          <span>{formatShortDate(points[Math.floor(points.length / 2)].date)}</span>
        ) : null}
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>

      {active ? (
        <div
          className={cn(
            "pointer-events-none absolute top-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm",
          )}
          style={{
            // Position as a percentage of the container so the tooltip tracks
            // the point through the SVG's responsive scaling.
            left: `calc(${(active.x / VIEWBOX_WIDTH) * 100}% - 2rem)`,
          }}
        >
          <span className="block text-[10px] text-muted">
            {formatShortDate(active.date)}
          </span>
          <span className="block font-medium tnum">{formatValue(active.value)}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Memoised: the dashboard re-renders when sibling islands update their own
 * state, and re-running this chart's geometry for identical data is wasted work.
 */
export const TrendChart = memo(TrendChartImpl);
