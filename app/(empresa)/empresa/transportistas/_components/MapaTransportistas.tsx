"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker, GeoJSONSource } from "mapbox-gl";
import RatingChip from "@/app/_components/RatingChip";
import BadgeVerificado from "@/app/_components/BadgeVerificado";
import { VEHICULO_META, getVehiculoLabel } from "@/lib/vehiculos";
import { hoyArgentina } from "@/lib/chat-carga";
import { ESPACIO_META, esEspacio, etiquetaFecha } from "@/lib/disponibilidad";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function getVehiculoEmoji(v: string): string  { return VEHICULO_META[v]?.emoji ?? "🚛"; }
function getVehiculoColor(v: string): string  { return VEHICULO_META[v]?.color ?? "#374151"; }

export type TransportistaDisp = {
  id: number;
  transportistaId: string;
  vehiculo: string;
  zona: string;
  lat: number;
  lng: number;
  radioKm: number | null;
  regresoVacio: boolean;
  buscaCarga: boolean;
  voyAPuerto: boolean;
  disponibleHoy: boolean;
  salidaDesde: string | null;
  salidaDestino: string | null;
  salidaDesdeLat: number | null;
  salidaDesdeLng: number | null;
  salidaDestinoLat: number | null;
  salidaDestinoLng: number | null;
  /** "YYYY-MM-DD" o null (sin día fijo: disponible en la semana). */
  fecha: string | null;
  espacio: string | null;
  espacioDetalle: string | null;
  /** Km entre la zona de la empresa y la línea del viaje (null sin viaje o sin zona). */
  distanciaViajeKm: number | null;
  pasaPorMiZona: boolean;
  actualizadoEn: string;
  esFavorito: boolean;
  ratingPromedio: number | null;
  ratingCantidad: number;
  emailVerified: boolean;
  miembroDesde: string | null;
  viajesRealizados: number;
  esFlota: boolean;
};

export type ZonaEmpresa = { lat: number; lng: number; radioKm: number };

function tieneViaje(t: TransportistaDisp): t is TransportistaDisp & {
  salidaDesdeLat: number; salidaDesdeLng: number; salidaDestinoLat: number; salidaDestinoLng: number;
} {
  return t.salidaDesdeLat != null && t.salidaDesdeLng != null && t.salidaDestinoLat != null && t.salidaDestinoLng != null;
}

/** "Hoy", "Mañana", "sáb 8 nov" o null si no tiene día fijo. */
function cuandoLabel(t: TransportistaDisp): string | null {
  if (t.fecha) return etiquetaFecha(t.fecha);
  return t.disponibleHoy ? "Hoy" : null;
}

/** Nombre corto de una localidad: "Rosario, Santa Fe" → "Rosario". */
function corto(lugar: string | null): string {
  return (lugar ?? "").split(",")[0].trim();
}

/** "nov. 2026": la antigüedad alcanza con mes y año. */
function formatMesAnio(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatRelative(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "hace menos de 1 hora";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d !== 1 ? "s" : ""}`;
}

type SolicitudForm = {
  titulo: string;
  origen: string;
  destino: string;
  tipoCarga: string;
  fechaCarga: string;
  presupuesto: string;
  descripcion: string;
};

function DetailPanel({
  t,
  onClose,
  onToggleFav,
}: {
  t: TransportistaDisp;
  onClose: () => void;
  onToggleFav: (id: string, current: boolean) => Promise<void>;
}) {
  const color = getVehiculoColor(t.vehiculo);
  const emoji = getVehiculoEmoji(t.vehiculo);
  const [fav, setFav] = useState(t.esFavorito);
  const [toggling, setToggling] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();
  // Hoy en Argentina: con toISOString, después de las 21 h ya sería mañana.
  const today = hoyArgentina();
  const [form, setForm] = useState<SolicitudForm>({
    titulo: "",
    origen: "",
    destino: "",
    tipoCarga: "",
    fechaCarga: today,
    presupuesto: "",
    descripcion: "",
  });

  async function handleFav() {
    setToggling(true);
    await onToggleFav(t.transportistaId, fav);
    setFav(!fav);
    setToggling(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSolicitar() {
    setFormError("");
    if (!form.titulo || !form.origen || !form.destino || !form.tipoCarga || !form.fechaCarga) {
      setFormError("Completá los campos obligatorios.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/transportistas/${t.transportistaId}/solicitar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: form.titulo,
            origen: form.origen,
            destino: form.destino,
            tipoCarga: form.tipoCarga,
            fechaCarga: form.fechaCarga,
            presupuesto: form.presupuesto ? Number(form.presupuesto) : null,
            descripcion: form.descripcion || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFormError(data.error ?? "Error al enviar solicitud.");
        } else {
          setFormSent(true);
          setShowForm(false);
        }
      } catch {
        setFormError("Error de red. Intentá de nuevo.");
      }
    });
  }

  const cuando = cuandoLabel(t);
  const espacio = esEspacio(t.espacio) ? ESPACIO_META[t.espacio] : null;
  const badges = [
    cuando && { label: cuando === "Hoy" ? "Disponible hoy" : `📅 ${cuando}`, bg: "#DCFCE7", text: "#166534" },
    espacio && { label: espacio.label === "Vacío" ? "Va vacío" : espacio.label === "Algo chico" ? "Lugar para algo chico" : "Lugar parcial", bg: espacio.bg, text: espacio.text },
    t.regresoVacio && { label: "Regreso vacío", bg: "#FEF3C7", text: "#92400E" },
    t.buscaCarga && { label: "Busco carga", bg: "#DBEAFE", text: "#1E40AF" },
    t.voyAPuerto && { label: "Voy a puerto", bg: "#F3E8FF", text: "#6B21A8" },
  ].filter(Boolean) as { label: string; bg: string; text: string }[];

  return (
    <div className="flex flex-col h-full bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "#E2E8E8" }}
      >
        <button
          type="button"
          onClick={showForm ? () => setShowForm(false) : onClose}
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--primary)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          {showForm ? "Cancelar" : "Volver"}
        </button>
        {!showForm && (
          <button
            type="button"
            onClick={handleFav}
            disabled={toggling}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: fav ? "#FEE2E2" : "var(--primary-10)",
              color: fav ? "#991B1B" : "var(--primary)",
            }}
          >
            {fav ? "♥ Guardado" : "♡ Me interesa"}
          </button>
        )}
      </div>

      {showForm ? (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-base font-bold text-gray-900 mb-4">Solicitar servicio</p>

          {formError && (
            <div className="mb-3 px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                Título *
              </label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleFormChange}
                placeholder="Ej: Traslado de mercadería a Buenos Aires"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D1D5DB", color: "#111827" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                  Origen *
                </label>
                <input
                  name="origen"
                  value={form.origen}
                  onChange={handleFormChange}
                  placeholder="Ciudad/Provincia"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "#D1D5DB", color: "#111827" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                  Destino *
                </label>
                <input
                  name="destino"
                  value={form.destino}
                  onChange={handleFormChange}
                  placeholder="Ciudad/Provincia"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "#D1D5DB", color: "#111827" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                Tipo de carga *
              </label>
              <input
                name="tipoCarga"
                value={form.tipoCarga}
                onChange={handleFormChange}
                placeholder="Ej: Pallets, mudanza, maquinaria..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D1D5DB", color: "#111827" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fechaCarga"
                  value={form.fechaCarga}
                  onChange={handleFormChange}
                  min={today}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "#D1D5DB", color: "#111827" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                  Presupuesto (ARS)
                </label>
                <input
                  type="number"
                  name="presupuesto"
                  value={form.presupuesto}
                  onChange={handleFormChange}
                  placeholder="Opcional"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "#D1D5DB", color: "#111827" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                Descripción adicional
              </label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleFormChange}
                placeholder="Detalles, condiciones, etc. (opcional)"
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                style={{ borderColor: "#D1D5DB", color: "#111827" }}
              />
            </div>

            <button
              type="button"
              onClick={handleSolicitar}
              disabled={isPending}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{ backgroundColor: "var(--primary)", opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          {formSent && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
              ✓ Solicitud enviada. El transportista fue notificado.
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <span
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 flex-shrink-0"
              style={{ backgroundColor: color + "18", borderColor: color }}
            >
              {emoji}
            </span>
            <div>
              <p className="text-lg font-black text-gray-900">
                {getVehiculoLabel(t.vehiculo)}
              </p>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                {t.zona}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <RatingChip promedio={t.ratingPromedio} cantidad={t.ratingCantidad} />
                <BadgeVerificado verificado={t.emailVerified} />
                {t.esFlota && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#E0E7FF", color: "#3730A3" }}
                    title="Tiene más de un vehículo y puede cubrir varios camiones"
                  >
                    Flota
                  </span>
                )}
              </div>
            </div>
          </div>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: b.bg, color: b.text }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {t.salidaDesde && (
            <div
              className="rounded-xl border px-4 py-3 mb-4"
              style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#B45309" }}>
                Viaje{cuando ? ` · ${cuando}` : ""}
              </p>
              <p className="text-sm font-bold" style={{ color: "#92400E" }}>
                {t.salidaDestino ? (
                  <>{t.salidaDesde} → {t.salidaDestino}</>
                ) : (
                  <>Sale desde {t.salidaDesde}</>
                )}
              </p>
              {t.pasaPorMiZona && t.distanciaViajeKm != null && (
                <p className="text-sm mt-1 font-semibold" style={{ color: "#166534" }}>
                  ✓ Pasa {t.distanciaViajeKm <= 5 ? "por tu zona" : `a ~${t.distanciaViajeKm} km de tu zona`}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "#B45309" }}>
                Recorrido aproximado: puede variar según la ruta.
              </p>
            </div>
          )}

          {espacio && (t.espacio !== "vacio" || t.espacioDetalle) && (
            <div
              className="rounded-xl border px-4 py-3 mb-4"
              style={{ backgroundColor: espacio.bg, borderColor: espacio.bg }}
            >
              <p className="text-sm font-bold" style={{ color: espacio.text }}>
                {espacio.emoji} {espacio.label}: {t.espacioDetalle ?? espacio.ayuda.toLowerCase()}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3 border" style={{ borderColor: "#E2E8E8" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>
                Radio
              </p>
              <p className="text-sm font-bold text-gray-900">
                {t.radioKm != null ? `${t.radioKm} km` : "Sin límite"}
              </p>
            </div>
            <div className="rounded-xl p-3 border" style={{ borderColor: "#E2E8E8" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>
                Actualizado
              </p>
              <p className="text-sm font-bold text-gray-900">
                {formatRelative(t.actualizadoEn)}
              </p>
            </div>
            <div className="rounded-xl p-3 border" style={{ borderColor: "#E2E8E8" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>
                Viajes en ClickCargo
              </p>
              <p className="text-sm font-bold text-gray-900">
                {t.viajesRealizados > 0 ? t.viajesRealizados : "Todavía ninguno"}
              </p>
            </div>
            <div className="rounded-xl p-3 border" style={{ borderColor: "#E2E8E8" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>
                Miembro desde
              </p>
              <p className="text-sm font-bold text-gray-900">
                {formatMesAnio(t.miembroDesde)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Solicitar servicio
          </button>

          <p className="text-xs mt-3 text-center" style={{ color: "#9CA3AF" }}>
            Zona aproximada · Sin datos personales
          </p>
        </div>
      )}
    </div>
  );
}

type Filtro = "todos" | "mi_zona" | "viajes" | "lugar";

interface Props {
  initialData: TransportistaDisp[];
  zonaEmpresa: ZonaEmpresa | null;
}

// Tipos GeoJSON mínimos (el paquete @types/geojson no está instalado).
type Feature = {
  type: "Feature";
  properties: Record<string, string | number>;
  geometry: { type: "LineString"; coordinates: [number, number][] } | { type: "Point"; coordinates: [number, number] };
};
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

const VACIO: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Líneas origen → destino y sus dos puntos, para la fuente "viajes". */
function viajesGeoJSON(items: TransportistaDisp[]): FeatureCollection {
  const features: Feature[] = [];
  for (const t of items) {
    if (!tieneViaje(t)) continue;
    const color = getVehiculoColor(t.vehiculo);
    const a: [number, number] = [t.salidaDesdeLng, t.salidaDesdeLat];
    const b: [number, number] = [t.salidaDestinoLng, t.salidaDestinoLat];
    features.push(
      { type: "Feature", properties: { id: t.id, color }, geometry: { type: "LineString", coordinates: [a, b] } },
      { type: "Feature", properties: { id: t.id, color, punta: "origen" }, geometry: { type: "Point", coordinates: a } },
      { type: "Feature", properties: { id: t.id, color, punta: "destino" }, geometry: { type: "Point", coordinates: b } },
    );
  }
  return { type: "FeatureCollection", features };
}

function TarjetaResumen({ t, onClick }: { t: TransportistaDisp; onClick: () => void }) {
  const cuando = cuandoLabel(t);
  const espacio = esEspacio(t.espacio) ? ESPACIO_META[t.espacio] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 w-56 rounded-xl border px-3 py-2.5 text-left"
      style={{ borderColor: t.pasaPorMiZona ? "#86EFAC" : "#E2E8E8", backgroundColor: "#FFFFFF" }}
    >
      <p className="text-sm font-bold text-gray-900 truncate">
        {getVehiculoEmoji(t.vehiculo)} {getVehiculoLabel(t.vehiculo)}
      </p>
      <p className="text-xs truncate" style={{ color: "#374151" }}>
        {t.salidaDesde && t.salidaDestino ? `${corto(t.salidaDesde)} → ${corto(t.salidaDestino)}` : corto(t.zona)}
      </p>
      <div className="flex gap-1 mt-1.5 flex-wrap">
        {cuando && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
            {cuando}
          </span>
        )}
        {espacio && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: espacio.bg, color: espacio.text }}>
            {espacio.label}
          </span>
        )}
        {t.pasaPorMiZona && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F0FDF4", color: "#166534" }}>
            Pasa por tu zona
          </span>
        )}
      </div>
    </button>
  );
}

export default function MapaTransportistas({ initialData, zonaEmpresa }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<TransportistaDisp | null>(null);
  const [data, setData] = useState(initialData);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const conteos = useMemo(
    () => ({
      todos: data.length,
      mi_zona: data.filter((t) => t.pasaPorMiZona).length,
      viajes: data.filter(tieneViaje).length,
      lugar: data.filter((t) => t.espacio != null).length,
    }),
    [data],
  );

  const visibles = useMemo(() => {
    const filtrados = data.filter((t) =>
      filtro === "mi_zona" ? t.pasaPorMiZona
      : filtro === "viajes" ? tieneViaje(t)
      : filtro === "lugar" ? t.espacio != null
      : true,
    );
    // Primero los que pasan por la zona de la empresa, después por fecha.
    return filtrados.sort((a, b) => {
      if (a.pasaPorMiZona !== b.pasaPorMiZona) return a.pasaPorMiZona ? -1 : 1;
      return (a.fecha ?? "9999") < (b.fecha ?? "9999") ? -1 : (a.fecha ?? "9999") > (b.fecha ?? "9999") ? 1 : 0;
    });
  }, [data, filtro]);

  // El handler de click del mapa vive desde el primer render: lee los datos
  // actuales por ref, no por closure.
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Mapa: se crea una sola vez. Pines y líneas se dibujan en el efecto de abajo.
  useEffect(() => {
    let active = true;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!active || !mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = TOKEN;
      mapboxRef.current = mapboxgl;

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

        map.addSource("viajes", { type: "geojson", data: VACIO });
        // Tramo aproximado: línea punteada, no la ruta real.
        map.addLayer({
          id: "viajes-linea",
          type: "line",
          source: "viajes",
          filter: ["==", ["geometry-type"], "LineString"],
          layout: { "line-cap": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
            "line-opacity": 0.75,
            "line-dasharray": [0.5, 2],
          },
        });
        map.addLayer({
          id: "viajes-sel",
          type: "line",
          source: "viajes",
          filter: ["==", ["get", "id"], -1],
          layout: { "line-cap": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 5, "line-dasharray": [0.5, 1.5] },
        });
        // Área ancha e invisible para que tocar la línea con el dedo funcione.
        map.addLayer({
          id: "viajes-hit",
          type: "line",
          source: "viajes",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": "#000000", "line-width": 18, "line-opacity": 0 },
        });
        map.addLayer({
          id: "viajes-puntos",
          type: "circle",
          source: "viajes",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": ["match", ["get", "punta"], "destino", 6, 4],
            "circle-color": ["match", ["get", "punta"], "destino", ["get", "color"], "#FFFFFF"],
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2,
          },
        });

        if (zonaEmpresa) {
          const el = document.createElement("div");
          Object.assign(el.style, {
            padding: "2px 8px", borderRadius: "999px", background: "#111827", color: "white",
            fontSize: "11px", fontWeight: "700", boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
            pointerEvents: "none", whiteSpace: "nowrap",
          });
          el.textContent = "📍 Tu zona";
          new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([zonaEmpresa.lng, zonaEmpresa.lat])
            .addTo(map);
        }

        map.on("mouseenter", "viajes-hit", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "viajes-hit", () => { map.getCanvas().style.cursor = ""; });
        map.on("click", (e) => {
          const [hit] = map.queryRenderedFeatures(e.point, { layers: ["viajes-hit"] });
          const id = (hit as { properties?: Record<string, unknown> } | undefined)?.properties?.id;
          if (id == null) { setSelected(null); return; }
          setSelected(dataRef.current.find((t) => t.id === id) ?? null);
        });

        setMapReady(true);
      });
    })();

    return () => {
      active = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function seleccionar(t: TransportistaDisp) {
    setSelected(t);
    const map = mapRef.current;
    if (!map) return;
    if (tieneViaje(t) && mapboxRef.current) {
      const bounds = new mapboxRef.current.LngLatBounds();
      bounds.extend([t.salidaDesdeLng, t.salidaDesdeLat]).extend([t.salidaDestinoLng, t.salidaDestinoLat]);
      map.fitBounds(bounds, { padding: { top: 60, left: 50, right: 50, bottom: 60 }, maxZoom: 9, duration: 600 });
    } else {
      map.flyTo({ center: [t.lng, t.lat], zoom: Math.max(map.getZoom(), 8), duration: 500 });
    }
  }

  // Pines + líneas de lo que pasa el filtro.
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!mapReady || !map || !mapboxgl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const t of visibles) {
      const emoji = getVehiculoEmoji(t.vehiculo);
      const color = getVehiculoColor(t.vehiculo);

      // `el` es el elemento que Mapbox posiciona (transform = translate en
      // cada frame de pan/zoom). El hover va en un hijo (`pin`) aparte
      // para no pisar ese transform y hacer "saltar" el pin a cualquier lado.
      const el = document.createElement("div");
      Object.assign(el.style, { width: "44px", height: "44px", cursor: "pointer" });

      const pin = document.createElement("div");
      Object.assign(pin.style, {
        width: "100%", height: "100%", borderRadius: "50%",
        background: color, border: t.pasaPorMiZona ? "3px solid #22C55E" : "2.5px solid white",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        userSelect: "none",
      });
      pin.textContent = emoji;
      el.appendChild(pin);
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
        // seleccionar() solo usa refs y setters: no importa de qué render sea.
        seleccionar(t);
      });

      // Con viaje, el pin va donde arranca el viaje; si no, en su zona base.
      const pos: [number, number] = tieneViaje(t) ? [t.salidaDesdeLng, t.salidaDesdeLat] : [t.lng, t.lat];
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(pos).addTo(map),
      );
    }

    (map.getSource("viajes") as GeoJSONSource | undefined)?.setData(viajesGeoJSON(visibles));

    const bounds = new mapboxgl.LngLatBounds();
    for (const t of visibles) {
      bounds.extend([t.lng, t.lat]);
      if (tieneViaje(t)) {
        bounds.extend([t.salidaDesdeLng, t.salidaDesdeLat]).extend([t.salidaDestinoLng, t.salidaDestinoLat]);
      }
    }
    if (filtro === "mi_zona" && zonaEmpresa) bounds.extend([zonaEmpresa.lng, zonaEmpresa.lat]);
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 9, duration: 900 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, visibles]);

  // Resaltar el viaje seleccionado.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setFilter("viajes-sel", [
      "all",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["get", "id"], selected?.id ?? -1],
    ]);
  }, [mapReady, selected]);

  async function toggleFav(transportistaId: string, current: boolean) {
    await fetch("/api/disponibilidad/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transportistaId }),
    });
    setData((prev) =>
      prev.map((d) =>
        d.transportistaId === transportistaId ? { ...d, esFavorito: !current } : d,
      ),
    );
  }

  const filtros: { v: Filtro; label: string; n: number }[] = [
    { v: "todos", label: "Todos", n: conteos.todos },
    ...(zonaEmpresa ? [{ v: "mi_zona" as const, label: "Pasan por mi zona", n: conteos.mi_zona }] : []),
    { v: "viajes", label: "Con viaje", n: conteos.viajes },
    { v: "lugar", label: "Con lugar libre", n: conteos.lugar },
  ];

  const panelH = selected ? "56svh" : visibles.length > 0 ? "auto" : "18svh";

  return (
    <div className="flex flex-col" style={{ height: "calc(100svh - 56px - 65px)" }}>
      {/* Map */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

        {/* Filtros */}
        <div className="absolute top-3 left-3 right-14 z-10 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {filtros.map((f) => {
            const sel = filtro === f.v;
            return (
              <button
                key={f.v}
                type="button"
                onClick={() => { setFiltro(f.v); setSelected(null); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold shadow whitespace-nowrap"
                style={{
                  backgroundColor: sel ? "var(--primary)" : "#FFFFFF",
                  color: sel ? "#FFFFFF" : "#374151",
                }}
              >
                {f.label} · {f.n}
              </button>
            );
          })}
        </div>

        {!zonaEmpresa && conteos.viajes > 0 && (
          <a
            href="/empresa/cuenta"
            className="absolute bottom-3 left-3 right-3 z-10 rounded-xl px-3 py-2 text-xs font-semibold shadow text-center"
            style={{ backgroundColor: "#FFFFFF", color: "#374151" }}
          >
            Configurá tu zona en <span style={{ color: "var(--primary)" }}>Mi cuenta</span> para ver qué viajes pasan cerca tuyo
          </a>
        )}
      </div>

      {/* Bottom panel */}
      <div
        className="flex-shrink-0 overflow-hidden border-t"
        style={{
          height: panelH,
          transition: "height 300ms ease",
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8E8",
        }}
      >
        {selected ? (
          <DetailPanel
            key={selected.id}
            t={selected}
            onClose={() => setSelected(null)}
            onToggleFav={toggleFav}
          />
        ) : visibles.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-3 py-3">
            {visibles.map((t) => (
              <TarjetaResumen key={t.id} t={t} onClick={() => seleccionar(t)} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-sm font-medium" style={{ color: "#6B7280" }}>
              {filtro === "mi_zona"
                ? "Por ahora ningún viaje anunciado pasa por tu zona."
                : "Ningún transportista coincide con este filtro."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
