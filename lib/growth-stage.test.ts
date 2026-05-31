// unit-style asserts (run: npx tsx lib/growth-stage.test.ts)
import { getStage, currentKc } from "./growth-stage";
import { close } from "./test-utils";
import type { Crop, GrowthStage } from "./types";

console.log("=== growth-stage.test.ts ===");

const MS_PER_DAY = 86_400_000;
const addDays = (iso: string, n: number): string =>
  new Date(Date.parse(iso) + n * MS_PER_DAY).toISOString().slice(0, 10);

const PLANT = "2024-04-01";
const corn: Crop = {
  id: "corn",
  displayName: "Corn",
  kc: { initial: 0.3, mid: 1.2, end: 0.6 },
  stageLengthsDays: { initial: 30, development: 40, mid: 50, late: 30 },
  rootDepthM: 1.0,
  depletionFraction: 0.55,
};

const cases: Array<[number, GrowthStage]> = [
  [10, "initial"],
  [50, "development"],
  [100, "mid-season"],
];

for (const [day, expected] of cases) {
  const got = getStage(PLANT, addDays(PLANT, day), corn);
  console.assert(
    got === expected,
    `FAIL: corn day ${day} expected ${expected}, got ${got}`,
  );
  console.log(`${got === expected ? "✓" : "✗"} corn day ${day} → ${got}`);
}

const kcCases: Array<[number, number, string]> = [
  [10, 0.3, "day 10 = kc_ini"],
  [50, 0.3 + (20 / 40) * (1.2 - 0.3), "day 50 mid-dev ramp"],
  [100, 1.2, "day 90 = kc_mid"],
];
for (const [day, expected, label] of kcCases) {
  const got = currentKc(PLANT, addDays(PLANT, day), corn);
  const ok = close(got, expected, 0.01);
  console.assert(ok, `FAIL: corn Kc ${label} expected ${expected}, got ${got}`);
  console.log(`${ok ? "✓" : "✗"} corn Kc ${label} → ${got.toFixed(3)}`);
}
