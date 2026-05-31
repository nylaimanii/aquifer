"use client";

import type { FetchStatus } from "@/lib/types";

function Pill({ label, status }: { label: string; status: FetchStatus }) {
  const text = status === "loading" ? "loading…" : status;
  const tone =
    status === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : status === "error"
        ? "bg-red-100 text-red-800"
        : status === "loading"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}: {text}
    </span>
  );
}

interface StatusPillsProps {
  weatherStatus: FetchStatus;
  soilStatus: FetchStatus;
}

export function StatusPills({ weatherStatus, soilStatus }: StatusPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill label="Weather" status={weatherStatus} />
      <Pill label="Soil" status={soilStatus} />
    </div>
  );
}
