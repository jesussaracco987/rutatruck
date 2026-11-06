"use client";

import { useState, useTransition } from "react";
import LocationAutocomplete, {
  buscarLocalidadExacta,
  type LocationSelection,
} from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationAutocomplete";
import { useRouter } from "next/navigation";
import { radiosConActual } from "@/lib/radios";
import { hoyArgentina } from "@/lib/chat-carga";
import {
  ESPACIOS,
  ESPACIO_META,
  FECHA_MAX_DIAS,
  esEspacio,
  etiquetaFecha,
  fechaISO,
  sumarDias,
  type Espacio,
} from "@/lib/disponibilidad";

const VEHICULO_BASE = [
  { value: "utilitario",      label: "Utilitario",      emoji: "🚐", hasVariant: false },
  { value: "camioneta",       label: "Camioneta",       emoji: "🛻", hasVariant: false },
  { value: "furgon",          label: "Furgón",          emoji: "🚐", hasVariant: false },
  { value: "playo",           label: "Playo",           emoji: "🛻", hasVariant: false },
  { value: "sider",           label: "Sider",           emoji: "📦", hasVariant: false },
  { value: "chasis_acoplado", label: "Chasis c/Acoplado", emoji: "🚛", hasVariant: true },
  { value: "semirremolque",   label: "Semirremolque",   emoji: "🚚", hasVariant: true },
  { value: "frigorifico",     label: "Frigorífico",     emoji: "❄️", hasVariant: false },
  { value: "volcador",        label: "Volcador",        emoji: "⬆️", hasVariant: false },
  { value: "batea",           label: "Batea",           emoji: "🪣", hasVariant: true },
  { value: "cisterna",        label: "Cisterna",        emoji: "🛢️", hasVariant: false },
  { value: "portacontenedor", label: "Portacontenedor", emoji: "🏗️", hasVariant: false },
  { value: "carreton",        label: "Carretón",        emoji: "🚛", hasVariant: false },
  { value: "tolva_cerealera", label: "Tolva",           emoji: "🚛", hasVariant: true },
  { value: "jaula_ganadera",  label: "Jaula",           emoji: "🚛", hasVariant: false },
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

type Cuando = "hoy" | "manana" | "fecha" | "semana";

const CUANDO_OPCIONES: { v: Cuando; label: string }[] = [
  { v: "hoy", label: "Hoy" },
  { v: "manana", label: "Mañana" },
  { v: "fecha", label: "Otro día" },
  { v: "semana", label: "Esta semana" },
];

/** Qué opción de "¿Cuándo?" corresponde a lo guardado. */
function cuandoInicial(fecha: string | null, disponibleHoy: boolean): Cuando {
  const hoy = hoyArgentina();
  if (!fecha) return disponibleHoy ? "hoy" : "semana";
  if (fecha <= hoy) return "hoy";
  if (fecha === sumarDias(hoy, 1)) return "manana";
  return "fecha";
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
  salidaDesdeLat: number | null;
  salidaDesdeLng: number | null;
  salidaDestinoLat: number | null;
  salidaDestinoLng: number | null;
  /** "YYYY-MM-DD" o null. */
  fecha: string | null;
  espacio: string | null;
  espacioDetalle: string | null;
  activo: boolean;
  actualizadoEn: string;
};

interface Props {
  inicial: Disponibilidad | null;
  /** Si la disponibilidad inicial ya venció por tiempo aunque siga "activa". */
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

function locInicial(label: string | null | undefined, lat: number | null | undefined, lng: number | null | undefined) {
  return label && lat != null && lng != null ? { label, lat, lng } : null;
}

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
  const voyAPuerto = inicial?.voyAPuerto ?? false;

  const fechaGuardada = fechaISO(inicial?.fecha);
  const [cuando, setCuando] = useState<Cuando>(cuandoInicial(fechaGuardada, inicial?.disponibleHoy ?? false));
  const [fechaElegida, setFechaElegida] = useState(
    fechaGuardada && fechaGuardada > sumarDias(hoyArgentina(), 1) ? fechaGuardada : sumarDias(hoyArgentina(), 2),
  );

  const [espacio, setEspacio] = useState<Espacio | null>(
    esEspacio(inicial?.espacio) ? (inicial!.espacio as Espacio) : null,
  );
  const [espacioDetalle, setEspacioDetalle] = useState(inicial?.espacioDetalle ?? "");

  const [conViaje, setConViaje] = useState(!!inicial?.salidaDestino);
  const [salidaDesde, setSalidaDesde] = useState(inicial?.salidaDesde ?? "");
  const [salidaDesdeLoc, setSalidaDesdeLoc] = useState<LocationSelection | null>(
    locInicial(inicial?.salidaDesde, inicial?.salidaDesdeLat, inicial?.salidaDesdeLng),
  );
  const [salidaDestino, setSalidaDestino] = useState(inicial?.salidaDestino ?? "");
  const [salidaDestinoLoc, setSalidaDestinoLoc] = useState<LocationSelection | null>(
    locInicial(inicial?.salidaDestino, inicial?.salidaDestinoLat, inicial?.salidaDestinoLng),
  );

  const [error, setError] = useState("");
  const [activo, setActivo] = useState(inicial?.activo ?? false);
  const [vigente, setVigente] = useState(vigenteInicial);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vehiculo = buildVehiculo(vBase, vVariant);
    if (!loc) { setError("Seleccioná una localidad de la lista."); return; }
    if (!vehiculo) { setError("Seleccioná el tipo de vehículo completo."); return; }

    const hoy = hoyArgentina();
    const fecha =
      cuando === "hoy" ? hoy
      : cuando === "manana" ? sumarDias(hoy, 1)
      : cuando === "fecha" ? fechaElegida
      : null;
    if (cuando === "fecha" && (!fechaElegida || fechaElegida < hoy || fechaElegida > sumarDias(hoy, FECHA_MAX_DIAS))) {
      setError(`Elegí una fecha entre hoy y los próximos ${FECHA_MAX_DIAS} días.`);
      return;
    }
    setError("");

    startTransition(async () => {
      // El viaje necesita coordenadas para dibujarse. Si el texto no se eligió
      // de la lista (o viene de antes, sin coordenadas) se intenta resolver por
      // nombre. Sin origen, sale de su zona base.
      let origen: LocationSelection | null = null;
      let destino: LocationSelection | null = null;
      if (conViaje && salidaDestino.trim()) {
        destino = salidaDestinoLoc ?? (await buscarLocalidadExacta(salidaDestino.trim()));
        origen = salidaDesde.trim()
          ? salidaDesdeLoc ?? (await buscarLocalidadExacta(salidaDesde.trim()))
          : loc;
        if (!destino || !origen) {
          setError("Elegí el origen y el destino del viaje de la lista de localidades.");
          return;
        }
      }

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
          disponibleHoy: cuando === "hoy",
          fecha,
          espacio,
          espacioDetalle: espacio && espacio !== "vacio" ? espacioDetalle.trim() || null : null,
          salidaDesde: origen?.label ?? null,
          salidaDesdeLat: origen?.lat ?? null,
          salidaDesdeLng: origen?.lng ?? null,
          salidaDestino: destino?.label ?? null,
          salidaDestinoLat: destino?.lat ?? null,
          salidaDestinoLng: destino?.lng ?? null,
        }),
      });
      if (res.ok) {
        setActivo(true);
        setVigente(true);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(res.status === 400 && data.error ? data.error : "Error al guardar. Intentá de nuevo.");
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

  const hoy = hoyArgentina();
  const textoCuando =
    cuando === "semana"
      ? "Aparecés en el mapa durante 7 días."
      : cuando === "fecha"
        ? fechaElegida
          ? `Las empresas te ven desde ahora hasta el ${etiquetaFecha(fechaElegida)} a la noche.`
          : "Elegí el día."
        : `Aparecés en el mapa hasta ${cuando === "hoy" ? "hoy" : "mañana"} a la noche.`;

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

      {/* Cuándo */}
      <div>
        <span style={labelStyle}>¿Cuándo?</span>
        <div className="grid grid-cols-4 gap-2">
          {CUANDO_OPCIONES.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setCuando(o.v)}
              className="px-1 py-2.5 rounded-xl border text-xs font-semibold transition-all"
              style={{
                backgroundColor: cuando === o.v ? "var(--primary)" : "#FFFFFF",
                borderColor: cuando === o.v ? "var(--primary)" : "#E2E8E8",
                color: cuando === o.v ? "#FFFFFF" : "#374151",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        {cuando === "fecha" && (
          <input
            type="date"
            value={fechaElegida}
            min={hoy}
            max={sumarDias(hoy, FECHA_MAX_DIAS)}
            onChange={(e) => setFechaElegida(e.target.value)}
            className="mt-2"
            style={inputStyle}
          />
        )}
        <p className="text-xs mt-2" style={{ color: "#6B7280" }}>
          {textoCuando}
        </p>
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

      {/* Espacio */}
      <div>
        <span style={labelStyle}>¿Cuánto lugar te queda? (opcional)</span>
        <div className="grid grid-cols-3 gap-2">
          {ESPACIOS.map((e) => {
            const m = ESPACIO_META[e];
            const sel = espacio === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() => setEspacio(sel ? null : e)}
                className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all min-w-0"
                style={{
                  backgroundColor: sel ? "var(--primary-10)" : "#FFFFFF",
                  borderColor: sel ? "var(--primary)" : "#E2E8E8",
                }}
              >
                <span className="text-sm font-bold" style={{ color: sel ? "var(--primary)" : "#111827" }}>
                  {m.label}
                </span>
                <span className="text-[11px] leading-tight" style={{ color: "#6B7280" }}>
                  {m.ayuda}
                </span>
              </button>
            );
          })}
        </div>
        {espacio && espacio !== "vacio" && (
          <input
            type="text"
            maxLength={80}
            placeholder={espacio === "chico" ? "Ej: entra una caja de 1 m³" : "Ej: me quedan 4 pallets"}
            value={espacioDetalle}
            onChange={(e) => setEspacioDetalle(e.target.value)}
            className="mt-2"
            style={inputStyle}
          />
        )}
      </div>

      {/* Viaje */}
      <div>
        <button
          type="button"
          onClick={() => setConViaje(!conViaje)}
          aria-pressed={conViaje}
          className="w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all"
          style={{
            backgroundColor: conViaje ? "var(--primary-10)" : "#FFFFFF",
            borderColor: conViaje ? "var(--primary)" : "#E2E8E8",
          }}
        >
          <span>
            <span className="block text-sm font-bold" style={{ color: conViaje ? "var(--primary)" : "#111827" }}>
              🛣️ Hago un viaje
            </span>
            <span className="block text-xs" style={{ color: "#6B7280" }}>
              Las empresas por donde pasás te ven en el mapa
            </span>
          </span>
          <span
            className="w-10 h-6 rounded-full relative flex-shrink-0 transition-colors"
            style={{ backgroundColor: conViaje ? "var(--primary)" : "#D1D5DB" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: conViaje ? "18px" : "2px" }}
            />
          </span>
        </button>

        {conViaje && (
          <div className="mt-3 space-y-3 pl-3 border-l-2" style={{ borderColor: "var(--primary)" }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }} htmlFor="viaje-desde">
                Salgo desde
              </label>
              <LocationAutocomplete
                id="viaje-desde"
                name="salidaDesde"
                placeholder={loc ? `${loc.label} (tu zona base)` : "Ej: La Plata"}
                inputClass=""
                inputStyle={inputStyle}
                initialValue={salidaDesde}
                onValueChange={(v) => { setSalidaDesde(v); setSalidaDesdeLoc(null); }}
                onLocationSelect={(l) => setSalidaDesdeLoc(l)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }} htmlFor="viaje-hacia">
                Voy hacia
              </label>
              <LocationAutocomplete
                id="viaje-hacia"
                name="salidaDestino"
                placeholder="Ej: Rosario, Santa Fe"
                inputClass=""
                inputStyle={inputStyle}
                initialValue={salidaDestino}
                onValueChange={(v) => { setSalidaDestino(v); setSalidaDestinoLoc(null); }}
                onLocationSelect={(l) => setSalidaDestinoLoc(l)}
              />
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              En el mapa se marca el tramo aproximado (línea recta), no la ruta exacta.
            </p>
          </div>
        )}
      </div>

      {/* Badges opcionales */}
      <div>
        <span style={labelStyle}>Además (opcional)</span>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "regresoVacio", label: "Regreso vacío", state: regresoVacio, set: setRegresoVacio },
            { key: "buscaCarga", label: "Busco carga", state: buscaCarga, set: setBuscaCarga },
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
