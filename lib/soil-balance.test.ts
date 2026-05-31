// reference-value asserts (run: npx tsx lib/soil-balance.test.ts)
import {
  totalAvailableWater,
  readilyAvailableWater,
  stepDay,
} from "./soil-balance";
import { CROPS } from "./crop-coefficients";
import { close } from "./test-utils";
import type { SoilProfile } from "./types";

console.log("=== soil-balance.test.ts ===");

const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);

const soil: SoilProfile = {
  textureClass: "silt loam",
  fieldCapacityMmPerM: 280,
  wiltingPointMmPerM: 120,
  latitude: 41.9,
  longitude: -93.6,
};
const corn = CROPS["corn"];

const taw = totalAvailableWater(soil, corn);
const raw = readilyAvailableWater(taw, corn);
check("TAW silt loam corn ≈ 160", close(taw, 160, 0.1), `${taw}`);
check("RAW silt loam corn ≈ 88", close(raw, 88, 0.1), `${raw}`);

// 1. full soil, no rain, hot day → no stress, drops by ETc
const day1 = stepDay({
  moistureBeforeMm: 160,
  tawMm: 160,
  rawMm: 88,
  et0Mm: 6,
  kc: 1.2,
  rainfallMm: 0,
  irrigationMm: 0,
});
check("ETc pot ≈ 7.2", close(day1.etcPotentialMm, 7.2, 0.01));
check("no stress at full (Ks=1)", day1.ksStressFactor === 1);
check("day1 moisture ≈ 152.8", close(day1.moistureAfterMm, 152.8, 0.01));
check("day1 flags (no runoff, not stressed)", day1.runoffMm === 0 && !day1.isStressed);

// 2. heavily depleted → Ks reduces ETc
const stressed = stepDay({
  moistureBeforeMm: 50,
  tawMm: 160,
  rawMm: 88,
  et0Mm: 6,
  kc: 1.2,
  rainfallMm: 0,
  irrigationMm: 0,
});
check("Ks stressed ≈ 0.6944", close(stressed.ksStressFactor, 0.6944, 0.001), `${stressed.ksStressFactor.toFixed(4)}`);
check("ETc actual stressed ≈ 5.0", close(stressed.etcActualMm, 5.0, 0.05), `${stressed.etcActualMm.toFixed(3)}`);
check("isStressed flag true", stressed.isStressed === true);

// 3. heavy rain on near-full soil → runoff, capped at TAW
const flood = stepDay({
  moistureBeforeMm: 155,
  tawMm: 160,
  rawMm: 88,
  et0Mm: 6,
  kc: 1.2,
  rainfallMm: 30,
  irrigationMm: 0,
});
check("flood moisture cap ≈ 160", close(flood.moistureAfterMm, 160, 0.01));
check("flood runoff ≈ 17.8", close(flood.runoffMm, 17.8, 0.01), `${flood.runoffMm.toFixed(2)}`);

// 4. multi-day depletion run: how long till stress kicks in?
let m = 160;
let daysToStress = 0;
for (let i = 1; i <= 30; i++) {
  const r = stepDay({
    moistureBeforeMm: m,
    tawMm: 160,
    rawMm: 88,
    et0Mm: 6,
    kc: 1.2,
    rainfallMm: 0,
    irrigationMm: 0,
  });
  m = r.moistureAfterMm;
  if (r.isStressed && daysToStress === 0) daysToStress = i;
}
check(
  "stress onset day in [11,14]",
  daysToStress >= 11 && daysToStress <= 14,
  `day ${daysToStress}`,
);
