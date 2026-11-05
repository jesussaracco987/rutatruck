/**
 * Fecha de carga o de entrega para mostrar ("13/11/2026").
 *
 * Son fechas sin hora: "2026-11-13" se guarda como medianoche UTC. Mostrarla en
 * hora argentina (UTC-3) la corre al día anterior a las 21 h, así que se formatea
 * en UTC. Sirve en el servidor y en el navegador, con un Date o el string ISO.
 */
export function formatFechaDia(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/**
 * El día de hoy en Argentina, guardado como esas fechas (medianoche UTC). Para
 * comparar contra fechaCarga/fechaCupo: `fecha < inicioDeHoyArgentina()` es "ese
 * día ya terminó en Argentina".
 *
 * Comparar contra `new Date()` las da por pasadas a las 21 h del día anterior, y
 * usar el día UTC de hoy se adelanta un día entre las 21 h y la medianoche.
 */
export function inicioDeHoyArgentina(ahora: Date = new Date()): Date {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(ahora);
  return new Date(`${dia}T00:00:00.000Z`);
}
