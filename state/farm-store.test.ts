/**
 * Store smoke tests — plain tsx + console.assert (no test framework yet).
 * Run: npx tsx state/farm-store.test.ts
 */

import { useFarmStore } from "./farm-store";
import type { Farm } from "@/lib/types";

const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);

const SOIL = {
  textureClass: "silt loam",
  fieldCapacityMmPerM: 280,
  wiltingPointMmPerM: 120,
  latitude: 41.9,
  longitude: -93.6,
};
const FARM: Farm = {
  id: "test1",
  name: "test farm",
  crop: "corn",
  plantDate: "2026-04-15",
  latitude: 41.9,
  longitude: -93.6,
  areaAcres: 100,
  soil: SOIL,
};
const WEATHER = (date: string, et0 = 6, rain = 0, fc3 = 0) => ({
  todayDate: date,
  todayEt0Mm: et0,
  todayRainfallMm: rain,
  forecastRainNext3DaysMm: fc3,
  fetchedAt: new Date().toISOString(),
});
const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

const store = useFarmStore;

// 1. initial state
store.getState().clearFarm();
check("init farm null", store.getState().farm === null);
check("init history empty", store.getState().history.length === 0);
check("init rec null", store.getState().recommendation === null);

// 2. setFarm + setWeather → recommendation populated
store.getState().setFarm(FARM);
store.getState().setWeather(WEATHER("2026-07-24", 6, 0, 0));
const s2 = store.getState();
check("rec populated after weather", s2.recommendation !== null);
check(
  "fresh moisture = TAW (~100%)",
  s2.recommendation!.soilMoisturePct > 99,
  `${s2.recommendation!.soilMoisturePct.toFixed(1)}%`,
);

// 3. advanceDay → history grows, moisture drops
const recBefore = store.getState().recommendation!.soilMoisturePct;
store.getState().advanceDay();
const s3 = store.getState();
check("history.length 1", s3.history.length === 1, `${s3.history.length}`);
check("moisture dropped after a day", s3.recommendation!.soilMoisturePct < recBefore);

// 4. multi-day depletion — 12 dry days, valid consecutive dates from 2026-07-25
for (let i = 0; i < 12; i++) {
  store.getState().setWeather(WEATHER(addDays("2026-07-25", i), 6, 0, 0));
  store.getState().advanceDay();
}
const s4 = store.getState();
check("13 day history", s4.history.length === 13, `${s4.history.length}`);
check(
  "after dry stretch → partial/full",
  ["partial", "full"].includes(s4.recommendation!.action),
  s4.recommendation!.action,
);

// 5. logIrrigation bumps moisture and changes rec
const beforeIrrig = store.getState().recommendation!.soilMoisturePct;
store.getState().logIrrigation(40);
const s5 = store.getState();
check(
  "irrigation bumped moisture pct",
  s5.recommendation!.soilMoisturePct > beforeIrrig + 10,
  `${beforeIrrig.toFixed(1)}% → ${s5.recommendation!.soilMoisturePct.toFixed(1)}%`,
);
check(
  "last day irrigation recorded",
  s5.history[s5.history.length - 1].irrigationMm === 40,
);

// 6. resetHistory restores moisture to TAW
store.getState().resetHistory();
const s6 = store.getState();
check("history empty after reset", s6.history.length === 0);
check("moisture back to TAW after reset", s6.recommendation!.soilMoisturePct > 99);

// 7. rain-heavy forecast → skip
store.getState().setWeather(WEATHER("2026-07-24", 6, 0, 40));
const s7 = store.getState();
check(
  "rainy forecast → skip",
  s7.recommendation!.action === "skip",
  s7.recommendation!.action,
);
