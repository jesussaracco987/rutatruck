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
const FIN_FREE_TIER: string | null = "2026-12-06T00:00:00-03:00";

export function finFreeTier(): Date | null {
  if (!FIN_FREE_TIER) return null;
  const fecha = new Date(FIN_FREE_TIER);
  return isNaN(fecha.getTime()) ? null : fecha;
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
