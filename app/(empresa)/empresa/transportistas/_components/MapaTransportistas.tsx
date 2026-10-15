"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import RatingChip from "@/app/_components/RatingChip";
import BadgeVerificado from "@/app/_components/BadgeVerificado";
import { VEHICULO_META, getVehiculoLabel } from "@/lib/vehiculos";

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
  actualizadoEn: string;
  esFavorito: boolean;
  ratingPromedio: number | null;
  ratingCantidad: number;
  emailVerified: boolean;
};

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
  const today = new Date().toISOString().slice(0, 10);
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

  const badges = [
    t.disponibleHoy && { label: "Disponible hoy", bg: "#DCFCE7", text: "#166534" },
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
                placeholder="Ej: Traslado de cereal a Buenos Aires"
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
                placeholder="Ej: Cereal, Maquinaria, Hacienda..."
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
              <p className="text-sm font-bold" style={{ color: "#92400E" }}>
                🚛 Salgo vacío desde {t.salidaDesde}
              </p>
              {t.salidaDestino && (
                <p className="text-sm mt-0.5" style={{ color: "#B45309" }}>
                  📍 Destino: {t.salidaDestino}
                </p>
              )}
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

interface Props {
  initialData: TransportistaDisp[];
}

export default function MapaTransportistas({ initialData }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const [selected, setSelected] = useState<TransportistaDisp | null>(null);
  const [data, setData] = useState(initialData);

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

        for (const t of data) {
          const emoji = getVehiculoEmoji(t.vehiculo);
          const color = getVehiculoColor(t.vehiculo);

          // `el` es el elemento que Mapbox posiciona (transform = translate en
          // cada frame de pan/zoom). El hover va en un hijo (`pin`) aparte
          // para no pisar ese transform y hacer "saltar" el pin a cualquier lado.
          const el = document.createElement("div");
          Object.assign(el.style, {
            width: "44px", height: "44px", cursor: "pointer",
          });

          const pin = document.createElement("div");
          Object.assign(pin.style, {
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
            setSelected(t);
            map.flyTo({ center: [t.lng, t.lat], zoom: Math.max(map.getZoom(), 8), duration: 500, padding: { bottom: 200 } });
          });

          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([t.lng, t.lat])
            .addTo(map);
          markersRef.current.push(marker);
        }

        if (data.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          for (const t of data) bounds.extend([t.lng, t.lat]);
          map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 1200 });
          map.once("moveend", () => {
            if (map.getZoom() < 5) map.easeTo({ zoom: 5, duration: 400 });
          });
        } else if (data.length === 1) {
          map.flyTo({ center: [data[0].lng, data[0].lat], zoom: 9, duration: 1000 });
        }

        map.on("click", () => setSelected(null));
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

  const panelH = selected ? "56svh" : "18svh";

  return (
    <div className="flex flex-col" style={{ height: "calc(100svh - 56px - 65px)" }}>
      {/* Map */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

        {/* Count badge */}
        <div
          className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full text-xs font-semibold shadow"
          style={{ backgroundColor: "#FFFFFF", color: "#374151" }}
        >
          {data.length} transportista{data.length !== 1 ? "s" : ""} disponible{data.length !== 1 ? "s" : ""}
        </div>
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
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-sm font-medium" style={{ color: "#6B7280" }}>
              Tocá un pin para ver los detalles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
