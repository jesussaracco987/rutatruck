"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import Link from "next/link";
import { getIconoCarga } from "@/lib/iconos-carga";
import { TIPO_CARGA_LABELS as TIPO_LABELS, TIPO_CARGA_COLORES } from "@/lib/tipos-carga";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type CargaMapItem = {
  id: number;
  titulo: string;
  origen: string;
  origenLat: number | null;
  origenLng: number | null;
  destino: string;
  tipoCarga: string;
  tipoCargaDetalle: string | null;
  peso: number | null;
  pesoUnidad: string | null;
  presupuesto: number | null;
  fechaCarga: string;
  cantidadCamiones: number;
};

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function getPinColor(tipoCarga: string, detalle: string | null): string {
  const d = norm(detalle ?? "");
  if (d.includes("maiz")) return "#F5C518";
  if (["trigo","sorgo","cebada","avena","centeno"].some(x => d.includes(x))) return "#C8A800";
  if (d.includes("soja")) return "#2D6A2D";
  if (d.includes("girasol")) return "#FF8C00";
  if (["manzana","pera","durazno","uva","citrico","limon","sandia","frutilla"].some(x => d.includes(x))) return "#FF6B35";
  if (["tomate","papa","cebolla","ajo","zanahoria","zapallo","lechuga","pimiento"].some(x => d.includes(x))) return "#4CAF50";
  if (["bovino","porcino","ovino","caprino","equino"].some(x => d.includes(x))) return "#8B4513";
  if (d.includes("aviar")) return "#E53935";
  return TIPO_CARGA_COLORES[tipoCarga] ?? "#9E9E9E";
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return isDesktop;
}

// ── Compact card shown in the bottom panel / sidebar ─────────────────────────

function CargaCard({
  carga,
  yaPostulado,
  selected,
  onClick,
}: {
  carga: CargaMapItem;
  yaPostulado: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const emoji = getIconoCarga(carga.tipoCarga, carga.tipoCargaDetalle);
  const color = getPinColor(carga.tipoCarga, carga.tipoCargaDetalle);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-gray-50 active:bg-gray-100"
      style={{
        borderColor: "#E2E8E8",
        backgroundColor: selected ? "#F0FDF4" : "#FFFFFF",
        borderLeft: selected ? `3px solid ${color}` : "3px solid transparent",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xl border-2"
          style={{ backgroundColor: color + "22", borderColor: color }}
        >
          {emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
              {TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}
            </span>
            {yaPostulado && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--primary-10)", color: "var(--primary)" }}>
                ✓ postulado
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{carga.origen} → {carga.destino}</p>
          <p className="text-xs mt-0.5 font-bold" style={{ color: "var(--primary)" }}>
            {carga.presupuesto != null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"}
          </p>
        </div>
        <svg className="w-4 h-4 flex-shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// ── Mini list shown when a marker groups 2+ cargas with the same origen ─────

function GrupoList({
  cargas,
  yaPostuladoSet,
  onSelect,
  onBack,
}: {
  cargas: CargaMapItem[];
  yaPostuladoSet: Set<number>;
  onSelect: (c: CargaMapItem) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b flex-shrink-0"
        style={{ color: "var(--primary)", borderColor: "#E2E8E8" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Ver todas las cargas
      </button>
      <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
        {cargas.length} cargas con el mismo origen
      </p>
      <div className="flex-1 overflow-y-auto">
        {cargas.map(c => (
          <CargaCard
            key={c.id}
            carga={c}
            yaPostulado={yaPostuladoSet.has(c.id)}
            selected={false}
            onClick={() => onSelect(c)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Expanded detail card (selected state) ────────────────────────────────────

function SelectedDetail({
  carga,
  yaPostulado,
  onBack,
}: {
  carga: CargaMapItem;
  yaPostulado: boolean;
  onBack: () => void;
}) {
  const emoji = getIconoCarga(carga.tipoCarga, carga.tipoCargaDetalle);
  const color = getPinColor(carga.tipoCarga, carga.tipoCargaDetalle);

  return (
    <div className="flex flex-col h-full bg-white">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b flex-shrink-0"
        style={{ color: "var(--primary)", borderColor: "#E2E8E8" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Ver todas las cargas
      </button>

      <div className="p-5 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 flex-shrink-0"
            style={{ backgroundColor: color + "20", borderColor: color }}
          >
            {emoji}
          </span>
          <div>
            <p className="text-lg font-black text-gray-900">{TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}</p>
            {carga.tipoCargaDetalle && (
              <p className="text-sm" style={{ color: "#6B7280" }}>{carga.tipoCargaDetalle}</p>
            )}
          </div>
        </div>

        <p className="text-base font-bold text-gray-900 mb-4">
          {carga.origen} <span style={{ color: "var(--primary)" }}>→</span> {carga.destino}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)", border: "1px solid" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Presupuesto</p>
            <p className="text-base font-black" style={{ color: "var(--primary)" }}>
              {carga.presupuesto != null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"}
            </p>
          </div>
          <div className="rounded-xl p-3 border" style={{ borderColor: "#E2E8E8" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Fecha</p>
            <p className="text-sm font-bold text-gray-900">
              {new Date(carga.fechaCarga).toLocaleDateString("es-AR")}
            </p>
          </div>
          {carga.cantidadCamiones > 1 && (
            <div className="rounded-xl p-3 border" style={{ borderColor: "#E2E8E8" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Camiones</p>
              <p className="text-sm font-bold text-gray-900">{carga.cantidadCamiones}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex-shrink-0 border-t" style={{ borderColor: "#E2E8E8" }}>
        <Link
          href={`/transportista/cargas/${carga.id}`}
          className="block w-full text-center py-3 rounded-xl font-bold text-sm"
          style={{
            backgroundColor: yaPostulado ? "var(--primary-27)" : "var(--primary)",
            color: yaPostulado ? "var(--primary)" : "#FFFFFF",
          }}
        >
          {yaPostulado ? "✓ Ver mi postulación" : "Me interesa →"}
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  cargas: CargaMapItem[];
  yaPostuladoIds: number[];
  onClose: () => void;
}

export default function MapaCargas({ cargas, yaPostuladoIds, onClose }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const [panelState, setPanelState] = useState<"split" | "map-full">("split");
  const [selectedCarga, setSelectedCarga] = useState<CargaMapItem | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<CargaMapItem[] | null>(null);
  const touchStartY = useRef(0);
  const isDesktop = useIsDesktop();

  const yaPostuladoSet = new Set(yaPostuladoIds);
  const cargasConGeo = cargas.filter(c => c.origenLat != null && c.origenLng != null);

  // Cargas con el mismo origen (coords redondeadas a ~1m) quedarían apiladas
  // exactamente en el mismo punto — un solo pin las representa a todas, con
  // un contador, en vez de tapar unas a otras silenciosamente.
  const gruposPorCoord = new Map<string, CargaMapItem[]>();
  for (const c of cargasConGeo) {
    const key = `${c.origenLat!.toFixed(5)},${c.origenLng!.toFixed(5)}`;
    const grupo = gruposPorCoord.get(key);
    if (grupo) grupo.push(c);
    else gruposPorCoord.set(key, [c]);
  }
  const grupos = Array.from(gruposPorCoord.values());

  // Lock body scroll while map is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Init map
  useEffect(() => {
    let active = true;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!active || !mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-63.6167, -38.4161],
        zoom: 4,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!active) return;

        for (const grupo of grupos) {
          const carga = grupo[0];
          const emoji = getIconoCarga(carga.tipoCarga, carga.tipoCargaDetalle);
          const color = getPinColor(carga.tipoCarga, carga.tipoCargaDetalle);

          // `el` es el elemento que Mapbox posiciona: escribe su `transform`
          // (translate) en cada frame de pan/zoom. Si el propio hover también
          // escribe `el.style.transform` (scale), pisa esa posición y el pin
          // "salta" a cualquier lado — por eso el hover/transición van en un
          // hijo (`pin`) separado, que nunca es tocado por Mapbox.
          const el = document.createElement("div");
          Object.assign(el.style, {
            width: "42px", height: "42px", cursor: "pointer",
          });

          const pin = document.createElement("div");
          Object.assign(pin.style, {
            position: "relative",
            width: "100%", height: "100%", borderRadius: "50%",
            background: color, border: "2.5px solid white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px",
            transition: "transform 150ms ease, box-shadow 150ms ease",
            userSelect: "none",
          });
          pin.textContent = emoji;
          el.appendChild(pin);

          if (grupo.length > 1) {
            const badge = document.createElement("span");
            Object.assign(badge.style, {
              position: "absolute", top: "-6px", right: "-6px",
              minWidth: "20px", height: "20px", padding: "0 4px",
              borderRadius: "10px", background: "#DC2626", color: "#FFFFFF",
              border: "2px solid white", fontSize: "11px", fontWeight: "800",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            });
            badge.textContent = String(grupo.length);
            pin.appendChild(badge);
          }

          el.addEventListener("mouseenter", () => {
            pin.style.transform = "scale(1.2)";
            pin.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)";
          });
          el.addEventListener("mouseleave", () => {
            pin.style.transform = "scale(1)";
            pin.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
          });
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (grupo.length > 1) {
              setSelectedCarga(null);
              setSelectedGrupo(grupo);
            } else {
              setSelectedGrupo(null);
              setSelectedCarga(carga);
            }
            setPanelState("split");
            map.flyTo({
              center: [carga.origenLng!, carga.origenLat!],
              zoom: Math.max(map.getZoom(), 8),
              duration: 500,
              padding: { bottom: 200 },
            });
          });

          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([carga.origenLng!, carga.origenLat!])
            .addTo(map);
          markersRef.current.push(marker);
        }

        // Fit all pins
        if (cargasConGeo.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          for (const c of cargasConGeo) bounds.extend([c.origenLng!, c.origenLat!]);
          map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 1200 });
          // fitBounds no tiene piso de zoom: con cargas repartidas por todo el
          // país termina muy alejado, y a esa escala el basemap simplifica
          // costas/ríos/deltas — pueblos costeros bien geolocalizados (La
          // Plata, Mar del Plata) se ven "en el mar" aunque el pin esté bien.
          map.once("moveend", () => {
            if (map.getZoom() < 5) map.easeTo({ zoom: 5, duration: 400 });
          });
        } else if (cargasConGeo.length === 1) {
          map.flyTo({ center: [cargasConGeo[0].origenLng!, cargasConGeo[0].origenLat!], zoom: 9, duration: 1000 });
        }

        map.on("click", () => { setSelectedCarga(null); setSelectedGrupo(null); });
      });
    })();

    return () => {
      active = false;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize map after panel transition completes
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 320);
    return () => clearTimeout(t);
  }, [panelState]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 50) setPanelState("map-full");
    else if (dy < -50) setPanelState("split");
  }

  function flyToAndSelect(carga: CargaMapItem) {
    setSelectedGrupo(null);
    setSelectedCarga(carga);
    if (carga.origenLat != null && carga.origenLng != null) {
      mapRef.current?.flyTo({
        center: [carga.origenLng, carga.origenLat],
        zoom: 10,
        duration: 500,
        padding: { bottom: 200 },
      });
    }
  }

  // Heights
  const mapH = isDesktop ? "100%" : panelState === "map-full" ? "82svh" : "44svh";
  const mapTransition = isDesktop ? "none" : "height 300ms ease";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#0A1A1A" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
        style={{ backgroundColor: "#0A1A1A", borderBottom: "1px solid #1E3838" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
          style={{ color: "#4ADE80" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Listado
        </button>
        <span className="text-sm font-medium" style={{ color: "#9CA3AF" }}>
          {cargasConGeo.length > 0
            ? `${cargasConGeo.length} en mapa · ${cargas.length} total`
            : `${cargas.length} carga${cargas.length !== 1 ? "s" : ""}`}
        </span>
        {/* Expand/collapse button (also in the top bar for easy access) */}
        <button
          type="button"
          onClick={() => setPanelState(s => s === "split" ? "map-full" : "split")}
          className="flex items-center gap-1 text-sm font-medium cursor-pointer md:hidden"
          style={{ color: "#9CA3AF" }}
        >
          {panelState === "split" ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">

        {/* MAP */}
        <div
          className="relative flex-shrink-0 md:flex-1 md:flex-shrink-0"
          style={{ height: mapH, transition: mapTransition, minHeight: 0 }}
        >
          <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />
        </div>

        {/* ── Mobile bottom panel ─────────────────────────────────────────── */}
        <div
          className="md:hidden flex flex-col"
          style={{
            backgroundColor: "#F2F5F5",
            transition: "height 300ms ease",
            height: panelState === "map-full" ? "calc(18svh - 0px)" : "calc(56svh - 0px)",
            minHeight: 0,
            overflow: "hidden",
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Handle bar */}
          <div
            className="flex items-center justify-center gap-3 pt-3 pb-2 cursor-pointer flex-shrink-0"
            onClick={() => setPanelState(s => s === "split" ? "map-full" : "split")}
          >
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#D1D5DB" }} />
            {panelState === "map-full" && (
              <span className="text-sm font-semibold" style={{ color: "#374151" }}>
                {cargas.length} carga{cargas.length !== 1 ? "s" : ""} disponible{cargas.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {panelState === "split" && (
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ backgroundColor: "#FFFFFF" }}>
              {selectedCarga ? (
                <SelectedDetail
                  carga={selectedCarga}
                  yaPostulado={yaPostuladoSet.has(selectedCarga.id)}
                  onBack={() => setSelectedCarga(null)}
                />
              ) : selectedGrupo ? (
                <GrupoList
                  cargas={selectedGrupo}
                  yaPostuladoSet={yaPostuladoSet}
                  onSelect={(c) => setSelectedCarga(c)}
                  onBack={() => setSelectedGrupo(null)}
                />
              ) : (
                <>
                  {cargas.length === 0 ? (
                    <p className="p-6 text-sm text-center" style={{ color: "#6B7280" }}>
                      No hay cargas disponibles.
                    </p>
                  ) : (
                    cargas.map(c => (
                      <CargaCard
                        key={c.id}
                        carga={c}
                        yaPostulado={yaPostuladoSet.has(c.id)}
                        selected={false}
                        onClick={() => flyToAndSelect(c)}
                      />
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <div
          className="hidden md:flex md:flex-col md:w-[380px] md:flex-shrink-0 border-l overflow-y-auto"
          style={{ borderColor: "#E2E8E8", backgroundColor: "#F9FAFB" }}
        >
          {selectedCarga ? (
            <SelectedDetail
              carga={selectedCarga}
              yaPostulado={yaPostuladoSet.has(selectedCarga.id)}
              onBack={() => setSelectedCarga(null)}
            />
          ) : selectedGrupo ? (
            <GrupoList
              cargas={selectedGrupo}
              yaPostuladoSet={yaPostuladoSet}
              onSelect={(c) => setSelectedCarga(c)}
              onBack={() => setSelectedGrupo(null)}
            />
          ) : (
            <>
              <div className="px-4 py-4 border-b flex-shrink-0" style={{ borderColor: "#E2E8E8" }}>
                <h2 className="font-bold text-gray-900">{cargas.length} carga{cargas.length !== 1 ? "s" : ""} disponible{cargas.length !== 1 ? "s" : ""}</h2>
                {cargasConGeo.length < cargas.length && (
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                    {cargas.length - cargasConGeo.length} sin ubicación en el mapa
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {cargas.map(c => (
                  <CargaCard
                    key={c.id}
                    carga={c}
                    yaPostulado={yaPostuladoSet.has(c.id)}
                    selected={false}
                    onClick={() => flyToAndSelect(c)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
