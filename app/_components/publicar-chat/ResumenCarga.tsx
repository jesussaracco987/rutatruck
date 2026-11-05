"use client";

import { useState } from "react";
import { TIPOS_CARGA, TIPO_CARGA_LABELS } from "@/lib/tipos-carga";
import type { BorradorCarga } from "@/lib/chat-carga";

type Campo = {
  clave: keyof BorradorCarga;
  label: string;
  tipo: "text" | "number" | "date" | "tipoCarga";
  obligatorio?: boolean;
  /** Texto cuando está vacío. Sin él, el dato opcional sigue visible para poder sumarlo. */
  vacio?: string;
};

const CAMPOS: Campo[] = [
  { clave: "origen", label: "Origen", tipo: "text", obligatorio: true },
  { clave: "destino", label: "Destino", tipo: "text", obligatorio: true },
  { clave: "tipoCarga", label: "Tipo de carga", tipo: "tipoCarga", obligatorio: true },
  { clave: "tipoCargaDetalle", label: "Qué se mueve", tipo: "text", vacio: "Agregar detalle" },
  { clave: "fechaCarga", label: "Fecha de carga", tipo: "date", obligatorio: true },
  { clave: "cantidadCamiones", label: "Camiones", tipo: "number" },
  { clave: "peso", label: "Peso", tipo: "number", vacio: "Agregar peso" },
  { clave: "presupuesto", label: "Presupuesto", tipo: "number", vacio: "A acordar" },
  { clave: "preferenciaCamion", label: "Vehículo", tipo: "text", vacio: "Sin preferencia" },
  { clave: "descripcion", label: "Observaciones", tipo: "text", vacio: "Agregar observaciones" },
];

function mostrar(b: BorradorCarga, c: Campo): string | null {
  const valor = b[c.clave];
  if (valor === null || valor === "") return null;
  switch (c.clave) {
    case "tipoCarga":
      return TIPO_CARGA_LABELS[String(valor)] ?? String(valor);
    case "fechaCarga":
      return new Date(`${valor}T12:00:00`).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    case "peso":
      return `${valor} ${b.pesoUnidad === "kg" ? "kg" : b.pesoUnidad === "bulto" ? "bultos" : "toneladas"}`;
    case "presupuesto":
      return `$${Number(valor).toLocaleString("es-AR")}`;
    default:
      return String(valor);
  }
}

/** Resumen de la carga: cada dato se corrige tocándolo, sin volver al chat. */
export default function ResumenCarga({
  borrador,
  onChange,
  hoy,
}: {
  borrador: BorradorCarga;
  onChange: (b: BorradorCarga) => void;
  hoy: string;
}) {
  const [editando, setEditando] = useState<keyof BorradorCarga | null>(null);

  function guardar(c: Campo, valor: string) {
    const limpio = valor.trim();
    let dato: string | number | null = limpio || null;
    if (c.tipo === "number") {
      const n = parseFloat(limpio);
      dato = Number.isFinite(n) && n > 0 ? n : null;
      if (c.clave === "cantidadCamiones") dato = dato ? Math.floor(dato) || 1 : 1;
    }
    onChange({ ...borrador, [c.clave]: dato });
  }

  const claseCampo =
    "w-full rounded-lg border px-2.5 py-1.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

  return (
    <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
      {CAMPOS.filter((c) => !(c.clave === "cantidadCamiones" && borrador.tipoCarga === "paqueteria")).map((c) => {
        const visible = mostrar(borrador, c);
        const falta = c.obligatorio && !visible;
        const abierto = editando === c.clave;

        return (
          <div key={c.clave} className="px-3 py-2">
            <dt className="text-xs font-medium text-gray-500">{c.label}</dt>
            <dd>
              {abierto ? (
                c.tipo === "tipoCarga" ? (
                  <select
                    autoFocus
                    aria-label={c.label}
                    className={claseCampo}
                    value={borrador.tipoCarga ?? ""}
                    onChange={(e) => {
                      guardar(c, e.target.value);
                      setEditando(null);
                    }}
                    onBlur={() => setEditando(null)}
                  >
                    <option value="" disabled>
                      Seleccioná el tipo
                    </option>
                    {TIPOS_CARGA.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    autoFocus
                    aria-label={c.label}
                    type={c.tipo}
                    min={c.tipo === "date" ? hoy : c.tipo === "number" ? "0" : undefined}
                    className={claseCampo}
                    defaultValue={String(borrador[c.clave] ?? "")}
                    onBlur={(e) => {
                      guardar(c, e.target.value);
                      setEditando(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setEditando(c.clave)}
                  className={`w-full text-left text-sm cursor-pointer ${
                    falta ? "font-semibold text-red-600" : visible ? "font-semibold text-gray-900" : "text-gray-400"
                  }`}
                >
                  {visible ?? c.vacio ?? "Falta completar"}
                </button>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
