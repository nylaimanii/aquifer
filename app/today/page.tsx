"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/state/farm-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecommendationCard } from "@/components/today/RecommendationCard";
import { SoilMoistureGauge } from "@/components/today/SoilMoistureGauge";
import { StatusPills } from "@/components/today/StatusPills";

const ACCENT = "bg-[#1E7A9B] hover:bg-[#1A6B88] text-white";

export default function TodayPage() {
  const router = useRouter();
  const farm = useFarmStore((s) => s.farm);
  const weather = useFarmStore((s) => s.weather);
  const recommendation = useFarmStore((s) => s.recommendation);
  const weatherStatus = useFarmStore((s) => s.weatherStatus);
  const soilStatus = useFarmStore((s) => s.soilStatus);

  function handleClear() {
    if (!window.confirm("Clear this farm and start over?")) return;
    useFarmStore.getState().clearFarm();
    router.push("/setup");
  }

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

  const hasError = weatherStatus === "error" || soilStatus === "error";
  const et0Today = weather?.today.et0OurMm ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      {/* header strip */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Today</h1>
            {weather?.today.date && (
              <span className="text-sm text-slate-500">{weather.today.date}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{farm.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" render={<Link href="/setup" />}>
            Change farm
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Clear farm
          </Button>
        </div>
      </div>

      {/* main grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {hasError ? (
          <Card className="flex flex-col items-center gap-4 p-8 text-center">
            <h2 className="text-lg font-semibold">Couldn&apos;t load data</h2>
            <p className="text-sm text-slate-500">
              {weatherStatus === "error" && "Weather fetch failed. "}
              {soilStatus === "error" && "Soil fetch failed. "}
            </p>
            <Button
              className={ACCENT}
              onClick={() => void useFarmStore.getState().fetchAll()}
            >
              Retry
            </Button>
          </Card>
        ) : recommendation ? (
          <RecommendationCard rec={recommendation} et0Today={et0Today} />
        ) : (
          <Card className="flex min-h-[260px] items-center justify-center p-8">
            <p className="text-sm text-slate-500">Computing…</p>
          </Card>
        )}

        <SoilMoistureGauge
          pct={recommendation?.soilMoisturePct ?? 0}
          textureClass={farm.soil?.textureClass}
          isLoading={!recommendation && !hasError}
        />
      </div>

      {/* status pills */}
      <div className="mt-6">
        <StatusPills weatherStatus={weatherStatus} soilStatus={soilStatus} />
      </div>
    </main>
  );
}
