"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function CompletarViajeButton({ cargaId }: { cargaId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const result = await Swal.fire({
      title: "¿Marcar como completado?",
      text: "El cliente deberá confirmar el viaje.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, completado",
      cancelButtonText: "Cancelar",
      background: "#112424",
      color: "#ffffff",
      confirmButtonColor: "var(--primary)",
      cancelButtonColor: "#1E3838",
      iconColor: "var(--primary)",
    });

    if (!result.isConfirmed) return;

    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/cargas/${cargaId}/completar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al marcar completado");
      await Swal.fire({
        title: "¡Listo!",
        text: "Viaje marcado como completado. Esperando confirmación del cliente.",
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
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--text-white)",
        }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
        {pending ? "Procesando..." : "Marcar viaje como completado"}
      </button>
      {error && <p className="text-xs text-red-300 text-center">{error}</p>}
    </div>
  );
}
