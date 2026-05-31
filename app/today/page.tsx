"use client";

import Link from "next/link";
import { useFarmStore } from "@/state/farm-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CROPS } from "@/lib/crop-coefficients";
import type { FetchStatus } from "@/lib/types";

const ACCENT = "bg-[#1E7A9B] hover:bg-[#1A6B88] text-white";

function StatusPill({ label, status }: { label: string; status: FetchStatus }) {
  const tone =
    status === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : status === "error"
        ? "bg-red-100 text-red-800"
        : status === "loading"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {label}: {status}
    </span>
  );
}

export default function TodayPage() {
  const farm = useFarmStore((s) => s.farm);
  const weatherStatus = useFarmStore((s) => s.weatherStatus);
  const soilStatus = useFarmStore((s) => s.soilStatus);

  if (!farm) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">No farm set up yet</h1>
        <Button className={ACCENT} render={<Link href="/setup" />}>
          Set up a farm →
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Today</h1>
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-semibold">{farm.name}</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Crop</dt>
          <dd>{CROPS[farm.crop].displayName}</dd>
          <dt className="text-muted-foreground">Plant date</dt>
          <dd>{farm.plantDate}</dd>
          <dt className="text-muted-foreground">Location</dt>
          <dd>
            {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
          </dd>
          <dt className="text-muted-foreground">Area</dt>
          <dd>{farm.areaAcres} acres</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <StatusPill label="Weather" status={weatherStatus} />
          <StatusPill label="Soil" status={soilStatus} />
        </div>
        <p className="text-muted-foreground text-sm italic">
          real today view coming in step 14
        </p>
        <Button
          variant="outline"
          className="w-fit"
          render={<Link href="/setup" />}
        >
          Change farm
        </Button>
      </Card>
    </main>
  );
}
