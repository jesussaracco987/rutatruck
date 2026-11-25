"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface Props {
  cargaId: number;
  /** Una postulación, o todas las pendientes de un grupo (se aceptan juntas). */
  postulacionIds: number[];
  transportistaNombre: string;
  camionesCubiertos: number;
  cantidadCamionesTotal: number;
}

export default function SeleccionarButton({
  cargaId,
  postulacionIds,
  transportistaNombre,
  camionesCubiertos,
  cantidadCamionesTotal,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const camionesText =
      cantidadCamionesTotal > 1
        ? ` (cubre ${camionesCubiertos} camión${camionesCubiertos !== 1 ? "es" : ""})`
        : "";
    const result = await Swal.fire({
      title: "¿Seleccionar transportista?",
      text: `Se aceptará a ${transportistaNombre}${camionesText} para esta carga.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar",
      cancelButtonText: "Cancelar",
      background: "#112424",
      color: "#ffffff",
      confirmButtonColor: "#06342A",
      cancelButtonColor: "#1E3838",
      iconColor: "#4ADE80",
    });

    if (!result.isConfirmed) return;

    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/cargas/${cargaId}/seleccionar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postulacionIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al seleccionar");

      const cubiertos = data.cubiertos ?? 0;
      const necesarios = data.necesarios ?? 1;
      const cubierto = cubiertos >= necesarios;

      await Swal.fire({
        title: cubierto ? "¡Convocatoria completa!" : "Transportista aceptado",
        text: cubierto
          ? `${transportistaNombre} fue aceptado. La carga está completamente cubierta.`
          : `${transportistaNombre} fue aceptado. ${cubiertos} de ${necesarios} camiones cubiertos.`,
        icon: "success",
        confirmButtonText: "Aceptar",
        background: "#112424",
        color: "#ffffff",
        confirmButtonColor: "#06342A",
        iconColor: "#4ADE80",
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 font-semibold rounded-xl px-5 py-2.5 text-sm transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
        style={{ backgroundColor: "var(--primary)", color: "#FFFFFF" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {pending ? "Procesando..." : "Aceptar"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
