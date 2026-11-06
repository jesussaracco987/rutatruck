/**
 * Reglas de vigencia de la disponibilidad de un transportista.
 *
 * `activo` solo indica que el transportista no la desactivó manualmente.
 * Pero la disponibilidad también vence sola por tiempo:
 *  - con `fecha` (día puntual): vence al terminar ese día, hora Argentina.
 *    Antes de ese día ya se ve, así las empresas pueden planificar.
 *  - sin `fecha`: 24 h si marcó "Disponible hoy" (registros viejos), 7 días si no.
 * El campo `activo` NUNCA se apaga solo al vencer — por eso hay que chequear
 * siempre la vigencia además de `activo`, tanto para decidir si aparece en el
 * mapa de empresas como para lo que ve el propio transportista.
 */

import { hoyArgentina } from "@/lib/chat-carga";

export const DISPONIBLE_HOY_MS = 24 * 60 * 60 * 1000;
export const DISPONIBLE_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
/** Hasta cuántos días adelante se puede anunciar un viaje. */
export const FECHA_MAX_DIAS = 30;

/** "YYYY-MM-DD" de una columna @db.Date (Prisma la trae como medianoche UTC). */
export function fechaISO(fecha: Date | string | null | undefined): string | null {
  if (!fecha) return null;
  if (typeof fecha === "string") return fecha.slice(0, 10);
  return fecha.toISOString().slice(0, 10);
}

/** Suma días a una fecha "YYYY-MM-DD" sin pasar por la zona horaria local. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Cláusula Prisma para traer solo disponibilidades activas y vigentes (visibles en el mapa). */
export function whereDisponibilidadVigente() {
  const cutoff24h = new Date(Date.now() - DISPONIBLE_HOY_MS);
  const cutoff7d = new Date(Date.now() - DISPONIBLE_SEMANA_MS);
  const hoy = new Date(`${hoyArgentina()}T00:00:00Z`);
  return {
    activo: true as const,
    OR: [
      { fecha: { gte: hoy } },
      { fecha: null, disponibleHoy: true, actualizadoEn: { gte: cutoff24h } },
      { fecha: null, disponibleHoy: false, actualizadoEn: { gte: cutoff7d } },
    ],
  };
}

type DispVigencia = {
  disponibleHoy: boolean;
  actualizadoEn: Date | string;
  fecha?: Date | string | null;
};

/** true si una disponibilidad ya cargada sigue vigente (no vencida por tiempo). */
export function esDisponibilidadVigente(disp: DispVigencia): boolean {
  const fecha = fechaISO(disp.fecha);
  if (fecha) return fecha >= hoyArgentina();
  const cutoffMs = disp.disponibleHoy ? DISPONIBLE_HOY_MS : DISPONIBLE_SEMANA_MS;
  const actualizadoEn = new Date(disp.actualizadoEn).getTime();
  return Date.now() - actualizadoEn < cutoffMs;
}

/** "Hoy", "Mañana" o "sáb 8 nov". */
export function etiquetaFecha(iso: string): string {
  const hoy = hoyArgentina();
  if (iso === hoy) return "Hoy";
  if (iso === sumarDias(hoy, 1)) return "Mañana";
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(/\./g, "")
    .replace(",", "");
}

/** Cuándo deja de verse, para el propio transportista. */
export function textoVencimiento(disp: DispVigencia): string {
  const fecha = fechaISO(disp.fecha);
  if (fecha) {
    const e = etiquetaFecha(fecha);
    return e === "Hoy" || e === "Mañana" ? `Visible hasta ${e.toLowerCase()} a la noche` : `Visible hasta el ${e}`;
  }
  return disp.disponibleHoy ? "Expira en 24 h" : "Expira en 7 días";
}

/** Lugar que le queda al transportista en el vehículo. */
export const ESPACIOS = ["vacio", "parcial", "chico"] as const;
export type Espacio = (typeof ESPACIOS)[number];

export const ESPACIO_META: Record<Espacio, { label: string; ayuda: string; emoji: string; bg: string; text: string }> = {
  vacio: { label: "Vacío", ayuda: "Todo el vehículo libre", emoji: "⬜", bg: "#DCFCE7", text: "#166534" },
  parcial: { label: "Lugar parcial", ayuda: "Medio cargado, entra más", emoji: "◧", bg: "#FEF3C7", text: "#92400E" },
  chico: { label: "Algo chico", ayuda: "Cajas, bultos, encomiendas", emoji: "📦", bg: "#E0F2FE", text: "#075985" },
};

export function esEspacio(v: unknown): v is Espacio {
  return typeof v === "string" && (ESPACIOS as readonly string[]).includes(v);
}

/** El viaje tiene origen y destino con coordenadas: se puede dibujar y cruzar con zonas. */
export function viajeConCoords(d: {
  salidaDesdeLat: number | null;
  salidaDesdeLng: number | null;
  salidaDestinoLat: number | null;
  salidaDestinoLng: number | null;
}): { origen: { lat: number; lng: number }; destino: { lat: number; lng: number } } | null {
  if (d.salidaDesdeLat == null || d.salidaDesdeLng == null || d.salidaDestinoLat == null || d.salidaDestinoLng == null) {
    return null;
  }
  return {
    origen: { lat: d.salidaDesdeLat, lng: d.salidaDesdeLng },
    destino: { lat: d.salidaDestinoLat, lng: d.salidaDestinoLng },
  };
}
