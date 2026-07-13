/**
 * Donut — interactive proportional segments (visx Pie). Hovering a segment
 * lifts it and shows a label/percent tooltip; the center slot swaps to the
 * hovered segment's numbers. Props unchanged from the static version, so
 * every call site (docs MDX, stories) keeps working.
 */
import { useState, type ReactNode } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
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

export function Donut({
  segments,
  size = 200,
  thickness = 26,
  gap = 0.012,
  center,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  gap?: number; // fraction of the circle left blank between segments
  center?: ReactNode;
}) {
  const radius = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const [active, setActive] = useState<DonutSegment | null>(null);
  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<DonutSegment>();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        <Group top={radius} left={radius}>
          <Pie
            data={segments}
            pieValue={(d) => d.value}
            outerRadius={(arc) => (active?.label === arc.data.label ? radius : radius - 4)}
            innerRadius={(arc) => (active?.label === arc.data.label ? radius - thickness - 2 : radius - 4 - thickness)}
            padAngle={gap * Math.PI * 2}
            pieSort={null}
            pieSortValues={null}
            cornerRadius={3}
          >
            {(pie) =>
              pie.arcs.map((arc) => (
                <path
                  key={arc.data.label}
                  d={pie.path(arc) ?? undefined}
                  fill={arc.data.color}
                  opacity={active && active.label !== arc.data.label ? 0.45 : 1}
                  style={{ transition: "opacity 150ms ease" }}
                  onPointerMove={(event) => {
                    const point = localPoint(event);
                    setActive(arc.data);
                    showTooltip({ tooltipData: arc.data, tooltipLeft: point?.x ?? 0, tooltipTop: point?.y ?? 0 });
                  }}
                  onPointerLeave={() => {
                    setActive(null);
                    hideTooltip();
                  }}
                />
              ))
            }
          </Pie>
        </Group>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {active ? (
          <>
            <span className="text-2xl font-bold tabular-nums">{Math.round((active.value / total) * 100)}%</span>
            <span className="mt-0.5 max-w-[7rem] text-[10px] leading-tight text-muted-foreground">{active.label}</span>
          </>
        ) : (
          center
        )}
      </div>
      {tooltipData ? (
        <TooltipWithBounds left={(tooltipLeft ?? 0) + 10} top={(tooltipTop ?? 0) - 8} style={tooltipStyles}>
          <span style={{ color: tooltipData.color }}>●</span> {tooltipData.label}{" "}
          <span className="tabular-nums">{Math.round((tooltipData.value / total) * 100)}%</span>
        </TooltipWithBounds>
      ) : null}
    </div>
  );
}
