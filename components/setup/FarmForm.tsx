"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPicker } from "./MapPicker";
import { CropPicker } from "./CropPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useFarmStore } from "@/state/farm-store";
import type { CropId, Farm, FetchStatus } from "@/lib/types";

const ACCENT = "bg-[#1E7A9B] hover:bg-[#1A6B88] text-white";

function StatusPill({ label, status }: { label: string; status: FetchStatus }) {
  const text =
    status === "loading"
      ? "loading…"
      : status === "ready"
        ? "ready"
        : status === "error"
          ? "error"
          : "idle";
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
      {label}: {text}
    </span>
  );
}

export function FarmForm() {
  const router = useRouter();
  const weatherStatus = useFarmStore((s) => s.weatherStatus);
  const soilStatus = useFarmStore((s) => s.soilStatus);

  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [crop, setCrop] = useState<CropId | undefined>(undefined);
  const [plantDate, setPlantDate] = useState<string>("");
  const [areaAcres, setAreaAcres] = useState<string>("");

  const area = parseFloat(areaAcres);
  const ready =
    lat !== null &&
    lon !== null &&
    crop !== undefined &&
    plantDate !== "" &&
    Number.isFinite(area) &&
    area > 0;

  function handleSave() {
    if (!ready || lat === null || lon === null || crop === undefined) return;
    const farm: Farm = {
      id: crypto.randomUUID(),
      name: `Farm at ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      crop,
      plantDate,
      latitude: lat,
      longitude: lon,
      areaAcres: area,
      soil: null, // filled by fetchSoil
    };
    useFarmStore.getState().setFarm(farm);
    router.push("/today");
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Map — left 2/3 on md+ */}
      <div className="flex min-h-[400px] flex-col md:col-span-2">
        <MapPicker
          onSelect={(la, lo) => {
            setLat(la);
            setLon(lo);
          }}
        />
        <p className="text-muted-foreground mt-2 text-sm">
          {lat !== null && lon !== null
            ? `Pin: ${lat.toFixed(4)}, ${lon.toFixed(4)}`
            : "Click the map to drop a pin on your field."}
        </p>
      </div>

      {/* Form — right 1/3 */}
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid gap-2">
          <Label htmlFor="crop">Crop</Label>
          <CropPicker value={crop} onChange={setCrop} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="plantDate">Plant date</Label>
          <Input
            id="plantDate"
            type="date"
            value={plantDate}
            onChange={(e) => setPlantDate(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="area">Area (acres)</Label>
          <Input
            id="area"
            type="number"
            min={0.1}
            step={0.1}
            placeholder="e.g. 100"
            value={areaAcres}
            onChange={(e) => setAreaAcres(e.target.value)}
          />
        </div>

        <Button
          className={ACCENT}
          disabled={!ready}
          onClick={handleSave}
        >
          Save &amp; Continue
        </Button>

        <div className="flex flex-wrap gap-2">
          <StatusPill label="Weather" status={weatherStatus} />
          <StatusPill label="Soil" status={soilStatus} />
        </div>
      </Card>
    </div>
  );
}
