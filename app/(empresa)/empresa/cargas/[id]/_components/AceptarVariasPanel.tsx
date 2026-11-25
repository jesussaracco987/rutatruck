"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

/** Una opción a elegir: un transportista, o un grupo con todos sus pendientes (`ids`). */
type Pendiente = { id: number; ids: number[]; nombre: string; camiones: number; rating: number | null; verificado: boolean };

const swalTema = {
  background: "#112424",
  color: "#ffffff",
  confirmButtonColor: "#06342A",
  cancelButtonColor: "#1E3838",
  iconColor: "#4ADE80",
};

/**
 * Aceptar varias postulaciones de una vez, para convocatorias de muchos
 * camiones. La validación real (pendientes, que no se pasen de lo que falta)
 * la hace el servidor; acá solo se ayuda a armar la selección.
 */
export default function AceptarVariasPanel({
  cargaId,
  pendientes,
  faltan,
}: {
  cargaId: number;
  /** En orden de llegada. */
  pendientes: Pendiente[];
  faltan: number;
}) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehiculos = pendientes.filter((p) => elegidas.has(p.id)).reduce((s, p) => s + p.camiones, 0);
  const sePasa = vehiculos > faltan;

  function alternar(id: number) {
    setElegidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  /** Por orden de llegada hasta completar lo que falta, salteando las que no entran. */
  function porOrdenDeLlegada() {
    const nuevo = new Set<number>();
    let suma = 0;
    for (const p of pendientes) {
      if (suma + p.camiones <= faltan) {
        nuevo.add(p.id);
        suma += p.camiones;
      }
      if (suma === faltan) break;
    }
    setElegidas(nuevo);
  }

  async function aceptar() {
    const confirmacion = await Swal.fire({
      title: `¿Aceptar ${elegidas.size} ${elegidas.size === 1 ? "postulación" : "postulaciones"}?`,
      text: `Cubren ${vehiculos} de los ${faltan} vehículos que faltan.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar",
      cancelButtonText: "Cancelar",
      ...swalTema,
    });
    if (!confirmacion.isConfirmed) return;

    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/cargas/${cargaId}/seleccionar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postulacionIds: pendientes.filter((p) => elegidas.has(p.id)).flatMap((p) => p.ids),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos aceptarlas");

      const cubierto = data.cubiertos >= data.necesarios;
      await Swal.fire({
        title: cubierto ? "¡Convocatoria completa!" : "Postulaciones aceptadas",
        text: cubierto
          ? "La carga está completamente cubierta."
          : `${data.cubiertos} de ${data.necesarios} vehículos cubiertos.`,
        icon: "success",
        confirmButtonText: "Aceptar",
        ...swalTema,
      });
      setElegidas(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-xl border mb-4" style={{ borderColor: "var(--primary-20)", backgroundColor: "var(--primary-5)" }}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold" style={{ color: "var(--primary)" }}>
        Aceptar varias a la vez ({pendientes.length} pendientes · faltan {faltan} vehículos)
      </summary>
      <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: "var(--primary-20)" }}>
        <button
          type="button"
          onClick={porOrdenDeLlegada}
          className="text-sm font-semibold underline underline-offset-2 cursor-pointer"
          style={{ color: "var(--primary)" }}
        >
          Elegir por orden de llegada hasta completar
        </button>

        <ul className="max-h-80 overflow-y-auto divide-y rounded-lg border bg-white" style={{ borderColor: "#E2E8E8" }}>
          {pendientes.map((p) => (
            <li key={p.id}>
              <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={elegidas.has(p.id)}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4 flex-shrink-0"
                />
                <span className="flex-1 min-w-0 truncate text-sm text-gray-900">{p.nombre}</span>
                {p.rating !== null && (
                  <span className="text-xs" style={{ color: "#6B7280" }}>★ {p.rating.toFixed(1)}</span>
                )}
                {p.verificado && <span className="text-xs" style={{ color: "#15803D" }}>verificado</span>}
                <span className="text-xs font-medium" style={{ color: "#0369A1" }}>
                  {p.camiones} {p.camiones === 1 ? "vehículo" : "vehículos"}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <p className="text-sm" style={{ color: sePasa ? "#B91C1C" : "#374151" }}>
          Elegidas: <strong>{elegidas.size}</strong> · cubren <strong>{vehiculos}</strong> de {faltan} vehículos que faltan
          {sePasa && ". Sacá alguna para no pasarte."}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={aceptar}
          disabled={pending || elegidas.size === 0 || sePasa}
          className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {pending ? "Aceptando…" : `Aceptar ${elegidas.size || ""} seleccionadas`}
        </button>
      </div>
    </details>
  );
}
