/**
 * Open-Meteo weather fetch + parse.
 *
 * Split so the parse step is pure and testable against a fixture without
 * hitting the network. Open-Meteo is free and keyless — no auth.
 *
 * The raw response is arrays-aligned-by-index: daily.time[i] pairs with
 * daily.temperature_2m_max[i], etc. We index, never zip.
 */

import type { DailyWeather, WeatherPayload } from "./types";
import { computeET0 } from "./penman-monteith";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "relative_humidity_2m_max",
  "relative_humidity_2m_min",
  "wind_speed_10m_mean",
  "wind_speed_10m_max",
  "shortwave_radiation_sum",
  "precipitation_sum",
  "et0_fao_evapotranspiration",
].join(",");

/** With past_days=1, index 1 is "today" in the location's timezone. */
const TODAY_INDEX = 1;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Shape of the slice of the Open-Meteo response we consume. */
interface OpenMeteoRaw {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    relative_humidity_2m_max: number[];
    relative_humidity_2m_min: number[];
    wind_speed_10m_mean: number[];
    wind_speed_10m_max: number[];
    shortwave_radiation_sum: number[];
    precipitation_sum: number[];
    et0_fao_evapotranspiration: number[];
  };
}

/** Day of year (1–366) from a 'YYYY-MM-DD' date, UTC. */
function dayOfYearFromDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const startOfYear = Date.UTC(y, 0, 1);
  return Math.floor((ms - startOfYear) / 86_400_000) + 1;
}

/** Build one DailyWeather, computing our own ET₀ from the raw fields at index i. */
function buildDay(raw: OpenMeteoRaw, i: number): DailyWeather {
  const d = raw.daily;
  const date = d.time[i];
  const dayOfYear = dayOfYearFromDate(date);

  // FAO-56 Penman-Monteith expects daily MEAN 10 m wind, not the max —
  // feeding the max overestimates the aerodynamic term (~25%) and diverges
  // from Open-Meteo's own et0_fao reference.
  const windSpeedMs = d.wind_speed_10m_mean[i];

  const et0OurMm = computeET0({
    tMaxC: d.temperature_2m_max[i],
    tMinC: d.temperature_2m_min[i],
    rhMaxPct: d.relative_humidity_2m_max[i],
    rhMinPct: d.relative_humidity_2m_min[i],
    windSpeedMs,
    windMeasurementHeightM: 10,
    solarRadiationMjPerM2Day: d.shortwave_radiation_sum[i],
    elevationM: raw.elevation,
    latitudeDeg: raw.latitude,
    dayOfYear,
  });

  return {
    date,
    tMaxC: d.temperature_2m_max[i],
    tMinC: d.temperature_2m_min[i],
    rhMaxPct: d.relative_humidity_2m_max[i],
    rhMinPct: d.relative_humidity_2m_min[i],
    windSpeedMs,
    solarRadiationMjPerM2Day: d.shortwave_radiation_sum[i],
    rainfallMm: d.precipitation_sum[i],
    et0OurMm,
    et0OpenMeteoMm: d.et0_fao_evapotranspiration[i],
    dayOfYear,
  };
}

/** Hit the Open-Meteo forecast endpoint. Returns the raw JSON. */
export async function fetchOpenMeteo({ lat, lon }: LatLon): Promise<unknown> {
  const url =
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
    `&daily=${DAILY_VARS}` +
    `&timezone=auto&forecast_days=7&past_days=1&wind_speed_unit=ms`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`open-meteo ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Pure transform of a raw Open-Meteo response into our typed payload. */
export function parseOpenMeteoResponse(raw: unknown): WeatherPayload {
  const r = raw as OpenMeteoRaw;
  const n = r.daily.time.length;

  // 7-day window starting at "today" (index 1), inclusive.
  const forecast: DailyWeather[] = [];
  for (let i = TODAY_INDEX; i < Math.min(TODAY_INDEX + 7, n); i++) {
    forecast.push(buildDay(r, i));
  }

  const today = forecast[0];

  // Next 3 days = tomorrow + 2, i.e. forecast[1..3] (raw indices 2,3,4).
  const forecastRainNext3DaysMm = forecast
    .slice(1, 4)
    .reduce((sum, day) => sum + day.rainfallMm, 0);

  return {
    latitude: r.latitude,
    longitude: r.longitude,
    elevationM: r.elevation,
    timezone: r.timezone,
    fetchedAt: new Date().toISOString(),
    today,
    forecast,
    forecastRainNext3DaysMm,
  };
}

/** Fetch + parse in one call. */
export async function fetchWeather(latlon: LatLon): Promise<WeatherPayload> {
  const raw = await fetchOpenMeteo(latlon);
  return parseOpenMeteoResponse(raw);
}
