/**
 * AQUIFER farm store — the single source of truth for the running farm.
 *
 * This is a ROUTER, not an engine. It holds state, routes inputs to the pure
 * functions in lib/*, and stores their results. No simulation math lives here:
 * if a view needs derived state, it adds a selector, never a re-implementation.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Farm, Weather, DailyEntry, Recommendation } from "@/lib/types";
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
  weather: Weather | null;
  history: DailyEntry[];
  recommendation: Recommendation | null;

  // farm actions
  setFarm: (farm: Farm) => void;
  clearFarm: () => void;

  // weather
  setWeather: (w: Weather) => void;

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
    today: weather.todayDate,
    plantDate: farm.plantDate,
    crop: CROPS[farm.crop],
    soil: farm.soil,
    areaAcres: farm.areaAcres,
    moistureMm: currentMoisture(state),
    et0Mm: weather.todayEt0Mm,
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

      setFarm: (farm) => {
        set({ farm, history: [] });
        get().recompute();
      },

      clearFarm: () =>
        set({
          farm: null,
          weather: null,
          history: [],
          recommendation: null,
        }),

      setWeather: (w) => {
        set({ weather: w });
        get().recompute();
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
        const kc = currentKc(farm.plantDate, weather.todayDate, crop);

        const result = stepDay({
          moistureBeforeMm: currentMoisture({ farm, weather, history }),
          tawMm: taw,
          rawMm: raw,
          et0Mm: weather.todayEt0Mm,
          kc,
          rainfallMm: weather.todayRainfallMm,
          irrigationMm: 0,
        });

        const entry: DailyEntry = {
          date: weather.todayDate,
          et0Mm: weather.todayEt0Mm,
          etcMm: result.etcActualMm,
          rainfallMm: weather.todayRainfallMm,
          irrigationMm: 0,
          soilMoistureMm: result.moistureAfterMm,
          stage: getStage(farm.plantDate, weather.todayDate, crop),
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
            weather?.todayDate ?? new Date().toISOString().slice(0, 10);
          const entry: DailyEntry = {
            date,
            et0Mm: weather?.todayEt0Mm ?? 0,
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
