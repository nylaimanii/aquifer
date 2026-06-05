/**
 * Fixture-based soil-parse tests — no network.
 * Run: npx tsx lib/soil-fetch.test.ts
 */

import fs from "fs";
import { parseSoilGridsResponse, classifyTexture } from "./soil-fetch";
import { GENERIC_SILT_LOAM_FALLBACK } from "./soil-fallback";

const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);

const raw = JSON.parse(
  fs.readFileSync("lib/__fixtures__/soilgrids-iowa.json", "utf8"),
);
const soil = parseSoilGridsResponse(raw, 41.7, -93.9);

const tot = soil.sandPct + soil.siltPct + soil.clayPct;
check("sand+silt+clay ≈ 100", tot > 97 && tot < 103, `${tot.toFixed(1)}`);

check(
  "iowa silt > sand",
  soil.siltPct > soil.sandPct,
  `silt=${soil.siltPct.toFixed(1)} sand=${soil.sandPct.toFixed(1)}`,
);

check(
  "FC in [250,400]",
  soil.fieldCapacityMmPerM > 250 && soil.fieldCapacityMmPerM < 400,
  `${soil.fieldCapacityMmPerM.toFixed(0)} mm/m`,
);

check(
  "WP in [100,250]",
  soil.wiltingPointMmPerM > 100 && soil.wiltingPointMmPerM < 250,
  `${soil.wiltingPointMmPerM.toFixed(0)} mm/m`,
);

check("FC > WP", soil.fieldCapacityMmPerM > soil.wiltingPointMmPerM);

const awc = soil.fieldCapacityMmPerM - soil.wiltingPointMmPerM;
check("AWC in [80,250]", awc > 80 && awc < 250, `${awc.toFixed(0)} mm/m`);

check(
  "iowa texture in {silt loam, silty clay loam, clay loam, loam}",
  ["silt loam", "silty clay loam", "clay loam", "loam"].includes(soil.textureClass),
  soil.textureClass,
);

// classifier unit tests
check("classifier silt loam", classifyTexture(20, 60, 20) === "silt loam");
check("classifier sand", classifyTexture(85, 10, 5) === "sand");
check("classifier clay", classifyTexture(20, 30, 50) === "clay");

// fallback shape (used by the route when SoilGrids is unreachable)
check(
  "fallback FC > WP",
  GENERIC_SILT_LOAM_FALLBACK.fieldCapacityMmPerM >
    GENERIC_SILT_LOAM_FALLBACK.wiltingPointMmPerM,
);
check("fallback flagged degraded", GENERIC_SILT_LOAM_FALLBACK.degraded === true);
