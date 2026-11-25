"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

/** El líder saca a un miembro pendiente de su grupo. */
export default function QuitarMiembroButton({ postulacionId, nombre }: { postulacionId: number; nombre: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function quitar() {
    const confirmacion = await Swal.fire({
      title: `¿Sacar a ${nombre} del grupo?`,
      text: "Se borra su postulación a esta carga. Le avisamos, y si quiere se puede postular por su cuenta.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, sacar",
      cancelButtonText: "Cancelar",
      background: "#112424",
      color: "#ffffff",
      confirmButtonColor: "#991B1B",
      cancelButtonColor: "#1E3838",
    });
    if (!confirmacion.isConfirmed) return;

    setPending(true);
    try {
      const res = await fetch(`/api/postulaciones/${postulacionId}/grupo`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos sacarlo del grupo");
      router.refresh();
    } catch (err) {
      await Swal.fire({
        title: "No se pudo",
        text: err instanceof Error ? err.message : "Error inesperado",
        icon: "error",
        background: "#112424",
        color: "#ffffff",
        confirmButtonColor: "#06342A",
      });
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={quitar}
      disabled={pending}
      className="text-xs font-semibold text-red-600 hover:opacity-80 disabled:opacity-50 cursor-pointer"
    >
      {pending ? "Sacando…" : "Sacar"}
    </button>
  );
}
