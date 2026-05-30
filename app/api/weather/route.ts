import { NextRequest } from "next/server";
import { fetchWeather } from "@/lib/weather-fetch";

// 30-minute cache — weather doesn't change minute-to-minute.
export const revalidate = 1800;

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
    const payload = await fetchWeather({ lat, lon });
    return Response.json(payload);
  } catch (e) {
    console.error("[/api/weather]", e);
    return Response.json({ error: "upstream failed" }, { status: 502 });
  }
}
