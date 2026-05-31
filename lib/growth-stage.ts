import type { Crop, GrowthStage } from "./types";

const MS_PER_DAY = 86_400_000;

/** Whole days from plantDate to today (ISO dates). Negative clamps to 0. */
function daysSincePlanting(plantDate: string, today: string): number {
  const plant = Date.parse(plantDate);
  const now = Date.parse(today);
  const diff = Math.floor((now - plant) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
}

/**
 * Returns the FAO-56 growth stage for a crop given its planting date and
 * the current date. Walks the cumulative stage lengths; anything past the
 * total season length is 'late-season'.
 */
export function getStage(
  plantDate: string,
  today: string,
  crop: Crop,
): GrowthStage {
  const day = daysSincePlanting(plantDate, today);
  const { initial, development, mid } = crop.stageLengthsDays;

  if (day < initial) return "initial";
  if (day < initial + development) return "development";
  if (day < initial + development + mid) return "mid-season";
  return "late-season";
}

/**
 * Current crop coefficient Kc, with FAO-56 linear interpolation across the
 * development (initial→mid) and late-season (mid→end) ramps. Flat at kc.initial
 * during the initial stage, flat at kc.mid through mid-season, and clamped at
 * kc.end once the season is over.
 */
export function currentKc(
  plantDate: string,
  today: string,
  crop: Crop,
): number {
  const day = daysSincePlanting(plantDate, today);
  const { initial: lIni, development: lDev, mid: lMid, late: lLate } =
    crop.stageLengthsDays;
  const { initial: kcIni, mid: kcMid, end: kcEnd } = crop.kc;

  if (day < lIni) return kcIni;
  if (day < lIni + lDev) {
    const frac = (day - lIni) / lDev;
    return kcIni + frac * (kcMid - kcIni);
  }
  if (day < lIni + lDev + lMid) return kcMid;
  if (day < lIni + lDev + lMid + lLate) {
    const frac = (day - (lIni + lDev + lMid)) / lLate;
    return kcMid + frac * (kcEnd - kcMid);
  }
  return kcEnd;
}
