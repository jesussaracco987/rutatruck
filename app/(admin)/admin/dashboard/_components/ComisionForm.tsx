"use client";

import { useState } from "react";

export default function ComisionForm({
  comisionTipo,
  comisionValor,
  comisionSinPresupuesto,
}: {
  comisionTipo: string;
  comisionValor: number;
  comisionSinPresupuesto: number;
}) {
  const [tipo, setTipo] = useState(comisionTipo);
  const [valor, setValor] = useState(String(comisionValor));
  const [sinPresupuesto, setSinPresupuesto] = useState(String(comisionSinPresupuesto));
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/comision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comisionTipo: tipo,
          comisionValor: parseFloat(valor),
          comisionSinPresupuesto: parseFloat(sinPresupuesto),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setMsg({ ok: true, text: "Guardado correctamente" });
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error inesperado" });
    } finally {
      setPending(false);
    }
  }

  const inputClass = "w-full rounded-lg border px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
  const inputStyle = { backgroundColor: "#0F2020", borderColor: "#1E3838" };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "#9CA3AF" }}>
          Tipo de comisión
        </label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className={inputClass}
          style={inputStyle}
        >
          <option value="FIJO" style={{ backgroundColor: "#0F2020" }}>Monto fijo (ARS)</option>
          <option value="PORCENTAJE" style={{ backgroundColor: "#0F2020" }}>Porcentaje del presupuesto</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "#9CA3AF" }}>
          {tipo === "FIJO" ? "Monto ($ARS)" : "Porcentaje (ej: 0.08 = 8%)"}
        </label>
        <input
          type="number"
          step={tipo === "FIJO" ? "1" : "0.01"}
          min="0"
          max={tipo === "FIJO" ? undefined : "1"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={inputClass}
          style={inputStyle}
          required
        />
      </div>
      {tipo === "PORCENTAJE" && (
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#9CA3AF" }}>
            Monto si la carga no tiene presupuesto ($ARS por camión)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={sinPresupuesto}
            onChange={(e) => setSinPresupuesto(e.target.value)}
            className={inputClass}
            style={inputStyle}
            required
          />
        </div>
      )}
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
        style={{ backgroundColor: "var(--primary)", color: "#0C1E1E" }}
      >
        {pending ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}
