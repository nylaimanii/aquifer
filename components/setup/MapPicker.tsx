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

// default map center (canonical iowa point) when no pin is supplied
const DEFAULT_CENTER: [number, number] = [-93.9, 41.7];

export function MapPicker({ initialLat, initialLon, onSelect }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // keep the latest onSelect without re-initializing the map
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // an existing pin is supplied only when both coords are present
  const hasInitialPin = initialLat !== undefined && initialLon !== undefined;
  const center: [number, number] = hasInitialPin
    ? [initialLon, initialLat]
    : DEFAULT_CENTER;

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;

    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center,
      zoom: hasInitialPin ? 10 : 6,
    });
    mapRef.current = map;

    // pre-drop a marker if editing an existing farm
    if (hasInitialPin) {
      markerRef.current = new mapboxgl.Marker({ color: ACCENT })
        .setLngLat(center)
        .addTo(map);
    }

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
