import { NextRequest } from "next/server";
import { fetchSoil } from "@/lib/soil-fetch";
import { GENERIC_SILT_LOAM_FALLBACK } from "@/lib/soil-fallback";
import type { SoilResponse } from "@/lib/types";

// 24-hour cache — soil doesn't change.
export const revalidate = 86400;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return Response.json({ error: "invalid lat" }, { status: 400 });
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return Response.json({ error: "invalid lon" }, { status: 400 });
  }

  try {
    const payload = await fetchSoil({ lat, lon });
    return Response.json(payload);
  } catch (e) {
    // SoilGrids 5xx / timeout / masked-pixel (parser throws) → graceful
    // fallback so the recommendation still works, just less precisely tuned.
    console.warn("[/api/soil] upstream failed, returning fallback", e);
    const fallback: SoilResponse = {
      latitude: lat,
      longitude: lon,
      ...GENERIC_SILT_LOAM_FALLBACK,
      fetchedAt: new Date().toISOString(),
      degradedReason: e instanceof Error ? e.message : "soilgrids unreachable",
    };
    return Response.json(fallback, { status: 200 });
  }
}
