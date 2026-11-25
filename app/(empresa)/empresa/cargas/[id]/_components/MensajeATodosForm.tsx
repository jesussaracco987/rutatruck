"use client";

import { useState } from "react";

/**
 * Un mensaje a todos los transportistas aceptados de la carga. Llega al chat
 * de cada uno por separado: cada respuesta sigue siendo privada.
 */
export default function MensajeATodosForm({ cargaId, cantidad }: { cargaId: number; cantidad: number }) {
  const [cuerpo, setCuerpo] = useState("");
  const [pending, setPending] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!cuerpo.trim()) return;
    setPending(true);
    setResultado(null);
    try {
      const res = await fetch(`/api/cargas/${cargaId}/mensaje-a-todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuerpo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos enviarlo");
      setCuerpo("");
      setResultado({
        ok: true,
        texto: `Enviado a ${data.enviados} ${data.enviados === 1 ? "transportista" : "transportistas"}.`,
      });
    } catch (err) {
      setResultado({ ok: false, texto: err instanceof Error ? err.message : "Error inesperado" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-4 rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--primary-20)" }}>
      <label htmlFor="mensaje-a-todos" className="block text-sm font-medium text-gray-900">
        Mensaje a todos ({cantidad})
      </label>
      <p className="text-xs" style={{ color: "#6B7280" }}>
        Llega al chat de cada transportista. Útil para el horario, el lugar exacto de carga o la documentación.
      </p>
      <textarea
        id="mensaje-a-todos"
        rows={3}
        maxLength={2000}
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        placeholder="Ej: Cargamos el jueves desde las 7 h en la planta de Ruta 8 km 12. Traer DNI y cédula verde."
        className="w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        style={{ borderColor: "#E2E8E8", backgroundColor: "#F9FAFB" }}
      />
      {resultado && (
        <p className="text-sm" style={{ color: resultado.ok ? "var(--primary)" : "#B91C1C" }}>
          {resultado.texto}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !cuerpo.trim()}
        className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        style={{ backgroundColor: "var(--primary)" }}
      >
        {pending ? "Enviando…" : "Enviar a todos"}
      </button>
    </form>
  );
}
