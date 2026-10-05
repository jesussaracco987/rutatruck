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
