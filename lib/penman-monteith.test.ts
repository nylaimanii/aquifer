// reference-value asserts (run: npx tsx lib/penman-monteith.test.ts)
import {
  saturationVaporPressure,
  slopeVaporPressureCurve,
  atmosphericPressure,
  psychrometricConstant,
  windSpeedAt2m,
  computeET0,
} from "./penman-monteith";
import { close } from "./test-utils";

console.log("=== penman-monteith.test.ts ===");

const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);

check("es(20) ≈ 2.338", close(saturationVaporPressure(20), 2.338, 0.01));
check("es(30) ≈ 4.243", close(saturationVaporPressure(30), 4.243, 0.02));
check("Δ(20) ≈ 0.1448", close(slopeVaporPressureCurve(20), 0.1448, 0.001));
check("P(0m) ≈ 101.3", close(atmosphericPressure(0), 101.3, 0.1));
check("P(1000m) ≈ 89.55", close(atmosphericPressure(1000), 89.55, 0.5));
check(
  "γ at sea level ≈ 0.0674",
  close(psychrometricConstant(101.3), 0.0674, 0.001),
);
check("u2 from u10=5 ≈ 3.74", close(windSpeedAt2m(5, 10), 3.74, 0.05));

const iowaSummer = computeET0({
  tMaxC: 32,
  tMinC: 19,
  rhMaxPct: 80,
  rhMinPct: 40,
  windSpeedMs: 3.5,
  solarRadiationMjPerM2Day: 27,
  elevationM: 250,
  latitudeDeg: 41.9,
  dayOfYear: 196,
});
check(
  "iowa summer ET₀ in (5,9)",
  iowaSummer > 5 && iowaSummer < 9,
  `${iowaSummer.toFixed(2)} mm/day`,
);

const cloudySpring = computeET0({
  tMaxC: 14,
  tMinC: 6,
  rhMeanPct: 85,
  windSpeedMs: 2,
  solarRadiationMjPerM2Day: 9,
  elevationM: 50,
  latitudeDeg: 40,
  dayOfYear: 100,
});
check(
  "cloudy spring ET₀ in (1,3)",
  cloudySpring > 1 && cloudySpring < 3,
  `${cloudySpring.toFixed(2)} mm/day`,
);
