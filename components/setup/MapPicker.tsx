"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPickerProps = {
  initialLat?: number;
  initialLon?: number;
  onSelect: (lat: number, lon: number) => void;
};

const ACCENT = "#1E7A9B";

// Keyless satellite imagery from ESRI World Imagery (raster tiles).
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster" as const,
      source: "satellite",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export function MapPicker({ initialLat, initialLon, onSelect }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const hasInitial =
      typeof initialLat === "number" && typeof initialLon === "number";
    const center: [number, number] = hasInitial
      ? [initialLon!, initialLat!]
      : [-93.9, 41.7];
    const zoom = hasInitial ? 10 : 6;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center,
      zoom,
    });
    mapRef.current = map;

    if (hasInitial) {
      markerRef.current = new maplibregl.Marker({ color: ACCENT })
        .setLngLat(center)
        .addTo(map);
    }

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({ color: ACCENT })
        .setLngLat([lng, lat])
        .addTo(map);
      onSelect(lat, lng);
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-[400px] w-full overflow-hidden rounded-lg"
    />
  );
}
