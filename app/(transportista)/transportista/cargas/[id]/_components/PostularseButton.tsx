"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  cargaId: number;
  miPostulacion: { id: number; estado: string; mensaje: string | null } | null;
  contactoDefecto: { email: string; telefono: string };
  cantidadCamiones?: number;
  esFlota?: boolean;
  pesoUnidad?: string | null;
  emailVerified?: boolean;
}

export default function PostularseButton({ cargaId, miPostulacion, contactoDefecto, cantidadCamiones = 1, esFlota = false, pesoUnidad, emailVerified = true }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateConflict, setDateConflict] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [contactoEmail, setContactoEmail] = useState(contactoDefecto.email);
  const [contactoTelefono, setContactoTelefono] = useState(contactoDefecto.telefono);
  const [camionesCubiertos, setCamionesCubiertos] = useState("1");
  const [precioOfrecido, setPrecioOfrecido] = useState("");

  if (miPostulacion) {
    const styleMap: Record<string, React.CSSProperties> = {
      PENDIENTE: { backgroundColor: "var(--primary-10)", borderColor: "var(--primary-20)", color: "var(--primary)" },
      ACEPTADA: { backgroundColor: "#4ADE801A", borderColor: "#4ADE8033", color: "#4ADE80" },
      RECHAZADA: { backgroundColor: "#FFFFFF0A", borderColor: "#E2E8E8", color: "#6B7280" },
    };
    const labelMap: Record<string, string> = {
      PENDIENTE: "Tu postulación está pendiente. El cliente te contactará si te selecciona.",
      ACEPTADA: "¡Fuiste seleccionado para esta carga! El cliente se pondrá en contacto.",
      RECHAZADA: "El cliente seleccionó otro transportista para esta carga.",
    };
    const cardStyle = styleMap[miPostulacion.estado] ?? styleMap.PENDIENTE;
    return (
      <div className="rounded-xl border p-4" style={cardStyle}>
        <p className="text-sm font-medium">{labelMap[miPostulacion.estado] ?? "Estado desconocido"}</p>
        {miPostulacion.mensaje && (
          <p className="text-xs mt-1 opacity-70">Tu mensaje: "{miPostulacion.mensaje}"</p>
        )}
      </div>
    );
  }

  if (!emailVerified) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
      >
        <p className="text-sm font-bold" style={{ color: "#92400E" }}>
          Verificá tu email antes de postularte
        </p>
        <p className="text-sm mt-1" style={{ color: "#B45309" }}>
          Para postularte a una carga primero necesitás verificar tu email. Es rápido, te enviamos un código.
        </p>
        <Link
          href="/transportista/cuenta"
          className="inline-flex items-center gap-2 mt-4 font-semibold rounded-xl px-5 py-3 text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#92400E", color: "#FFFFFF" }}
        >
          Verificar email
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDateConflict(false);
    setPending(true);
    try {
      const res = await fetch("/api/postulaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cargaId,
          mensaje: mensaje || undefined,
          contactoEmail,
          contactoTelefono,
          camionesCubiertos: esFlota ? Math.max(1, parseInt(camionesCubiertos) || 1) : 1,
          precioOfrecido: precioOfrecido ? parseFloat(precioOfrecido) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DATE_CONFLICT") {
          setDateConflict(true);
          setPending(false);
          return;
        }
        if (data.code === "EMAIL_NOT_VERIFIED") {
          router.push("/transportista/cuenta");
          return;
        }
        throw new Error(data.error ?? "Error al postularse");
      }
      router.push(`/transportista/cargas/${cargaId}/exito`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-sm";
  const inputStyle = { backgroundColor: "#F9FAFB", borderColor: "#E2E8E8" };
  const labelClass = "block text-sm font-medium mb-1";
  const labelStyle = { color: "#9CA3AF" };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-6"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
    >
      <h2 className="font-medium text-gray-900 mb-4">Postularme a esta carga</h2>

      <div className="space-y-4 mb-4">
        {esFlota && cantidadCamiones > 1 && (
          <div>
            <label className={labelClass} style={labelStyle}>
              ¿Cuántos camiones podés cubrir? *{" "}
              <span className="text-xs" style={{ color: "#6B7280" }}>(máx. {cantidadCamiones})</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max={cantidadCamiones}
              value={camionesCubiertos}
              onChange={(e) => setCamionesCubiertos(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        )}
        <div>
          <label className={labelClass} style={labelStyle}>
            Email de contacto *
          </label>
          <input
            type="email"
            required
            value={contactoEmail}
            onChange={(e) => setContactoEmail(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>
            Teléfono de contacto *
          </label>
          <input
            type="tel"
            required
            value={contactoTelefono}
            onChange={(e) => setContactoTelefono(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: +54 9 351 000-0000"
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>
            Tu precio ($){" "}
            <span className="text-xs" style={{ color: "#6B7280" }}>(opcional — para negociar)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={precioOfrecido}
            onChange={(e) => setPrecioOfrecido(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: 5000"
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>
            Mensaje para el cliente (opcional)
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
            className={inputClass}
            style={inputStyle}
            placeholder="Presentate brevemente, indicá tu experiencia o disponibilidad..."
          />
        </div>
      </div>

      {dateConflict && (
        <div
          className="rounded-xl border px-4 py-3 mb-4"
          style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: "#92400E" }}>
            🚛 Tenés un viaje activo en esta fecha
          </p>
          <p className="text-sm" style={{ color: "#B45309" }}>
            Completá tus cargas en viaje antes de postularte a nuevas cargas en la misma fecha.
          </p>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 mb-4">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 font-semibold rounded-xl px-6 py-4 text-base transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-60"
        style={{ backgroundColor: "var(--primary)", color: "#FFFFFF" }}
      >
        {pending ? "Enviando..." : "Enviar postulación"}
      </button>
    </form>
  );
}
