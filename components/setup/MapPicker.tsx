"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const ACCENT = "#1E7A9B";
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MapPickerProps {
  initialLat?: number;
  initialLon?: number;
  onSelect: (lat: number, lon: number) => void;
}

export function MapPicker({
  initialLat = 41.7,
  initialLon = -93.9,
  onSelect,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // keep the latest onSelect without re-initializing the map
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;

    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [initialLon, initialLat],
      zoom: 6,
    });
    mapRef.current = map;

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: ACCENT })
        .setLngLat([lng, lat])
        .addTo(map);
      onSelectRef.current(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // initialLat/Lon are only the starting view; intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TOKEN) {
    return (
      <div className="flex min-h-[400px] flex-1 items-center justify-center rounded-lg bg-slate-900 text-slate-400">
        <p className="text-sm">Mapbox token not configured</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[400px] flex-1 overflow-hidden rounded-lg"
      style={{ height: "100%" }}
    />
  );
}
