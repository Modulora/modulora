/**
 * Lightweight SVG donut chart — zero dependencies. Renders proportional
 * segments as stroked arcs with a center label. Used for the profit-share
 * split; swap for a full charting lib only if we need interactivity.
 */
import type { ReactNode } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

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
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((seg) => {
          const frac = seg.value / total;
          const gapLen = gap * circumference;
          const len = Math.max(0, frac * circumference - gapLen);
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += frac * circumference;
          return el;
        })}
      </svg>
      {center ? <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div> : null}
    </div>
  );
}
