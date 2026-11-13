/**
 * Período de lanzamiento gratuito (60 días).
 *
 * `FREE_TIER=true` desactiva los cobros de MercadoPago (publicación y comisión).
 * `FIN_FREE_TIER` habilita el contador de días restantes en el cartel. En `null`
 * el cartel igual se muestra, pero con el texto genérico "por tiempo limitado".
 */

export const FREE_TIER = process.env.FREE_TIER === "true";

export const FREE_TIER_DIAS = 60;

/**
 * Momento en que termina la promoción, en hora argentina. Se cambia acá y sale
 * con el próximo deploy (antes era la variable de entorno `FREE_TIER_FIN`).
 * `null` oculta el contador.
 */
const FIN_FREE_TIER: string | null = "2026-12-16T00:00:00-03:00";

export function finFreeTier(): Date | null {
  if (!FIN_FREE_TIER) return null;
  const fecha = new Date(FIN_FREE_TIER);
  return isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Último día gratis en texto ("15 de diciembre"). Es el día anterior a
 * `FIN_FREE_TIER`, que marca la medianoche en que termina. Se muestra la fecha
 * en lugar de "60 días gratis" o "quedan N días": los dos números juntos en
 * distintas pantallas parecían promociones distintas.
 */
export function ultimoDiaFreeTier(): string | null {
  const fin = finFreeTier();
  if (!fin) return null;
  const ultimo = new Date(fin.getTime() - 1);
  return ultimo.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

/**
 * Días completos que faltan para que termine la promoción, o `null` si no hay
 * fecha de fin configurada. Nunca devuelve negativo: si ya venció, devuelve 0.
 */
export function diasRestantesFreeTier(ahora = new Date()): number | null {
  const fin = finFreeTier();
  if (!fin) return null;
  const ms = fin.getTime() - ahora.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
