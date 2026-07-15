/**
 * SparkChart — an interactive daily-series area chart (visx). Hover shows a
 * crosshair, point marker, and a date/value tooltip. Presentational +
 * Storybook-safe; props stayed identical to the static version.
 */
import { useCallback, useMemo } from "react";
import { AreaClosed, LinePath, Bar, Line } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";

export interface SparkPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

const tooltipStyles: React.CSSProperties = {
  ...defaultStyles,
  background: "#111",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fafafa",
  fontSize: 11,
  padding: "6px 8px",
  borderRadius: 8,
};

export function SparkChart({
  points,
  label,
  color = "var(--receipt)",
  height = 72,
  formatValue = (value) => String(value),
}: {
  points: SparkPoint[];
  label: string;
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const chartPoints = points.length > 0 ? points : [{ date: "", value: 0 }];
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-xl border border-border/60 bg-card/35 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{formatValue(total)}</p>
      </div>
      <div className="mt-2" style={{ height }}>
        <ParentSize debounceTime={10}>
          {({ width }) => (width > 0 ? <SparkInner points={chartPoints} color={color} width={width} height={height} label={label} formatValue={formatValue} /> : null)}
        </ParentSize>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function SparkInner({
  points,
  color,
  width,
  height,
  label,
  formatValue,
}: {
  points: SparkPoint[];
  color: string;
  width: number;
  height: number;
  label: string;
  formatValue: (value: number) => string;
}) {
  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<SparkPoint & { index: number }>();

  const xScale = useMemo(
    () => scaleLinear<number>({ domain: [0, Math.max(1, points.length - 1)], range: [0, width] }),
    [points.length, width],
  );
  const yMax = Math.max(1, ...points.map((p) => p.value));
  const yScale = useMemo(
    () => scaleLinear<number>({ domain: [0, yMax], range: [height - 4, 8] }),
    [yMax, height],
  );

  const reveal = useCallback((index: number) => {
    const boundedIndex = Math.min(points.length - 1, Math.max(0, index));
    const datum = points[boundedIndex]!;
    showTooltip({
      tooltipData: { ...datum, index: boundedIndex },
      tooltipLeft: xScale(boundedIndex),
      tooltipTop: yScale(datum.value),
    });
  }, [points, showTooltip, xScale, yScale]);

  const onMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;
      reveal(Math.round(xScale.invert(point.x)));
    },
    [reveal, xScale],
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent<SVGRectElement>) => {
    const current = tooltipData?.index ?? points.length - 1;
    if (event.key === "ArrowLeft") { event.preventDefault(); reveal(current - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); reveal(current + 1); }
    if (event.key === "Home") { event.preventDefault(); reveal(0); }
    if (event.key === "End") { event.preventDefault(); reveal(points.length - 1); }
  }, [points.length, reveal, tooltipData?.index]);

  const gradientId = `spark-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const empty = points.every((p) => p.value === 0);

  return (
    <div className="relative">
      <svg width={width} height={height} role="group" aria-label={`${label} daily series`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Group>
          {empty ? (
            <Line
              from={{ x: 0, y: height - 4 }}
              to={{ x: width, y: height - 4 }}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeDasharray="3 4"
            />
          ) : (
            <>
              <AreaClosed
                data={points}
                x={(_, i) => xScale(i)}
                y={(d) => yScale(d.value)}
                yScale={yScale}
                fill={`url(#${gradientId})`}
              />
              <LinePath
                data={points}
                x={(_, i) => xScale(i)}
                y={(d) => yScale(d.value)}
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )}
          {tooltipData ? (
            <>
              <Line
                from={{ x: tooltipLeft ?? 0, y: 0 }}
                to={{ x: tooltipLeft ?? 0, y: height }}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={1}
              />
              <circle cx={tooltipLeft} cy={tooltipTop} r={3.5} fill={color} stroke="#0b0b0b" strokeWidth={1.5} />
            </>
          ) : null}
          <Bar
            width={width}
            height={height}
            fill="transparent"
            stroke={tooltipData ? "var(--ring)" : "transparent"}
            strokeWidth={1}
            tabIndex={0}
            role="slider"
            aria-label={`${label} chart. Use left and right arrow keys to inspect dates.`}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, points.length - 1)}
            aria-valuenow={tooltipData?.index ?? points.length - 1}
            aria-valuetext={tooltipData ? `${tooltipData.date}: ${formatValue(tooltipData.value)}` : undefined}
            onFocus={() => reveal(points.length - 1)}
            onKeyDown={onKeyDown}
            onPointerMove={onMove}
            onPointerLeave={hideTooltip}
            onBlur={hideTooltip}
          />
        </Group>
      </svg>
      {tooltipData ? (
        <TooltipWithBounds left={(tooltipLeft ?? 0) + 8} top={(tooltipTop ?? 0) - 12} style={tooltipStyles}>
          <span className="tabular-nums">{formatValue(tooltipData.value)}</span>
          <span style={{ opacity: 0.6 }}> · {tooltipData.date.slice(5)}</span>
        </TooltipWithBounds>
      ) : null}
    </div>
  );
}
