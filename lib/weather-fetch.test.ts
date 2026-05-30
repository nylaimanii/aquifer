/**
 * Fixture-based weather-parse tests — no network.
 * Run: npx tsx lib/weather-fetch.test.ts
 */

import fs from "fs";
import { parseOpenMeteoResponse } from "./weather-fetch";

const close = (a: number, b: number, tol: number): boolean =>
  Math.abs(a - b) <= tol;
const check = (label: string, ok: boolean, detail?: string) =>
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);

const raw = JSON.parse(
  fs.readFileSync("lib/__fixtures__/open-meteo-iowa.json", "utf8"),
);
const parsed = parseOpenMeteoResponse(raw);

check("lat in iowa range", parsed.latitude > 41 && parsed.latitude < 42, `${parsed.latitude}`);
check("forecast 7 days", parsed.forecast.length === 7, `${parsed.forecast.length}`);
check("today date YYYY-MM-DD", parsed.today.date.length === 10, parsed.today.date);
check(
  "today ET₀ realistic (0–15)",
  parsed.today.et0OurMm > 0 && parsed.today.et0OurMm < 15,
  `${parsed.today.et0OurMm.toFixed(2)} mm`,
);

const ratio = parsed.today.et0OurMm / parsed.today.et0OpenMeteoMm;
check(
  "our ET₀ within 15% of open-meteo ref",
  ratio > 0.85 && ratio < 1.15,
  `ratio=${ratio.toFixed(3)} (ours ${parsed.today.et0OurMm.toFixed(2)} vs OM ${parsed.today.et0OpenMeteoMm.toFixed(2)})`,
);

const expectedSum = parsed.forecast
  .slice(1, 4)
  .reduce((s, d) => s + d.rainfallMm, 0);
check(
  "3-day rain sum matches forecast[1..3]",
  close(parsed.forecastRainNext3DaysMm, expectedSum, 0.001),
  `${parsed.forecastRainNext3DaysMm.toFixed(2)} mm`,
);
