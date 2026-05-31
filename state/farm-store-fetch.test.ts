/**
 * Store fetch-integration tests — mocked fetch, no network.
 * Run: npx tsx state/farm-store-fetch.test.ts
 */

import fs from "fs";
import { useFarmStore } from "./farm-store";
import type { Farm } from "@/lib/types";
import { parseOpenMeteoResponse } from "@/lib/weather-fetch";
import { parseSoilGridsResponse } from "@/lib/soil-fetch";

const close = (a: number, b: number, tol: number): boolean =>
  Math.abs(a - b) <= tol;
const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Build the payloads the routes would return, from the raw fixtures.
const weatherFixture = JSON.parse(
  fs.readFileSync("lib/__fixtures__/open-meteo-iowa.json", "utf8"),
);
const soilFixtureRaw = JSON.parse(
  fs.readFileSync("lib/__fixtures__/soilgrids-iowa.json", "utf8"),
);
const weatherPayload = parseOpenMeteoResponse(weatherFixture);
const soilResponse = parseSoilGridsResponse(soilFixtureRaw, 41.7, -93.9);

const goodFetch = (async (url: string) => {
  if (url.includes("/api/weather")) {
    return { ok: true, status: 200, json: async () => weatherPayload };
  }
  if (url.includes("/api/soil")) {
    return { ok: true, status: 200, json: async () => soilResponse };
  }
  return { ok: false, status: 404, json: async () => ({}) };
}) as unknown as typeof fetch;

const FARM: Farm = {
  id: "t",
  name: "test",
  crop: "corn",
  plantDate: "2026-04-15",
  latitude: 41.7,
  longitude: -93.9,
  areaAcres: 100,
  soil: null,
};

async function main() {
  // 1. setFarm triggers fetchAll
  globalThis.fetch = goodFetch;
  useFarmStore.getState().clearFarm();
  useFarmStore.getState().setFarm(FARM);

  let s = useFarmStore.getState();
  check("weather loading immediately", s.weatherStatus === "loading", s.weatherStatus);
  check("soil loading immediately", s.soilStatus === "loading", s.soilStatus);

  await sleep(50);
  s = useFarmStore.getState();
  check("weather ready after await", s.weatherStatus === "ready", s.weatherStatus);
  check("soil ready after await", s.soilStatus === "ready", s.soilStatus);
  check("weather populated", s.weather !== null);
  check("farm.soil populated", s.farm!.soil !== null);
  check("recommendation computed after data arrives", s.recommendation !== null);

  // 2. error path
  globalThis.fetch = (async () => {
    throw new Error("network kaput");
  }) as unknown as typeof fetch;
  useFarmStore.getState().clearFarm();
  useFarmStore.getState().setFarm(FARM);
  await sleep(50);
  s = useFarmStore.getState();
  check("weather error path", s.weatherStatus === "error", s.weatherStatus);
  check(
    "weather error message present",
    s.weatherError !== null && s.weatherError.length > 0,
    s.weatherError ?? "",
  );
  check("soil error path", s.soilStatus === "error", s.soilStatus);

  // 3. soil merge into farm.soil
  globalThis.fetch = goodFetch;
  useFarmStore.getState().clearFarm();
  useFarmStore.getState().setFarm(FARM);
  await sleep(50);
  s = useFarmStore.getState();
  check(
    "soil texture merged",
    s.farm!.soil!.textureClass === soilResponse.textureClass,
    s.farm!.soil!.textureClass,
  );
  check(
    "FC merged",
    close(s.farm!.soil!.fieldCapacityMmPerM, soilResponse.fieldCapacityMmPerM, 0.1),
    `${s.farm!.soil!.fieldCapacityMmPerM.toFixed(1)}`,
  );
}

main();
