/**
 * AQUIFER farm store — the single source of truth for the running farm.
 *
 * This is a ROUTER, not an engine. It holds state, routes inputs to the pure
 * functions in lib/*, and stores their results. No simulation math lives here:
 * if a view needs derived state, it adds a selector, never a re-implementation.
 *
 * It also owns the upstream data fetches (/api/weather, /api/soil) and exposes
 * their loading/error status. setFarm fires those fetches automatically.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Farm,
  WeatherPayload,
  SoilResponse,
  DailyEntry,
  Recommendation,
  FetchStatus,
} from "@/lib/types";
import { CROPS } from "@/lib/crop-coefficients";
import {
  totalAvailableWater,
  readilyAvailableWater,
  stepDay,
} from "@/lib/soil-balance";
import { currentKc, getStage } from "@/lib/growth-stage";
import { recommend } from "@/lib/recommender";

export interface FarmState {
  // data
  farm: Farm | null;
  weather: WeatherPayload | null;
  history: DailyEntry[];
  recommendation: Recommendation | null;

  // fetch status
  weatherStatus: FetchStatus;
  weatherError: string | null;
  soilStatus: FetchStatus;
  soilError: string | null;

  // farm actions
  setFarm: (farm: Farm) => void;
  clearFarm: () => void;

  // weather
  setWeather: (w: WeatherPayload) => void;

  // upstream fetches
  fetchWeather: () => Promise<void>;
  fetchSoil: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // simulation
  advanceDay: () => void;
  logIrrigation: (mm: number) => void;
  resetHistory: () => void;

  // internal-but-exported for testability
  recompute: () => void;
}

/** A slice of state sufficient to derive moisture + recommendation. */
type DerivableState = Pick<FarmState, "farm" | "weather" | "history">;

/** Current root-zone moisture (mm): full reservoir if no history yet. */
function currentMoisture(state: DerivableState): number {
  const { farm, history } = state;
  if (!farm || !farm.soil) return 0;
  if (history.length === 0) {
    return totalAvailableWater(farm.soil, CROPS[farm.crop]);
  }
  return history[history.length - 1].soilMoistureMm;
}

/** Recommendation from current state, or null if inputs are incomplete. */
function computeRecommendation(state: DerivableState): Recommendation | null {
  const { farm, weather } = state;
  if (!farm || !weather || !farm.soil) return null;
  return recommend({
    today: weather.today.date,
    plantDate: farm.plantDate,
    crop: CROPS[farm.crop],
    soil: farm.soil,
    areaAcres: farm.areaAcres,
    moistureMm: currentMoisture(state),
    et0Mm: weather.today.et0OurMm,
    forecastRainNext3DaysMm: weather.forecastRainNext3DaysMm,
  });
}

/** Node-safe storage: real localStorage in the browser, no-op under SSR/tests. */
const storage = createJSONStorage(() =>
  typeof window !== "undefined"
    ? window.localStorage
    : ({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as unknown as Storage),
);

let warnedMissingInputs = false;

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      farm: null,
      weather: null,
      history: [],
      recommendation: null,

      weatherStatus: "idle",
      weatherError: null,
      soilStatus: "idle",
      soilError: null,

      setFarm: (farm) => {
        // Preserve history when editing the same farm (same id); reset only
        // for a genuinely new farm.
        const prevFarm = get().farm;
        const isSameFarm = prevFarm?.id === farm.id;
        set({
          farm,
          history: isSameFarm ? get().history : [],
          recommendation: null,
          weather: null,
          weatherStatus: "idle",
          weatherError: null,
          soilStatus: "idle",
          soilError: null,
        });
        // fire-and-forget; statuses track progress. setFarm stays synchronous.
        void get().fetchAll();
      },

      clearFarm: () =>
        set({
          farm: null,
          weather: null,
          history: [],
          recommendation: null,
          weatherStatus: "idle",
          weatherError: null,
          soilStatus: "idle",
          soilError: null,
        }),

      setWeather: (w) => {
        set({ weather: w });
        get().recompute();
      },

      fetchWeather: async () => {
        const { farm } = get();
        if (!farm) {
          set({ weatherStatus: "error", weatherError: "no farm location" });
          return;
        }
        set({ weatherStatus: "loading", weatherError: null });
        try {
          const res = await fetch(
            `/api/weather?lat=${farm.latitude}&lon=${farm.longitude}`,
          );
          if (!res.ok) {
            set({ weatherStatus: "error", weatherError: `weather ${res.status}` });
            return;
          }
          const payload = (await res.json()) as WeatherPayload;
          if (!payload?.today?.date) {
            set({ weatherStatus: "error", weatherError: "malformed weather payload" });
            return;
          }
          get().setWeather(payload);
          set({ weatherStatus: "ready" });
        } catch (e) {
          set({ weatherStatus: "error", weatherError: String(e) });
        }
      },

      fetchSoil: async () => {
        const { farm } = get();
        if (!farm) {
          set({ soilStatus: "error", soilError: "no farm location" });
          return;
        }
        set({ soilStatus: "loading", soilError: null });
        try {
          const res = await fetch(
            `/api/soil?lat=${farm.latitude}&lon=${farm.longitude}`,
          );
          if (!res.ok) {
            set({ soilStatus: "error", soilError: `soil ${res.status}` });
            return;
          }
          const r = (await res.json()) as SoilResponse;
          if (typeof r?.fieldCapacityMmPerM !== "number") {
            set({ soilStatus: "error", soilError: "malformed soil payload" });
            return;
          }
          // immutable merge of SoilResponse fields into farm.soil
          set((s) => ({
            farm: s.farm
              ? {
                  ...s.farm,
                  soil: {
                    textureClass: r.textureClass,
                    fieldCapacityMmPerM: r.fieldCapacityMmPerM,
                    wiltingPointMmPerM: r.wiltingPointMmPerM,
                    latitude: r.latitude,
                    longitude: r.longitude,
                    degraded: r.degraded ?? false,
                  },
                }
              : s.farm,
            soilStatus: "ready",
          }));
          get().recompute();
        } catch (e) {
          set({ soilStatus: "error", soilError: String(e) });
        }
      },

      fetchAll: async () => {
        await Promise.all([get().fetchWeather(), get().fetchSoil()]);
      },

      advanceDay: () => {
        const { farm, weather, history } = get();
        if (!farm || !weather || !farm.soil) {
          if (!warnedMissingInputs) {
            console.warn("advanceDay: missing farm/weather/soil — no-op");
            warnedMissingInputs = true;
          }
          return;
        }
        const crop = CROPS[farm.crop];
        const taw = totalAvailableWater(farm.soil, crop);
        const raw = readilyAvailableWater(taw, crop);
        const kc = currentKc(farm.plantDate, weather.today.date, crop);

        const result = stepDay({
          moistureBeforeMm: currentMoisture({ farm, weather, history }),
          tawMm: taw,
          rawMm: raw,
          et0Mm: weather.today.et0OurMm,
          kc,
          rainfallMm: weather.today.rainfallMm,
          irrigationMm: 0,
        });

        const entry: DailyEntry = {
          date: weather.today.date,
          et0Mm: weather.today.et0OurMm,
          etcMm: result.etcActualMm,
          rainfallMm: weather.today.rainfallMm,
          irrigationMm: 0,
          soilMoistureMm: result.moistureAfterMm,
          stage: getStage(farm.plantDate, weather.today.date, crop),
        };

        set({ history: [...history, entry] });
        get().recompute();
      },

      logIrrigation: (mm) => {
        const { farm, weather, history } = get();
        if (!farm || !farm.soil) return;
        const crop = CROPS[farm.crop];
        const taw = totalAvailableWater(farm.soil, crop);

        if (history.length === 0) {
          const date =
            weather?.today.date ?? new Date().toISOString().slice(0, 10);
          const entry: DailyEntry = {
            date,
            et0Mm: weather?.today.et0OurMm ?? 0,
            etcMm: 0,
            rainfallMm: 0,
            irrigationMm: mm,
            soilMoistureMm: Math.min(taw, taw + mm),
            stage: getStage(farm.plantDate, date, crop),
          };
          set({ history: [entry] });
        } else {
          const last = history[history.length - 1];
          const updated: DailyEntry = {
            ...last,
            irrigationMm: last.irrigationMm + mm,
            soilMoistureMm: Math.min(taw, last.soilMoistureMm + mm),
          };
          set({ history: [...history.slice(0, -1), updated] });
        }
        get().recompute();
      },

      resetHistory: () => {
        set({ history: [] });
        get().recompute();
      },

      recompute: () => set({ recommendation: computeRecommendation(get()) }),
    }),
    {
      name: "aquifer-farm-v1",
      storage,
      partialize: (s) => ({ farm: s.farm, history: s.history }),
    },
  ),
);
