/**
 * Daily soil-water balance (FAO-56 ch. 8).
 *
 * The soil root zone is a reservoir between wilting point and field capacity.
 * Step 3 (penman-monteith) says how much water the crop wants; this module
 * says how much the soil actually has and whether the crop is stressed.
 *
 * Pure, deterministic math — no network calls, no side effects.
 *
 * v1 simplification: all rainfall is treated as effective (no runoff curve,
 * no canopy interception losses); only over-capacity water becomes runoff.
 */

import type { Crop, SoilProfile, SoilBalanceInput, SoilBalanceResult } from "./types";

/** Total available water in the root zone, mm. FAO-56 eq. 82. */
export function totalAvailableWater(soil: SoilProfile, crop: Crop): number {
  return (soil.fieldCapacityMmPerM - soil.wiltingPointMmPerM) * crop.rootDepthM;
}

/** Readily available water, mm — depletion past this triggers stress. FAO-56 eq. 83. */
export function readilyAvailableWater(taw: number, crop: Crop): number {
  return crop.depletionFraction * taw;
}

/** Water-stress coefficient Ks, clamped to [0,1]. FAO-56 eq. 84. */
export function stressFactor(taw: number, raw: number, depletion: number): number {
  if (depletion <= raw) return 1;
  const ks = (taw - depletion) / (taw - raw);
  return Math.min(1, Math.max(0, ks));
}

/** Advance the root-zone moisture by one day. */
export function stepDay(input: SoilBalanceInput): SoilBalanceResult {
  const { moistureBeforeMm, tawMm, rawMm, et0Mm, kc, rainfallMm, irrigationMm } =
    input;

  // Stress and Ks are evaluated on the moisture going INTO the day.
  const depletionBeforeMm = tawMm - moistureBeforeMm;
  const ksStressFactor = stressFactor(tawMm, rawMm, depletionBeforeMm);

  const etcPotentialMm = kc * et0Mm;
  const etcActualMm = ksStressFactor * etcPotentialMm;

  const net = moistureBeforeMm + rainfallMm + irrigationMm - etcActualMm;

  let moistureAfterMm: number;
  let runoffMm: number;
  if (net > tawMm) {
    runoffMm = net - tawMm;
    moistureAfterMm = tawMm;
  } else if (net < 0) {
    runoffMm = 0;
    moistureAfterMm = 0;
  } else {
    runoffMm = 0;
    moistureAfterMm = net;
  }

  return {
    moistureAfterMm,
    depletionBeforeMm,
    etcPotentialMm,
    etcActualMm,
    ksStressFactor,
    runoffMm,
    isStressed: depletionBeforeMm > rawMm,
  };
}
