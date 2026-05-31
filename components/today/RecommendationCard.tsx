"use client";

import { Card } from "@/components/ui/card";
import type { Recommendation } from "@/lib/types";

interface RecommendationCardProps {
  rec: Recommendation;
  et0Today: number;
}

const ACTION_LABEL: Record<Recommendation["action"], string> = {
  skip: "SKIP",
  partial: "PARTIAL",
  full: "FULL",
};

const ACTION_BADGE: Record<Recommendation["action"], string> = {
  skip: "bg-slate-200 text-slate-700",
  partial: "bg-amber-100 text-amber-800",
  full: "bg-teal-100 text-teal-800",
};

export function RecommendationCard({ rec, et0Today }: RecommendationCardProps) {
  const mmLabel = rec.mmNeeded === 0 ? "0 mm" : `${rec.mmNeeded.toFixed(1)} mm`;

  return (
    <Card className="flex flex-col items-center gap-5 p-8 md:p-10">
      <span
        className={`self-start rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${ACTION_BADGE[rec.action]}`}
      >
        {ACTION_LABEL[rec.action]}
      </span>

      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-6xl font-bold tracking-tight md:text-7xl">
          {mmLabel}
        </span>
        {rec.mmNeeded > 0 && (
          <span className="text-lg text-slate-500">
            = {rec.litersPerAcre.toLocaleString()} L per acre
          </span>
        )}
      </div>

      <p className="max-w-md text-center text-base leading-relaxed text-slate-600 dark:text-slate-400">
        {rec.reason}
      </p>

      <div className="flex w-full justify-between border-t pt-4 text-sm">
        <span>Days of reserve: {rec.daysOfReserveLeft}</span>
        <span>ET₀ today: {et0Today.toFixed(1)} mm</span>
      </div>
    </Card>
  );
}
