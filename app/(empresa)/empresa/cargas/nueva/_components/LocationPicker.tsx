"use client";

import { useState, useEffect, useRef } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";

export type Location = { lat: number; lng: number; name: string };

interface Props {
  value: Location | null;
  onChange: (loc: Location | null) => void;
  /** Dónde abrir el mapa cuando todavía no hay un punto marcado. */
  centroInicial?: { lat: number; lng: number } | null;
  /** Mapa siempre abierto, para seguir ajustando el punto después de marcarlo. */
  mapaFijo?: boolean;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (MAPBOX_TOKEN) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&country=AR&types=place,locality,district,region`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.features?.length > 0) {
          // Prefer city-level result over full address
          const city = data.features.find((f: any) =>
            f.place_type?.some((t: string) => ["place", "locality"].includes(t))
          );
          return (city ?? data.features[0]).place_name;
        }
      }
    } catch {}
  }
  // Nominatim fallback (no token required)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "es" } }
    );
    if (res.ok) {
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality;
      const state = data.address?.state;
      return [city, state].filter(Boolean).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export default function LocationPicker({ value, onChange, centroInicial, mapaFijo = false }: Props) {
  const [showMap, setShowMap] = useState(mapaFijo);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const crearMarker = useRef<(() => MapboxMarker) | null>(null);

  // Init / destroy map when showMap toggles
  useEffect(() => {
    if (!showMap) {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      return;
    }

    let active = true;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!active || !mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const punto = value ?? centroInicial;
      const center: [number, number] = punto
        ? [punto.lng, punto.lat]
        : [-63.6167, -38.4161];
      const zoom = value ? 14 : punto ? 11 : 3.5;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
        language: "es",
      });
      mapRef.current = map;
      crearMarker.current = () => new mapboxgl.Marker({ color: "#06342A" });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      if (value) {
        markerRef.current = new mapboxgl.Marker({ color: "#06342A" })
          .setLngLat([value.lng, value.lat])
          .addTo(map);
      }

      map.on("click", async (e) => {
        if (!active) return;
        const { lng, lat } = e.lngLat;

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new mapboxgl.Marker({ color: "#06342A" })
            .setLngLat([lng, lat])
            .addTo(map);
        }

        setGeoLoading(true);
        const name = await reverseGeocode(lat, lng);
        if (active) {
          setGeoLoading(false);
          onChange({ lat, lng, name });
        }
      });
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  async function handleGPS() {
    if (!navigator.geolocation) {
      setGpsError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGpsError(null);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const name = await reverseGeocode(lat, lng);
        onChange({ lat, lng, name });
        setGpsLoading(false);
        if (mapaFijo && mapRef.current) {
          markerRef.current ??= crearMarker.current?.().addTo(mapRef.current) ?? null;
          markerRef.current?.setLngLat([lng, lat]);
          mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
        } else {
          setShowMap(false);
        }
      },
      () => {
        setGpsError("No se pudo obtener la ubicación. Verificá los permisos del navegador.");
        setGpsLoading(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  function handleCambiar() {
    onChange(null);
    setShowMap(false);
    setGpsError(null);
  }

  // ── Confirmed state ──────────────────────────────────────────────────────────
  if (value && !mapaFijo) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "var(--primary)" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--primary)" }}>
            {value.name}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCambiar}
          className="text-xs font-medium underline opacity-70 hover:opacity-100 flex-shrink-0 cursor-pointer"
          style={{ color: "var(--primary)" }}
        >
          Cambiar
        </button>
      </div>
    );
  }

  // ── Picker state ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${mapaFijo ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* GPS button */}
        <button
          type="button"
          onClick={handleGPS}
          disabled={gpsLoading}
          className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all disabled:opacity-60 cursor-pointer"
          style={{ backgroundColor: "var(--primary)", color: "#FFFFFF", borderColor: "var(--primary)" }}
        >
          {gpsLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          <span>{gpsLoading ? "Obteniendo..." : "Mi ubicación"}</span>
        </button>

        {/* Map toggle button */}
        {!mapaFijo && <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer"
          style={
            showMap
              ? { backgroundColor: "var(--primary-10)", color: "var(--primary)", borderColor: "var(--primary-30)" }
              : { backgroundColor: "#FFFFFF", color: "#374151", borderColor: "#E2E8E8" }
          }
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>{showMap ? "Ocultar mapa" : "Ver en mapa"}</span>
        </button>}
      </div>

      {gpsError && (
        <p className="text-xs px-1" style={{ color: "#EF4444" }}>
          {gpsError}
        </p>
      )}

      {showMap && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#E2E8E8" }}>
          <div ref={mapContainerRef} style={{ height: "280px", width: "100%" }} />
          <div
            className="px-3 py-2 text-xs flex items-center gap-1.5 border-t"
            style={{
              borderColor: "#E2E8E8",
              backgroundColor: "#F9FAFB",
              color: geoLoading ? "var(--primary)" : "#9CA3AF",
            }}
          >
            {geoLoading ? (
              <>
                <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Resolviendo nombre de la ubicación...
              </>
            ) : (
              value ? value.name : "Tocá el mapa para marcar la ubicación"
            )}
          </div>
        </div>
      )}
    </div>
  );
}
