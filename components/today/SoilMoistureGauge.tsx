"use client";

import { Card } from "@/components/ui/card";

interface SoilMoistureGaugeProps {
  pct: number;
  textureClass?: string;
  degraded?: boolean;
  isLoading?: boolean;
}

/** Color zone for the arc fill — UI heuristic, not the crop-specific RAW line. */
function zoneColor(pct: number): string {
  if (pct < 25) return "#ef4444"; // red-500 (critical)
  if (pct < 50) return "#f59e0b"; // amber-500 (stress)
  return "#10b981"; // emerald-500 (healthy)
}

/** SVG arc path from the left of the semicircle, swept by pct (0–100). */
function fillArcPath(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const angle = Math.PI * (clamped / 100);
  const theta = Math.PI - angle; // measured from east, standard coords
  const endX = 100 + 80 * Math.cos(theta);
  const endY = 100 - 80 * Math.sin(theta); // SVG y grows downward
  return `M 20 100 A 80 80 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

export function SoilMoistureGauge({
  pct,
  textureClass,
  degraded,
  isLoading,
}: SoilMoistureGaugeProps) {
  if (isLoading) {
    return (
      <Card className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8">
        <div className="h-24 w-48 animate-pulse rounded-t-full bg-slate-200 dark:bg-slate-700" />
        <p className="text-sm text-slate-500">Waiting for data…</p>
      </Card>
    );
  }

  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <Card className="flex flex-col items-center justify-center gap-2 p-8">
      <svg viewBox="0 0 200 120" className="w-full max-w-xs">
        {/* background track */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          stroke="#e5e7eb"
          strokeWidth={14}
          fill="none"
          strokeLinecap="round"
        />
        {/* colored fill arc */}
        <path
          d={fillArcPath(clamped)}
          stroke={zoneColor(clamped)}
          strokeWidth={14}
          fill="none"
          strokeLinecap="round"
        />
        {/* center labels */}
        <text
          x="100"
          y="85"
          textAnchor="middle"
          className="fill-slate-900 text-4xl font-bold dark:fill-slate-50"
        >
          {clamped.toFixed(0)}%
        </text>
        <text
          x="100"
          y="105"
          textAnchor="middle"
          className="fill-slate-500 text-xs"
        >
          soil moisture
        </text>
      </svg>
      {textureClass && (
        <p className="text-sm text-slate-500">
          soil: {textureClass}
          {degraded && !textureClass.includes("estimated") ? " (estimated)" : ""}
        </p>
      )}
    </Card>
  );
}
