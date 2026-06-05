"use client";

import { Droplet, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortDate, weekdayLabel } from "@/lib/format-date";
import type { DailyWeather } from "@/lib/types";

interface ForecastStripProps {
  forecast: DailyWeather[] | undefined;
}

const ACCENT_RGB = "30, 122, 155"; // #1E7A9B

function ForecastTile({ day, index }: { day: DailyWeather; index: number }) {
  const isToday = index === 0;
  const rain = Math.max(0, day.rainfallMm);
  // intensity caps at 20mm = full color
  const intensity = Math.min(1, rain / 20);
  const rainColor =
    rain > 0 ? `rgba(${ACCENT_RGB}, ${(0.45 + 0.55 * intensity).toFixed(2)})` : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900",
        isToday && "ring-2 ring-teal-400/50",
      )}
    >
      <div>
        <div className="text-sm font-semibold">
          {weekdayLabel(day.date, isToday)}
        </div>
        <div className="text-xs text-slate-500">{shortDate(day.date)}</div>
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <Droplet className="h-3 w-3" />
          <span>{day.et0OurMm.toFixed(1)} mm</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1",
            rain > 0 ? "font-medium" : "text-slate-400",
          )}
          style={rainColor ? { color: rainColor } : undefined}
        >
          <CloudRain className="h-3 w-3" />
          <span>{rain.toFixed(1)} mm</span>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        {Math.round(day.tMaxC)}° / {Math.round(day.tMinC)}°
      </div>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="flex h-[110px] animate-pulse flex-col gap-2 rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-800" />
  );
}

export function ForecastStrip({ forecast }: ForecastStripProps) {
  const hasData = forecast && forecast.length > 0;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-medium text-slate-500">7-day outlook</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {hasData
          ? forecast.slice(0, 7).map((day, i) => (
              <ForecastTile key={day.date} day={day} index={i} />
            ))
          : Array.from({ length: 7 }).map((_, i) => <SkeletonTile key={i} />)}
      </div>
    </section>
  );
}
