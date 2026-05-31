/**
 * ISRIC SoilGrids fetch + parse.
 *
 * Split so the parse step is pure and testable against a fixture. SoilGrids is
 * free and keyless, but SLOW (5–20s) and occasionally returns null at masked
 * pixels — the parser fails loudly rather than silently defaulting.
 *
 * Unit handling: SoilGrids stores scaled integers. We parse each property's
 * `d_factor` from the response (never hardcoded) to descale to target units:
 *   - sand/silt/clay: target unit is % → pct = raw / d_factor
 *   - wv0033/wv1500:  target unit is 10⁻² cm³/cm³ → θ = (raw/d_factor)·10⁻²,
 *                     and mm of water per m of soil = θ·1000 = (raw/d_factor)·10
 */

import type { SoilResponse } from "./types";

const SOILGRIDS_BASE =
  "https://rest.isric.org/soilgrids/v2.0/properties/query";

/** Fixed depth-band thicknesses (cm) for the 0–100 cm root zone. Sum = 100. */
const DEPTH_WEIGHTS: Record<string, number> = {
  "0-5cm": 5,
  "5-15cm": 10,
  "15-30cm": 15,
  "30-60cm": 30,
  "60-100cm": 40,
};

export interface LatLon {
  lat: number;
  lon: number;
}

interface SoilGridsLayer {
  name: string;
  unit_measure: { d_factor: number };
  depths: Array<{ label: string; values: { mean: number | null } }>;
}
interface SoilGridsRaw {
  properties: { layers: SoilGridsLayer[] };
}

/** Depth-weighted mean of a layer's raw integer values over 0–100 cm. */
function depthWeightedRaw(layer: SoilGridsLayer): number {
  let sum = 0;
  let totalWeight = 0;
  for (const depth of layer.depths) {
    const weight = DEPTH_WEIGHTS[depth.label];
    if (weight === undefined) continue;
    const mean = depth.values.mean;
    if (mean === null || mean === undefined || Number.isNaN(mean)) {
      throw new Error(
        `soilgrids: null value for ${layer.name} at ${depth.label} (masked pixel?)`,
      );
    }
    sum += mean * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) {
    throw new Error(`soilgrids: no usable depths for ${layer.name}`);
  }
  return sum / totalWeight;
}

/** Simplified USDA texture triangle — display only, not used in any math. */
export function classifyTexture(
  sand: number,
  silt: number,
  clay: number,
): string {
  if (clay >= 40) return "clay";
  if (clay >= 27 && sand <= 20) return "silty clay loam";
  if (clay >= 27 && sand <= 45) return "clay loam";
  if (clay >= 27) return "sandy clay loam";
  if (silt >= 80 && clay < 12) return "silt";
  if (silt >= 50 && clay < 27) return "silt loam";
  // 'sand' (≥85) before 'sandy loam' (≥70) so the more specific class wins.
  if (sand >= 85) return "sand";
  if (sand >= 70 && clay < 15) return "sandy loam";
  return "loam";
}

/** Hit the SoilGrids query endpoint. Returns the raw JSON. */
export async function fetchSoilGrids({ lat, lon }: LatLon): Promise<unknown> {
  const props = ["sand", "silt", "clay", "wv0033", "wv1500"]
    .map((p) => `property=${p}`)
    .join("&");
  const depths = ["0-5cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm"]
    .map((d) => `depth=${d}`)
    .join("&");
  const url = `${SOILGRIDS_BASE}?lon=${lon}&lat=${lat}&${props}&${depths}&value=mean`;

  // SoilGrids is slow — give it 25s before aborting.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      throw new Error(`soilgrids ${res.status}: ${await res.text()}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Pure transform of a raw SoilGrids response into our SoilResponse. */
export function parseSoilGridsResponse(
  raw: unknown,
  lat: number,
  lon: number,
): SoilResponse {
  const r = raw as SoilGridsRaw;
  const byName = new Map(r.properties.layers.map((l) => [l.name, l]));

  function getLayer(name: string): SoilGridsLayer {
    const layer = byName.get(name);
    if (!layer) throw new Error(`soilgrids: missing layer ${name}`);
    return layer;
  }

  /** Raw integer descaled to its target unit (%, or 10⁻² cm³/cm³). */
  function targetValue(name: string): number {
    const layer = getLayer(name);
    return depthWeightedRaw(layer) / layer.unit_measure.d_factor;
  }

  const sandPct = targetValue("sand");
  const siltPct = targetValue("silt");
  const clayPct = targetValue("clay");
  // 10⁻² cm³/cm³ → mm of water per m of soil: ·10.
  const fieldCapacityMmPerM = targetValue("wv0033") * 10;
  const wiltingPointMmPerM = targetValue("wv1500") * 10;

  return {
    latitude: lat,
    longitude: lon,
    textureClass: classifyTexture(sandPct, siltPct, clayPct),
    sandPct,
    siltPct,
    clayPct,
    fieldCapacityMmPerM,
    wiltingPointMmPerM,
    fetchedAt: new Date().toISOString(),
  };
}

/** Fetch + parse in one call. */
export async function fetchSoil(latlon: LatLon): Promise<SoilResponse> {
  const raw = await fetchSoilGrids(latlon);
  return parseSoilGridsResponse(raw, latlon.lat, latlon.lon);
}
