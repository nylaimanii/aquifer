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
