// scenario asserts (run: npx tsx lib/recommender.test.ts)
import { recommend } from "./recommender";
import { CROPS } from "./crop-coefficients";
import { close } from "./test-utils";
import type { SoilProfile } from "./types";

console.log("=== recommender.test.ts ===");

const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);

const SOIL: SoilProfile = {
  textureClass: "silt loam",
  fieldCapacityMmPerM: 280,
  wiltingPointMmPerM: 120,
  latitude: 41.9,
  longitude: -93.6,
};
const CORN = CROPS["corn"];

const PLANT = "2026-04-15";
// day 100 → mid-season (corn mid starts at day 71), Kc = 1.20
const TODAY = new Date(Date.parse(PLANT) + 100 * 86_400_000)
  .toISOString()
  .slice(0, 10);

const base = {
  today: TODAY,
  plantDate: PLANT,
  crop: CORN,
  soil: SOIL,
  areaAcres: 1,
  et0Mm: 6,
};

// 1. STRESSED: moisture 50 → depletion 110 > RAW 88
const r1 = recommend({ ...base, moistureMm: 50, forecastRainNext3DaysMm: 0 });
check("stressed → full", r1.action === "full", r1.action);
check("stressed mm ≈ 110", close(r1.mmNeeded, 110, 0.5), `${r1.mmNeeded}`);
check(
  "stressed L/acre ≈ 445k",
  r1.litersPerAcre > 440000 && r1.litersPerAcre < 450000,
  `${r1.litersPerAcre}`,
);
check(
  "r1 soilMoisturePct ≈ 31.25",
  r1.soilMoisturePct > 30 && r1.soilMoisturePct < 32,
  `${r1.soilMoisturePct.toFixed(2)}`,
);

// 2. RAIN: moisture 100, ETc*3=21.6, forecast 30 ≥ 21.6
const r2 = recommend({ ...base, moistureMm: 100, forecastRainNext3DaysMm: 30 });
check("rain → skip 0", r2.action === "skip" && r2.mmNeeded === 0, `${r2.action} ${r2.mmNeeded}`);
check("rain reason mentions rain", /rain forecast/i.test(r2.reason));

// 3. APPROACHING: moisture 80, depletion 80, 80 + 14.4 = 94.4 > 88
const r3 = recommend({ ...base, moistureMm: 80, forecastRainNext3DaysMm: 0 });
check("approaching → partial", r3.action === "partial", r3.action);
check("partial mm in (0,80]", r3.mmNeeded > 0 && r3.mmNeeded <= 80, `${r3.mmNeeded.toFixed(2)}`);

// 4. BUFFER: moisture 150, depletion 10, plenty of reserve
const r4 = recommend({ ...base, moistureMm: 150, forecastRainNext3DaysMm: 0 });
check("buffer → skip 0", r4.action === "skip" && r4.mmNeeded === 0, r4.action);
check("buffer reserve days ≥ 9", r4.daysOfReserveLeft >= 9, `${r4.daysOfReserveLeft}`);
check("buffer reason mentions reserve", /days of reserve/i.test(r4.reason));
