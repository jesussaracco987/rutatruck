"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { TIPOS_CARGA } from "@/lib/tipos-carga";

interface CargaEditable {
  id: number;
  origen: string;
  destino: string;
  cantidadCamiones: number;
  tipoCarga: string;
  tipoCargaDetalle: string | null;
  peso: number | null;
  pesoUnidad: string | null;
  presupuesto: number | null;
  fechaCarga: string;
  fechaCupo: string | null;
  preferenciaCamion: string | null;
  descripcion: string | null;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
}

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-sm";
const inputStyle = { backgroundColor: "#F9FAFB", borderColor: "#E2E8E8" };
const labelClass = "block text-sm font-medium mb-1";
const labelStyle = { color: "#9CA3AF" };

export default function EditarCargaPanel({ carga, sinTransportista }: { carga: CargaEditable; sinTransportista: boolean }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presupuestoAcordar, setPresupuestoAcordar] = useState(carga.presupuesto === null);
  const [fechaCarga, setFechaCarga] = useState(carga.fechaCarga);
  const fechaCupoRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, FormDataEntryValue | string> = Object.fromEntries(fd.entries());
    if (presupuestoAcordar) body.presupuesto = "";
    try {
      const res = await fetch(`/api/cargas/${carga.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPending(false);
    }
  }

  async function handleCancelarCarga() {
    const result = await Swal.fire({
      title: "¿Cancelar esta carga?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
      background: "#112424",
      color: "#ffffff",
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#1E3838",
      iconColor: "#EF4444",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/cargas/${carga.id}/cancelar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cancelar");
      await Swal.fire({
        title: "Carga cancelada",
        icon: "success",
        confirmButtonText: "Aceptar",
        background: "#112424",
        color: "#ffffff",
        confirmButtonColor: "var(--primary)",
        iconColor: "#4ADE80",
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer border"
          style={{ borderColor: "var(--primary-20)", color: "var(--primary)", backgroundColor: "var(--primary-5)" }}
        >
          Editar carga
        </button>
        <button
          onClick={handleCancelarCarga}
          className="text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
        >
          Cancelar carga
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-medium text-gray-900 mb-4">Editar carga</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="edit-origen"
              className={labelClass}
              style={labelStyle}
            >
              Origen *
            </label>
            <input
              id="edit-origen"
              name="origen"
              type="text"
              required
              defaultValue={carga.origen}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              htmlFor="edit-destino"
              className={labelClass}
              style={labelStyle}
            >
              Destino *
            </label>
            <input
              id="edit-destino"
              name="destino"
              type="text"
              required
              defaultValue={carga.destino}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-cantidadCamiones" className={labelClass} style={labelStyle}>
              ¿Cuántos camiones necesitás? *
            </label>
            <input
              id="edit-cantidadCamiones"
              name="cantidadCamiones"
              type="number"
              required
              min="1"
              step="1"
              defaultValue={carga.cantidadCamiones}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="edit-tipoCarga"
            className={labelClass}
            style={labelStyle}
          >
            Tipo de carga *
          </label>
          <select
            id="edit-tipoCarga"
            name="tipoCarga"
            required
            defaultValue={carga.tipoCarga}
            className={inputClass}
            style={inputStyle}
          >
            {TIPOS_CARGA.map((t) => (
              <option key={t.value} value={t.value} style={{ backgroundColor: "#F9FAFB" }}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {sinTransportista && (
          <div>
            <label className={labelClass} style={labelStyle}>
              Presupuesto
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
                onClick={() => setPresupuestoAcordar(true)}
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
                id="edit-presupuesto"
                name="presupuesto"
                type="number"
                step="0.01"
                min="0"
                defaultValue={carga.presupuesto ?? ""}
                className={inputClass}
                style={inputStyle}
                placeholder="Ej: 150000"
              />
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="edit-tipoCargaDetalle"
            className={labelClass}
            style={labelStyle}
          >
            Especificación del tipo{" "}
            <span className="text-xs" style={{ color: "#6B7280" }}>
              (opcional)
            </span>
          </label>
          <input
            id="edit-tipoCargaDetalle"
            name="tipoCargaDetalle"
            type="text"
            defaultValue={carga.tipoCargaDetalle ?? ""}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: Maíz, Soja, Banana..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="edit-fechaCarga"
              className={labelClass}
              style={labelStyle}
            >
              Fecha de carga *
            </label>
            <input
              id="edit-fechaCarga"
              name="fechaCarga"
              type="date"
              required
              min={today}
              value={fechaCarga}
              onChange={(e) => {
                const v = e.target.value;
                setFechaCarga(v);
                if (fechaCupoRef.current && fechaCupoRef.current.value && fechaCupoRef.current.value < v) {
                  fechaCupoRef.current.value = "";
                }
              }}
              className={inputClass}
              style={{ ...inputStyle, colorScheme: "light" }}
            />
          </div>
          <div>
            <label
              htmlFor="edit-fechaCupo"
              className={labelClass}
              style={labelStyle}
            >
              Fecha de cupo
            </label>
            <input
              id="edit-fechaCupo"
              name="fechaCupo"
              type="date"
              min={fechaCarga || today}
              defaultValue={carga.fechaCupo ?? ""}
              ref={fechaCupoRef}
              className={inputClass}
              style={{ ...inputStyle, colorScheme: "light" }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="edit-preferenciaCamion"
            className={labelClass}
            style={labelStyle}
          >
            Preferencia de camión
          </label>
          <input
            id="edit-preferenciaCamion"
            name="preferenciaCamion"
            type="text"
            defaultValue={carga.preferenciaCamion ?? ""}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: Camión jaula, semiremolque, etc."
          />
        </div>

        <div>
          <label
            htmlFor="edit-descripcion"
            className={labelClass}
            style={labelStyle}
          >
            Descripción
          </label>
          <textarea
            id="edit-descripcion"
            name="descripcion"
            rows={3}
            defaultValue={carga.descripcion ?? ""}
            className={inputClass}
            style={inputStyle}
            placeholder="Condiciones especiales, instrucciones, etc."
          />
        </div>

        <div>
          <label
            htmlFor="edit-contactoNombre"
            className={labelClass}
            style={labelStyle}
          >
            Nombre de contacto *
          </label>
          <input
            id="edit-contactoNombre"
            name="contactoNombre"
            type="text"
            required
            defaultValue={carga.contactoNombre}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="edit-contactoTelefono"
              className={labelClass}
              style={labelStyle}
            >
              Teléfono *
            </label>
            <input
              id="edit-contactoTelefono"
              name="contactoTelefono"
              type="tel"
              required
              defaultValue={carga.contactoTelefono}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              htmlFor="edit-contactoEmail"
              className={labelClass}
              style={labelStyle}
            >
              Email *
            </label>
            <input
              id="edit-contactoEmail"
              name="contactoEmail"
              type="email"
              required
              defaultValue={carga.contactoEmail}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="text-sm font-medium rounded-lg px-5 py-2.5 transition-colors cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)", color: "var(--text-white)" }}
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="text-sm px-4 py-2 transition-colors"
            style={{ color: "#6B7280" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
