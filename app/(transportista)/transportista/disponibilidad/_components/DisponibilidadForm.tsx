"use client";

import { useState, useTransition } from "react";
import LocationAutocomplete, { type LocationSelection } from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationAutocomplete";
import { useRouter } from "next/navigation";
import { radiosConActual } from "@/lib/radios";

const VEHICULO_BASE = [
  { value: "tolva_cerealera", label: "Tolva cerealera", emoji: "🌾", hasVariant: true },
  { value: "batea",           label: "Batea",           emoji: "🪣", hasVariant: true },
  { value: "chasis_acoplado", label: "Chasis c/Acoplado", emoji: "🚛", hasVariant: true },
  { value: "semirremolque",   label: "Semirremolque",   emoji: "🚚", hasVariant: true },
  { value: "jaula_ganadera",  label: "Jaula ganadera",  emoji: "🐄", hasVariant: false },
  { value: "sider",           label: "Sider",           emoji: "📦", hasVariant: false },
  { value: "furgon",          label: "Furgón",          emoji: "🚐", hasVariant: false },
  { value: "playo",           label: "Playo",           emoji: "🛻", hasVariant: false },
  { value: "frigorifico",     label: "Frigorífico",     emoji: "❄️", hasVariant: false },
  { value: "cisterna",        label: "Cisterna",        emoji: "🛢️", hasVariant: false },
  { value: "portacontenedor", label: "Portacontenedor", emoji: "🏗️", hasVariant: false },
  { value: "carreton",        label: "Carretón",        emoji: "🚜", hasVariant: false },
  { value: "volcador",        label: "Volcador",        emoji: "⬆️", hasVariant: false },
];

const VARIANTE = [
  { value: "comun",    label: "Común" },
  { value: "escalable", label: "Escalable" },
];

function buildVehiculo(base: string, variant: string): string {
  if (!base) return "";
  const item = VEHICULO_BASE.find((v) => v.value === base);
  if (!item) return "";
  if (item.hasVariant) return variant ? `${base}_${variant}` : "";
  return base;
}

function parseVehiculoInit(v: string): { base: string; variant: string } {
  if (!v) return { base: "", variant: "" };
  // New format: flat types
  const flat = VEHICULO_BASE.find((b) => b.value === v && !b.hasVariant);
  if (flat) return { base: v, variant: "" };
  // New format: variant types  (e.g. "tolva_cerealera_comun")
  for (const suffix of ["_comun", "_escalable"]) {
    if (v.endsWith(suffix)) {
      const base = v.slice(0, -suffix.length);
      const item = VEHICULO_BASE.find((b) => b.value === base && b.hasVariant);
      if (item) return { base, variant: suffix.slice(1) };
    }
  }
  // Legacy mappings
  if (v === "batea_comun")              return { base: "batea",           variant: "comun" };
  if (v === "batea_escalable")          return { base: "batea",           variant: "escalable" };
  if (v === "camion_acoplado_comun")    return { base: "chasis_acoplado", variant: "comun" };
  if (v === "camion_acoplado_escalable") return { base: "chasis_acoplado", variant: "escalable" };
  return { base: "", variant: "" };
}

type Disponibilidad = {
  id: number;
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
  activo: boolean;
  actualizadoEn: string;
};

interface Props {
  inicial: Disponibilidad | null;
  /** Si la disponibilidad inicial ya venció por tiempo (24h/7d) aunque siga "activa". */
  vigenteInicial?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1.5px solid #E2E8E8",
  fontSize: "15px",
  outline: "none",
  backgroundColor: "#FFFFFF",
  color: "#111827",
};

export default function DisponibilidadForm({ inicial, vigenteInicial = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deactivating, setDeactivating] = useState(false);

  const _init = parseVehiculoInit(inicial?.vehiculo ?? "");
  const [vBase, setVBase] = useState(_init.base);
  const [vVariant, setVVariant] = useState(_init.variant);
  const [zona, setZona] = useState(inicial?.zona ?? "");
  const [loc, setLoc] = useState<LocationSelection | null>(
    inicial ? { label: inicial.zona, lat: inicial.lat, lng: inicial.lng } : null,
  );
  const [radioKm, setRadioKm] = useState<number | null>(inicial?.radioKm ?? 50);
  const [regresoVacio, setRegresoVacio] = useState(inicial?.regresoVacio ?? false);
  const [buscaCarga, setBuscaCarga] = useState(inicial?.buscaCarga ?? false);
  const [voyAPuerto, setVoyAPuerto] = useState(inicial?.voyAPuerto ?? false);
  const [disponibleHoy, setDisponibleHoy] = useState(inicial?.disponibleHoy ?? false);
  const [salidaDesde, setSalidaDesde] = useState(inicial?.salidaDesde ?? "");
  const [salidaDestino, setSalidaDestino] = useState(inicial?.salidaDestino ?? "");
  const [error, setError] = useState("");
  const [activo, setActivo] = useState(inicial?.activo ?? false);
  const [vigente, setVigente] = useState(vigenteInicial);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vehiculo = buildVehiculo(vBase, vVariant);
    if (!loc) { setError("Seleccioná una localidad de la lista."); return; }
    if (!vehiculo) { setError("Seleccioná el tipo de vehículo completo."); return; }
    setError("");

    startTransition(async () => {
      const res = await fetch("/api/disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiculo,
          zona: loc.label,
          lat: loc.lat,
          lng: loc.lng,
          radioKm,
          regresoVacio,
          buscaCarga,
          voyAPuerto,
          disponibleHoy,
          salidaDesde: salidaDesde.trim() || null,
          salidaDestino: salidaDestino.trim() || null,
        }),
      });
      if (res.ok) {
        setActivo(true);
        setVigente(true);
        router.refresh();
      } else {
        setError("Error al guardar. Intentá de nuevo.");
      }
    });
  }

  async function handleDesactivar() {
    setDeactivating(true);
    const res = await fetch("/api/disponibilidad", { method: "DELETE" });
    if (res.ok) {
      setActivo(false);
      router.refresh();
    }
    setDeactivating(false);
  }

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#6B7280",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status banner */}
      {activo && vigente && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between border"
          style={{ backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold" style={{ color: "#166534" }}>
              Estás marcado como disponible
            </span>
          </div>
          <button
            type="button"
            onClick={handleDesactivar}
            disabled={deactivating}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
          >
            {deactivating ? "..." : "Desactivar"}
          </button>
        </div>
      )}

      {activo && !vigente && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between border"
          style={{ backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#D97706" }} />
            <span className="text-sm font-semibold" style={{ color: "#92400E" }}>
              Tu disponibilidad venció, ya no aparecés en el mapa
            </span>
          </div>
          <button
            type="button"
            onClick={handleDesactivar}
            disabled={deactivating}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
          >
            {deactivating ? "..." : "Desactivar"}
          </button>
        </div>
      )}

      {/* Tipo de vehículo */}
      <div className="space-y-3">
        <span style={labelStyle}>Tipo de vehículo</span>

        {/* Nivel 1 — todos los tipos */}
        <div className="grid grid-cols-2 gap-2">
          {VEHICULO_BASE.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => { setVBase(v.value); setVVariant(""); }}
              className="flex items-center gap-2 px-3 py-3 rounded-xl border transition-all text-xs font-semibold text-left min-w-0"
              style={{
                backgroundColor: vBase === v.value ? "var(--primary-10)" : "#FFFFFF",
                borderColor: vBase === v.value ? "var(--primary)" : "#E2E8E8",
                color: vBase === v.value ? "var(--primary)" : "#374151",
              }}
            >
              <span className="text-lg flex-shrink-0">{v.emoji}</span>
              <span className="leading-tight min-w-0 break-words">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Nivel 2 — Común / Escalable (solo para tipos que lo requieren) */}
        {vBase && VEHICULO_BASE.find((b) => b.value === vBase)?.hasVariant && (
          <div className="grid grid-cols-2 gap-2 pl-3 border-l-2" style={{ borderColor: "var(--primary)" }}>
            {VARIANTE.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVVariant(v.value)}
                className="px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                style={{
                  backgroundColor: vVariant === v.value ? "var(--primary-10)" : "#FFFFFF",
                  borderColor: vVariant === v.value ? "var(--primary)" : "#E2E8E8",
                  color: vVariant === v.value ? "var(--primary)" : "#374151",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zona */}
      <div>
        <label style={labelStyle} htmlFor="zona-input">
          ¿Desde dónde salís a trabajar?
        </label>
        <p className="text-xs mb-2" style={{ color: "#6B7280" }}>
          Tu ciudad o localidad base — desde donde partís habitualmente
        </p>
        <LocationAutocomplete
          id="zona-input"
          name="zona"
          placeholder="Ej: Rosario, Santa Fe"
          required
          inputClass=""
          inputStyle={inputStyle}
          initialValue={zona}
          onValueChange={(v) => { setZona(v); if (!v) setLoc(null); }}
          onLocationSelect={(l) => setLoc(l)}
        />
        {!loc && zona.length > 0 && (
          <p className="text-xs mt-1" style={{ color: "#F59E0B" }}>
            Seleccioná una opción de la lista
          </p>
        )}
      </div>

      {/* Radio */}
      <div>
        <span style={labelStyle}>Radio de trabajo</span>
        <div className="flex gap-2 flex-wrap">
          {radiosConActual(inicial?.radioKm ?? 50).map((r) => (
            <button
              key={String(r.value)}
              type="button"
              onClick={() => setRadioKm(r.value)}
              className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all"
              style={{
                backgroundColor: radioKm === r.value ? "var(--primary)" : "#FFFFFF",
                borderColor: radioKm === r.value ? "var(--primary)" : "#E2E8E8",
                color: radioKm === r.value ? "#FFFFFF" : "#374151",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges opcionales */}
      <div>
        <span style={labelStyle}>Estado (opcional)</span>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "regresoVacio", label: "Regreso vacío", state: regresoVacio, set: setRegresoVacio },
            { key: "buscaCarga", label: "Busco carga", state: buscaCarga, set: setBuscaCarga },
            { key: "voyAPuerto", label: "Voy hacia puerto", state: voyAPuerto, set: setVoyAPuerto },
            { key: "disponibleHoy", label: "Disponible hoy", state: disponibleHoy, set: setDisponibleHoy },
          ].map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => b.set(!b.state)}
              className="px-3 py-2 rounded-xl border text-sm font-semibold transition-all"
              style={{
                backgroundColor: b.state ? "var(--primary-10)" : "#FFFFFF",
                borderColor: b.state ? "var(--primary)" : "#E2E8E8",
                color: b.state ? "var(--primary)" : "#6B7280",
              }}
            >
              {b.state ? "✓ " : ""}{b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Salgo vacío desde */}
      <div>
        <span style={labelStyle}>Salgo vacío desde (opcional)</span>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="🚛 Ej: Rosario"
            value={salidaDesde}
            onChange={(e) => setSalidaDesde(e.target.value)}
            style={inputStyle}
          />
          {salidaDesde && (
            <input
              type="text"
              placeholder="📍 Destino (ej: Córdoba)"
              value={salidaDestino}
              onChange={(e) => setSalidaDestino(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !loc || !buildVehiculo(vBase, vVariant)}
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-opacity"
        style={{
          backgroundColor: "var(--primary)",
          color: "#FFFFFF",
          opacity: pending || !loc || !buildVehiculo(vBase, vVariant) ? 0.6 : 1,
        }}
      >
        {pending
          ? "Guardando..."
          : !activo
            ? "✓ Estoy disponible"
            : vigente
              ? "Actualizar disponibilidad"
              : "↻ Reactivar disponibilidad"}
      </button>
    </form>
  );
}
