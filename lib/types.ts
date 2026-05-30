/**
 * AQUIFER core domain types.
 *
 * Pure type declarations only — no logic, no runtime values.
 * The engine (penman-monteith, soil-balance, recommender) and the
 * zustand store all read from these shapes. One source of truth.
 */

/** Crops AQUIFER supports (FAO-56 Kc table coverage). */
export type CropId =
  | "corn"
  | "wheat"
  | "soybeans"
  | "tomato"
  | "cotton"
  | "almonds"
  | "rice"
  | "potato";

/** FAO-56 crop growth stages. */
export type GrowthStage = "initial" | "development" | "mid-season" | "late-season";

/** Static crop parameters from the FAO-56 reference tables. */
export interface Crop {
  id: CropId;
  displayName: string;
  /** Crop coefficients by stage (initial, mid-season peak, end of late-season). */
  kc: { initial: number; mid: number; end: number };
  /** Length of each growth stage in days. */
  stageLengthsDays: {
    initial: number;
    development: number;
    mid: number;
    late: number;
  };
  /** Maximum effective rooting depth, metres. */
  rootDepthM: number;
  /** Allowable soil-moisture depletion before stress (p in FAO-56), 0–1. */
  depletionFraction: number;
}

/** Soil water-holding characteristics at a location (from SoilGrids). */
export interface SoilProfile {
  textureClass: string;
  /** Water held at field capacity, mm of water per metre of soil depth. */
  fieldCapacityMmPerM: number;
  /** Water held at permanent wilting point, mm per metre. */
  wiltingPointMmPerM: number;
  latitude: number;
  longitude: number;
}

/** A single field the farmer is tracking. */
export interface Farm {
  id: string;
  name: string;
  crop: CropId;
  /** Planting date, ISO 8601 (YYYY-MM-DD). */
  plantDate: string;
  latitude: number;
  longitude: number;
  areaAcres: number;
  soil: SoilProfile | null;
}

/** One simulated day in the season's water-balance history. */
export interface DailyEntry {
  /** ISO 8601 date (YYYY-MM-DD). */
  date: string;
  /** Reference evapotranspiration, mm. */
  et0Mm: number;
  /** Crop evapotranspiration (Kc × ET₀), mm. */
  etcMm: number;
  rainfallMm: number;
  irrigationMm: number;
  /** Soil moisture in the root zone at end of day, mm. */
  soilMoistureMm: number;
  stage: GrowthStage;
}

/** Today's irrigation recommendation, derived from current state. */
export interface Recommendation {
  /** ISO 8601 date the recommendation is for. */
  date: string;
  action: "skip" | "partial" | "full";
  /** Recommended water to apply today, mm. */
  mmNeeded: number;
  litersPerAcre: number;
  /** Current root-zone moisture as a percentage of available capacity, 0–100. */
  soilMoisturePct: number;
  reason: string;
  /** Days of moisture reserve left before crossing the stress threshold. */
  daysOfReserveLeft: number;
}
