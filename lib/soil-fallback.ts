import type { SoilResponse } from "./types";

/**
 * Generic silt-loam profile used when SoilGrids is unreachable or returns a
 * masked/null pixel. Silt loam is the most common agricultural soil class
 * globally; these values match the engine's assert fixtures, so they produce
 * sensible (if less location-specific) recommendations.
 */
export const GENERIC_SILT_LOAM_FALLBACK: Omit<
  SoilResponse,
  "latitude" | "longitude" | "fetchedAt"
> = {
  textureClass: "silt loam (estimated)",
  sandPct: 25,
  siltPct: 55,
  clayPct: 20,
  fieldCapacityMmPerM: 280,
  wiltingPointMmPerM: 130,
  degraded: true,
};
