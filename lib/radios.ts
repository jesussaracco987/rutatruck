/**
 * Radios que se ofrecen en toda la app: zona de notificaciones (registro y
 * Mi cuenta) y radio de trabajo de la disponibilidad. Son los mismos que
 * prometen los posts y anuncios; antes el registro ofrecía 50/100/200 y Mi
 * cuenta 20/50/100, y quien se registraba con 200 no veía nada marcado.
 *
 * `null` = sin límite.
 */
export type Radio = { value: number | null; label: string };

export const RADIOS: Radio[] = [
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 200, label: "200 km" },
  { value: null, label: "Todo el país" },
];

/**
 * Las opciones más el valor ya guardado si quedó de las opciones viejas
 * (p. ej. 20 km), para que siga apareciendo marcado hasta que lo cambien.
 */
export function radiosConActual(actual: number | null): Radio[] {
  if (RADIOS.some((r) => r.value === actual)) return RADIOS;
  return [{ value: actual, label: `${actual} km` }, ...RADIOS].sort(
    (a, b) => (a.value ?? Infinity) - (b.value ?? Infinity),
  );
}
