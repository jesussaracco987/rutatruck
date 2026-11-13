/**
 * Cartel de la promoción de lanzamiento (gratis hasta una fecha fija).
 *
 * Sin hooks a propósito: así se puede renderizar tanto desde un Server
 * Component (pantalla de cargas de empresa) como desde dentro de un Client
 * Component (wrapper de cargas del transportista).
 */

import { ultimoDiaFreeTier } from "@/lib/free-tier";

type Props = {
  role: "empresa" | "transportista";
  /** Días que faltan para que termine la promo, o null si no hay fecha configurada. */
  diasRestantes: number | null;
};

const COPY = {
  empresa: {
    detalle: "Publicá todas las cargas que necesites sin pagar nada.",
  },
  transportista: {
    detalle: "Postulate a todas las cargas que quieras, sin comisión.",
  },
} as const;

export default function FreeTierBanner({ role, diasRestantes }: Props) {
  const { detalle } = COPY[role];
  const ultimoDia = ultimoDiaFreeTier();
  const titulo = ultimoDia ? `Gratis hasta el ${ultimoDia}` : "Gratis por tiempo limitado";

  if (diasRestantes === 0) return null;

  const urgencia =
    diasRestantes === null
      ? "Promoción de lanzamiento · por tiempo limitado"
      : diasRestantes === 1
        ? "¡Último día de la promoción!"
        : `Quedan ${diasRestantes} días de promoción`;

  return (
    <div
      className="mb-6 rounded-2xl border overflow-hidden"
      style={{ backgroundColor: "#0A1A1A", borderColor: "#4ADE8044" }}
    >
      <div className="px-4 py-4 flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#4ADE8022" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="#4ADE80" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-base" style={{ color: "#FFFFFF" }}>
              {titulo}
            </p>
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#4ADE8022", color: "#4ADE80", border: "1px solid #4ADE8044" }}
            >
              Lanzamiento
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "#D1D5DB" }}>
            {detalle}
          </p>
        </div>
      </div>
      <div
        className="px-4 py-2 flex items-center gap-2 border-t"
        style={{ backgroundColor: "#4ADE800F", borderColor: "#4ADE8022" }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#4ADE80" }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#4ADE80" }}>
          {urgencia}
        </p>
      </div>
    </div>
  );
}
