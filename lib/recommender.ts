/**
 * Irrigation recommender — turns current field state into an action.
 *
 * This is the function the entire UI calls. It composes the engine:
 * crop coefficient (growth-stage), ET₀ (penman-monteith, passed in), and the
 * soil reservoir (soil-balance). Pure, deterministic — no network, no UI.
 *
 * Decision tree is PRIORITY-ORDERED, first match wins. A stressed crop needs
 * water now, so the stress check runs before the rain check.
 */

import type { Crop, SoilProfile, Recommendation } from "./types";
import { totalAvailableWater, readilyAvailableWater } from "./soil-balance";
import { currentKc } from "./growth-stage";

/** 1 mm of water spread over 1 acre = 4046.86 L. */
const LITERS_PER_MM_PER_ACRE = 4046.86;

export interface RecommendInput {
  /** ISO date 'YYYY-MM-DD'. */
  today: string;
  /** ISO date 'YYYY-MM-DD'. */
  plantDate: string;
  crop: Crop;
  soil: SoilProfile;
  areaAcres: number;
  moistureMm: number;
  et0Mm: number;
  forecastRainNext3DaysMm: number;
}

export function recommend(input: RecommendInput): Recommendation {
  const {
    today,
    plantDate,
    crop,
    soil,
    moistureMm,
    et0Mm,
    forecastRainNext3DaysMm,
  } = input;

  const kc = currentKc(plantDate, today, crop);
  const etc = kc * et0Mm;

  const taw = totalAvailableWater(soil, crop);
  const raw = readilyAvailableWater(taw, crop);
  const depletion = Math.max(0, taw - moistureMm);
  const soilMoisturePct = (moistureMm / taw) * 100;
  const daysOfReserveLeft =
    depletion < raw && etc > 0 ? Math.floor((raw - depletion) / etc) : 0;

  const r1 = (n: number) => n.toFixed(1);

  let action: Recommendation["action"];
  let mmNeeded: number;
  let reason: string;

  if (depletion > raw) {
    // 1. past the stress threshold — refill to capacity, now.
    action = "full";
    mmNeeded = depletion;
    reason = `crop is past stress threshold (depletion ${r1(depletion)} mm > ${r1(raw)} mm RAW). refill to capacity.`;
  } else if (forecastRainNext3DaysMm >= etc * 3) {
    // 2. forecast rain covers the next three days of demand.
    action = "skip";
    mmNeeded = 0;
    reason = `${r1(forecastRainNext3DaysMm)} mm rain forecast in next 3 days covers crop demand (~${r1(etc * 3)} mm).`;
  } else if (depletion + etc * 2 > raw) {
    // 3. will cross the stress line within ~1–2 days — partial top-up.
    action = "partial";
    mmNeeded = Math.min(depletion, etc * 3);
    reason = `approaching stress within 1–2 days at current ET rate (${r1(etc)} mm/day). partial top-up.`;
  } else {
    // 4. plenty of buffer — hold.
    action = "skip";
    mmNeeded = 0;
    reason = `soil has ${daysOfReserveLeft} days of reserve at current ET rate (${r1(etc)} mm/day). hold.`;
  }

  return {
    date: today,
    action,
    mmNeeded,
    litersPerAcre: Math.round(mmNeeded * LITERS_PER_MM_PER_ACRE),
    soilMoisturePct,
    reason,
    daysOfReserveLeft,
  };
}

// --- scenario asserts (run: npx tsx lib/recommender.ts) ---
if (require.main === module) {
  const { CROPS } = require("./crop-coefficients") as typeof import("./crop-coefficients");

  const close = (a: number, b: number, tol: number): boolean =>
    Math.abs(a - b) <= tol;
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
}
