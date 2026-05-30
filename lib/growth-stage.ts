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

// --- unit-style asserts (run: npx tsx lib/growth-stage.ts) ---
if (require.main === module) {
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
}
