/**
 * FAO-56 Penman-Monteith reference evapotranspiration (ET₀).
 *
 * Allen et al. (1998), FAO Irrigation and Drainage Paper No. 56.
 * Pure, deterministic math — NO network calls, NO side effects.
 * This is the engine keystone; every downstream calculation reads ET₀ from here.
 *
 * Main equation (eq. 6):
 *   ET₀ = (0.408·Δ·(Rn − G) + γ·(900/(T+273))·u₂·(es − ea))
 *         / (Δ + γ·(1 + 0.34·u₂))
 */

export interface ET0Input {
  tMaxC: number;
  tMinC: number;
  rhMaxPct?: number;
  rhMinPct?: number;
  /** Fallback when rhMax/rhMin are not present. */
  rhMeanPct?: number;
  /** Wind speed, m/s (Open-Meteo reports at 10 m). */
  windSpeedMs: number;
  /** Height of the wind measurement, m. Default 10. */
  windMeasurementHeightM?: number;
  /** Incoming shortwave radiation Rs, MJ/m²/day. */
  solarRadiationMjPerM2Day: number;
  /** Elevation above sea level, m. Default 0. */
  elevationM?: number;
  latitudeDeg: number;
  /** Day of year, 1–366. */
  dayOfYear: number;
}

/** Saturation vapor pressure at temperature T (°C), kPa. FAO-56 eq. 11. */
export function saturationVaporPressure(tC: number): number {
  return 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3));
}

/** Mean saturation vapor pressure from daily Tmax/Tmin, kPa. FAO-56 eq. 12. */
export function meanSaturationVaporPressure(tMaxC: number, tMinC: number): number {
  return (saturationVaporPressure(tMaxC) + saturationVaporPressure(tMinC)) / 2;
}

/**
 * Actual vapor pressure ea, kPa. FAO-56 eq. 17 (from RHmax/RHmin),
 * falling back to eq. 19 (from RHmean) when only the mean is available.
 */
export function actualVaporPressure(
  tMinC: number,
  tMaxC: number,
  rhMaxPct?: number,
  rhMinPct?: number,
  rhMeanPct?: number,
): number {
  if (rhMaxPct !== undefined && rhMinPct !== undefined) {
    return (
      (saturationVaporPressure(tMinC) * (rhMaxPct / 100) +
        saturationVaporPressure(tMaxC) * (rhMinPct / 100)) /
      2
    );
  }
  if (rhMeanPct !== undefined) {
    return meanSaturationVaporPressure(tMaxC, tMinC) * (rhMeanPct / 100);
  }
  throw new Error("actualVaporPressure: need rhMax+rhMin or rhMean");
}

/** Slope of the saturation vapor pressure curve at T (°C), kPa/°C. FAO-56 eq. 13. */
export function slopeVaporPressureCurve(tC: number): number {
  return (
    (4098 * (0.6108 * Math.exp((17.27 * tC) / (tC + 237.3)))) /
    Math.pow(tC + 237.3, 2)
  );
}

/** Atmospheric pressure at elevation z (m), kPa. FAO-56 eq. 7. */
export function atmosphericPressure(elevationM: number): number {
  return 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26);
}

/** Psychrometric constant γ from pressure P (kPa), kPa/°C. FAO-56 eq. 8. */
export function psychrometricConstant(pressureKpa: number): number {
  return 0.000665 * pressureKpa;
}

/** Adjust wind speed from measurement height z (m) to 2 m, m/s. FAO-56 eq. 47. */
export function windSpeedAt2m(windAtZ: number, heightM: number): number {
  return (windAtZ * 4.87) / Math.log(67.8 * heightM - 5.42);
}

/** Extraterrestrial radiation Ra for latitude (deg) and day of year, MJ/m²/day. FAO-56 eq. 21. */
export function extraterrestrialRadiation(
  latitudeDeg: number,
  dayOfYear: number,
): number {
  const phi = (latitudeDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
  const ws = Math.acos(-Math.tan(phi) * Math.tan(delta));
  return (
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) +
      Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  );
}

/** Clear-sky solar radiation Rso, MJ/m²/day. FAO-56 eq. 37. */
export function clearSkyRadiation(ra: number, elevationM: number): number {
  return (0.75 + 2e-5 * elevationM) * ra;
}

/** Net shortwave radiation Rns from Rs (grass albedo 0.23), MJ/m²/day. FAO-56 eq. 38. */
export function netShortwaveRadiation(rs: number): number {
  return (1 - 0.23) * rs;
}

/** Net longwave radiation Rnl, MJ/m²/day. FAO-56 eq. 39. */
export function netLongwaveRadiation(
  tMaxC: number,
  tMinC: number,
  ea: number,
  rs: number,
  rso: number,
): number {
  const sigma = 4.903e-9; // Stefan-Boltzmann, MJ/K⁴/m²/day
  const tMaxK = tMaxC + 273.16;
  const tMinK = tMinC + 273.16;
  // Clamp Rs/Rso to [0.3, 1.0] to avoid bad cloudiness ratios.
  const ratio = Math.min(1.0, Math.max(0.3, rso > 0 ? rs / rso : 0.3));
  return (
    sigma *
    ((Math.pow(tMaxK, 4) + Math.pow(tMinK, 4)) / 2) *
    (0.34 - 0.14 * Math.sqrt(ea)) *
    (1.35 * ratio - 0.35)
  );
}

/** Net radiation Rn = Rns − Rnl, MJ/m²/day. FAO-56 eq. 40. */
export function netRadiation(
  rs: number,
  rso: number,
  tMaxC: number,
  tMinC: number,
  ea: number,
): number {
  return netShortwaveRadiation(rs) - netLongwaveRadiation(tMaxC, tMinC, ea, rs, rso);
}

/** Reference evapotranspiration ET₀, mm/day. FAO-56 eq. 6. */
export function computeET0(input: ET0Input): number {
  const {
    tMaxC,
    tMinC,
    rhMaxPct,
    rhMinPct,
    rhMeanPct,
    windSpeedMs,
    windMeasurementHeightM = 10,
    solarRadiationMjPerM2Day: rs,
    elevationM = 0,
    latitudeDeg,
    dayOfYear,
  } = input;

  const tMean = (tMaxC + tMinC) / 2;

  const es = meanSaturationVaporPressure(tMaxC, tMinC);
  const ea = actualVaporPressure(tMinC, tMaxC, rhMaxPct, rhMinPct, rhMeanPct);

  const delta = slopeVaporPressureCurve(tMean);
  const pressure = atmosphericPressure(elevationM);
  const gamma = psychrometricConstant(pressure);
  const u2 = windSpeedAt2m(windSpeedMs, windMeasurementHeightM);

  const ra = extraterrestrialRadiation(latitudeDeg, dayOfYear);
  const rso = clearSkyRadiation(ra, elevationM);
  const rn = netRadiation(rs, rso, tMaxC, tMinC, ea);
  const g = 0; // soil heat flux ≈ 0 for daily timestep

  const numerator =
    0.408 * delta * (rn - g) +
    gamma * (900 / (tMean + 273)) * u2 * (es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);

  return numerator / denominator;
}

// --- reference-value asserts (run: npx tsx lib/penman-monteith.ts) ---
if (require.main === module) {
  const close = (a: number, b: number, tol: number): boolean =>
    Math.abs(a - b) <= tol;

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
}
