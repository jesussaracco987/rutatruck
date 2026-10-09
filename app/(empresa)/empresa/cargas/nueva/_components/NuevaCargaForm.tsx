"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import LocationAutocomplete from "./LocationAutocomplete";
import { TIPOS_CARGA, placeholderDetalleCarga } from "@/lib/tipos-carga";

const DRAFT_KEY = "clickcargo-nueva-carga-draft";

interface ContactoDefecto {
  nombre: string;
  email: string;
  telefono: string;
}

type Fields = {
  origen: string;
  origenLat: string;
  origenLng: string;
  destino: string;
  destinoLat: string;
  destinoLng: string;
  tipoCarga: string;
  tipoCargaDetalle: string;
  peso: string;
  pesoUnidad: string;
  cantidadCamiones: string;
  presupuesto: string;
  fechaCarga: string;
  fechaCupo: string;
  preferenciaCamion: string;
  descripcion: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
};

function makeDefaults(c: ContactoDefecto): Fields {
  return {
    origen: "",
    origenLat: "",
    origenLng: "",
    destino: "",
    destinoLat: "",
    destinoLng: "",
    tipoCarga: "",
    tipoCargaDetalle: "",
    peso: "",
    pesoUnidad: "tonelada",
    cantidadCamiones: "1",
    presupuesto: "",
    fechaCarga: "",
    fechaCupo: "",
    preferenciaCamion: "",
    descripcion: "",
    contactoNombre: c.nombre,
    contactoTelefono: c.telefono,
    contactoEmail: c.email,
  };
}

export default function NuevaCargaForm({
  contactoDefecto,
  precioPublicacion,
  errorInicial,
  freeTier,
}: {
  contactoDefecto: ContactoDefecto;
  precioPublicacion: number;
  errorInicial?: string;
  freeTier?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(errorInicial ?? null);
  const [fields, setFields] = useState<Fields>(() =>
    makeDefaults(contactoDefecto),
  );
  const [presupuestoAcordar, setPresupuestoAcordar] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MEANINGFUL_KEYS: (keyof Fields)[] = ["origen", "destino", "tipoCarga", "descripcion"];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Fields>;
        const hasMeaningful = MEANINGFUL_KEYS.some((k) => !!parsed[k]);
        if (hasMeaningful) {
          const contactKeysToSkip: (keyof Fields)[] = ["contactoNombre", "contactoTelefono", "contactoEmail"];
          contactKeysToSkip.forEach((k) => delete parsed[k]);
          setFields((f) => ({ ...f, ...parsed }));
          setHasDraft(true);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {}
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      const hasMeaningful = MEANINGFUL_KEYS.some((k) => !!fields[k]);
      if (hasMeaningful) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    }, 500);
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current);
    };
  }, [fields, draftLoaded]);

  function set(name: keyof Fields) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setFields((f) => ({ ...f, [name]: e.target.value }));
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setFields(makeDefaults(contactoDefecto));
    setHasDraft(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!fields.origen) { setError("Seleccioná el origen."); return; }
    if (!fields.destino) { setError("Seleccioná el destino."); return; }
    setPending(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let navigating = false;
    try {
      const res = await fetch("/api/cargas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, presupuesto: presupuestoAcordar ? "" : fields.presupuesto }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear la carga");

      localStorage.removeItem(DRAFT_KEY);
      if (data.cargaId) {
        navigating = true;
        router.push(`/empresa/cargas/${data.cargaId}`);
      } else if (data.url) {
        navigating = true;
        window.location.href = data.url;
      } else {
        throw new Error("Respuesta inesperada del servidor. Revisá en Mis cargas.");
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      const isNetwork = err instanceof Error && err.message === "Failed to fetch";
      const msg =
        isAbort || isNetwork
          ? "La conexión fue interrumpida. Revisá en Mis cargas si la carga fue publicada antes de volver a intentar."
          : err instanceof Error
            ? err.message
            : "Error inesperado";
      setError(msg);
      if (!navigating) setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-sm";
  const inputStyle = { backgroundColor: "#F9FAFB", borderColor: "#E2E8E8" };
  const labelClass = "block text-sm font-medium mb-1";
  const labelStyle = { color: "#9CA3AF" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}
      >
        <Link href="/empresa/dashboard">
          <LogoClickCargo />
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link
            href="/empresa/dashboard"
            className="inline-flex items-center gap-2 mb-4 font-semibold text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            <span
              className="flex items-center justify-center w-8 h-8 rounded-full border-2"
              style={{ borderColor: "var(--primary)" }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </span>
            Volver al panel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Publicar nueva carga
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            {freeTier
              ? "Completá los datos del envío. La carga quedará visible para transportistas de inmediato."
              : "Completá los datos del envío. Una vez procesado el pago de publicación, la carga quedará visible para transportistas."}
          </p>
        </div>

        {hasDraft && (
          <div
            className="mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--primary-5)",
              borderColor: "var(--primary-20)",
              color: "var(--primary)",
            }}
          >
            <span>Borrador restaurado</span>
            <button
              type="button"
              onClick={clearDraft}
              className="text-xs underline opacity-70 hover:opacity-100 cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className="rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <h2 className="font-medium text-gray-900">Datos de la carga</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="origen" className={labelClass} style={labelStyle}>
                  Origen *
                </label>
                <LocationAutocomplete
                  id="origen"
                  name="origen"
                  placeholder="Ej: Córdoba, Córdoba"
                  required
                  inputClass={inputClass}
                  inputStyle={inputStyle}
                  initialValue={fields.origen}
                  onValueChange={(v) =>
                    setFields((f) => ({ ...f, origen: v, origenLat: "", origenLng: "" }))
                  }
                  onLocationSelect={(loc) =>
                    setFields((f) => ({
                      ...f,
                      origen: loc.label,
                      origenLat: String(loc.lat),
                      origenLng: String(loc.lng),
                    }))
                  }
                />
              </div>
              <div>
                <label htmlFor="destino" className={labelClass} style={labelStyle}>
                  Destino *
                </label>
                <LocationAutocomplete
                  id="destino"
                  name="destino"
                  placeholder="Ej: Rosario, Santa Fe"
                  required
                  inputClass={inputClass}
                  inputStyle={inputStyle}
                  initialValue={fields.destino}
                  onValueChange={(v) =>
                    setFields((f) => ({ ...f, destino: v, destinoLat: "", destinoLng: "" }))
                  }
                  onLocationSelect={(loc) =>
                    setFields((f) => ({
                      ...f,
                      destino: loc.label,
                      destinoLat: String(loc.lat),
                      destinoLng: String(loc.lng),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cantidadCamiones" className={labelClass} style={labelStyle}>
                  ¿Cuántos camiones necesitás? *
                </label>
                <input
                  id="cantidadCamiones"
                  name="cantidadCamiones"
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={fields.cantidadCamiones}
                  onChange={set("cantidadCamiones")}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="tipoCarga"
                className={labelClass}
                style={labelStyle}
              >
                Tipo de carga *
              </label>
              <select
                id="tipoCarga"
                name="tipoCarga"
                required
                value={fields.tipoCarga}
                onChange={set("tipoCarga")}
                className={inputClass}
                style={inputStyle}
              >
                <option
                  value=""
                  disabled
                  style={{ backgroundColor: "#F9FAFB" }}
                >
                  Seleccioná el tipo
                </option>
                {TIPOS_CARGA.map((t) => (
                  <option key={t.value} value={t.value} style={{ backgroundColor: "#F9FAFB" }}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {fields.tipoCarga && (
              <div>
                <label
                  htmlFor="tipoCargaDetalle"
                  className={labelClass}
                  style={labelStyle}
                >
                  Especificación del tipo{" "}
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    (opcional)
                  </span>
                </label>
                <input
                  id="tipoCargaDetalle"
                  name="tipoCargaDetalle"
                  type="text"
                  value={fields.tipoCargaDetalle}
                  onChange={set("tipoCargaDetalle")}
                  className={inputClass}
                  style={inputStyle}
                  placeholder={placeholderDetalleCarga(fields.tipoCarga)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Presupuesto ofrecido
                </label>
                <div className="flex rounded-lg overflow-hidden border mb-2" style={{ borderColor: "#E2E8E8" }}>
                  <button
                    type="button"
                    onClick={() => setPresupuestoAcordar(false)}
                    className="flex-1 py-2 text-sm font-medium transition-colors"
                    style={!presupuestoAcordar
                      ? { backgroundColor: "var(--primary)", color: "#fff" }
                      : { backgroundColor: "#F9FAFB", color: "#6B7280" }}
                  >
                    Monto ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPresupuestoAcordar(true); setFields((f) => ({ ...f, presupuesto: "" })); }}
                    className="flex-1 py-2 text-sm font-medium transition-colors"
                    style={presupuestoAcordar
                      ? { backgroundColor: "var(--primary)", color: "#fff" }
                      : { backgroundColor: "#F9FAFB", color: "#6B7280" }}
                  >
                    A acordar
                  </button>
                </div>
                {!presupuestoAcordar && (
                <input
                  id="presupuesto"
                  name="presupuesto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fields.presupuesto}
                  onChange={set("presupuesto")}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Ej: 150000"
                />
                )}
              </div>
              <div>
                <label
                  htmlFor="preferenciaCamion"
                  className={labelClass}
                  style={labelStyle}
                >
                  Preferencia de camión
                </label>
                <input
                  id="preferenciaCamion"
                  name="preferenciaCamion"
                  type="text"
                  value={fields.preferenciaCamion}
                  onChange={set("preferenciaCamion")}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Ej: Camión jaula, semiremolque, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fechaCarga"
                  className={labelClass}
                  style={labelStyle}
                >
                  Fecha de carga *
                </label>
                <input
                  id="fechaCarga"
                  name="fechaCarga"
                  type="date"
                  required
                  min={today}
                  value={fields.fechaCarga}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFields((f) => ({
                      ...f,
                      fechaCarga: v,
                      fechaCupo: f.fechaCupo && f.fechaCupo < v ? "" : f.fechaCupo,
                    }));
                  }}
                  className={inputClass}
                  style={{ ...inputStyle, colorScheme: "light" }}
                />
              </div>
              <div>
                <label
                  htmlFor="fechaCupo"
                  className={labelClass}
                  style={labelStyle}
                >
                  Fecha de cupo
                </label>
                <input
                  id="fechaCupo"
                  name="fechaCupo"
                  type="date"
                  min={fields.fechaCarga || today}
                  value={fields.fechaCupo}
                  onChange={set("fechaCupo")}
                  className={inputClass}
                  style={{ ...inputStyle, colorScheme: "light" }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="descripcion"
                className={labelClass}
                style={labelStyle}
              >
                Descripción adicional
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                value={fields.descripcion}
                onChange={set("descripcion")}
                className={inputClass}
                style={inputStyle}
                placeholder="Condiciones especiales, instrucciones de carga, etc."
              />
            </div>
          </div>

          <div
            className="rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <h2 className="font-medium text-gray-900">Datos de contacto</h2>

            <div>
              <label
                htmlFor="contactoNombre"
                className={labelClass}
                style={labelStyle}
              >
                Nombre de contacto *
              </label>
              <input
                id="contactoNombre"
                name="contactoNombre"
                type="text"
                required
                value={fields.contactoNombre}
                onChange={set("contactoNombre")}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contactoTelefono"
                  className={labelClass}
                  style={labelStyle}
                >
                  Teléfono *
                </label>
                <input
                  id="contactoTelefono"
                  name="contactoTelefono"
                  type="tel"
                  required
                  value={fields.contactoTelefono}
                  onChange={set("contactoTelefono")}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Ej: +54 9 351 000-0000"
                />
              </div>
              <div>
                <label
                  htmlFor="contactoEmail"
                  className={labelClass}
                  style={labelStyle}
                >
                  Email *
                </label>
                <input
                  id="contactoEmail"
                  name="contactoEmail"
                  type="email"
                  required
                  value={fields.contactoEmail}
                  onChange={set("contactoEmail")}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {!freeTier && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                backgroundColor: "var(--primary-5)",
                borderColor: "var(--primary-20)",
                color: "var(--primary)",
              }}
            >
              Al continuar serás redirigido a MercadoPago para abonar la tarifa
              de publicación de{" "}
              <strong>${precioPublicacion.toLocaleString("es-AR")}</strong>.
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <Link
              href="/empresa/dashboard"
              className="text-sm transition-colors"
              style={{ color: "#6B7280" }}
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="font-medium rounded-lg px-6 py-2.5 transition-colors cursor-pointer disabled:opacity-60 text-sm"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--text-white)",
              }}
            >
              {pending
                ? "Procesando..."
                : freeTier
                  ? "Publicar carga →"
                  : "Ir al pago →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
