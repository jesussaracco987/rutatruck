import { FREE_TIER } from "@/lib/free-tier";

/**
 * Un match (empresa ↔ transportista) queda confirmado cuando el transportista
 * pagó la comisión de su postulación —o al ser aceptado, si corre FREE_TIER—.
 * Recién ahí las partes pueden contactarse —ver los datos de contacto y usar
 * el chat—; si pudieran antes, cerrarían el viaje por fuera de la app y el
 * cobro se esquiva.
 *
 * Es por postulación y no por carga: en una convocatoria de varios camiones
 * cada transportista paga lo suyo, y el que ya pagó no pierde el chat si otro
 * deja vencer su plazo y la carga vuelve a ACTIVA.
 */
export function esMatchConfirmado(postulacion: { matchConfirmadoEn: Date | null }): boolean {
  return postulacion.matchConfirmadoEn !== null;
}

/** Cláusula Prisma sobre Postulacion equivalente a esMatchConfirmado. */
export function whereMatchConfirmado() {
  return { matchConfirmadoEn: { not: null } };
}

/**
 * Chat previo: mientras corre FREE_TIER no hay comisión que esquivar, así que
 * el chat se abre apenas el transportista se postula, sin esperar a que lo
 * acepten. Es la respuesta a las apps que dan contacto inmediato: quien envía
 * puede preguntar antes de elegir y el transportista no se postula a ciegas.
 * Los datos de contacto (teléfono, email) siguen apareciendo recién con el
 * match. Al volver el cobro, el chat vuelve a abrirse solo con el match.
 */
export function chatPrevioHabilitado(): boolean {
  return FREE_TIER;
}

type PostulacionChat = {
  estado: string;
  matchConfirmadoEn: Date | null;
  carga: { estado: string };
};

/**
 * Si las partes de esta postulación pueden chatear. La consulta previa vale
 * solo con la carga ACTIVA: una vez asignada o cancelada, el que no quedó
 * elegido no sigue escribiendo.
 */
export function puedeChatear(postulacion: PostulacionChat): boolean {
  if (postulacion.estado === "ACEPTADA") return esMatchConfirmado(postulacion);
  return (
    chatPrevioHabilitado() &&
    postulacion.estado === "PENDIENTE" &&
    postulacion.carga.estado === "ACTIVA"
  );
}

/** Cláusula Prisma sobre Postulacion equivalente a puedeChatear. Mezclar vía AND. */
export function wherePuedeChatear() {
  const conMatch = { estado: "ACEPTADA" as const, ...whereMatchConfirmado() };
  if (!chatPrevioHabilitado()) return conMatch;
  return {
    OR: [conMatch, { estado: "PENDIENTE" as const, carga: { estado: "ACTIVA" as const } }],
  };
}

/** Si el hilo es una consulta previa (todavía sin elegir) y no el chat del viaje. */
export function esConsultaPrevia(postulacion: { estado: string }): boolean {
  return postulacion.estado === "PENDIENTE";
}
