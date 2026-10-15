/**
 * Zona de interés de un usuario (centro + radio). Vive aparte de lib/push.ts
 * porque también la usa la campana (lib/repositories/disponibilidad.repository.ts)
 * y importar push.ts arrastra web-push y su setVapidDetails al cargar.
 */

export type Zona = {
  notifZonaLat: number | null;
  notifZonaLng: number | null;
  notifRadioKm: number | null;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** El usuario configuró una zona de interés completa (centro + radio). */
export function tieneZonaConfigurada(zona: Zona): boolean {
  return (
    zona.notifRadioKm !== null && zona.notifZonaLat !== null && zona.notifZonaLng !== null
  );
}

/**
 * Un punto entra en la zona del usuario si no configuró zona (recibe todo),
 * si el punto no tiene coordenadas (no hay con qué descartarlo) o si la
 * distancia real cae dentro del radio.
 */
export function enZona(
  zona: Zona,
  lat: number | null,
  lng: number | null,
): boolean {
  if (!tieneZonaConfigurada(zona)) return true;
  if (lat === null || lng === null) return true;
  return haversineKm(zona.notifZonaLat!, zona.notifZonaLng!, lat, lng) <= zona.notifRadioKm!;
}

/**
 * Como enZona(), pero el punto también trae su propio radio (el radio de
 * trabajo que el transportista declara en su disponibilidad). Alcanza con que
 * cualquiera de los dos cubra la distancia: a una empresa con radio 50 le
 * interesa un transportista a 80 km si él dice que cubre 200.
 */
export function enAlcance(
  zona: Zona,
  lat: number,
  lng: number,
  radioPuntoKm: number | null,
): boolean {
  if (enZona(zona, lat, lng)) return true;
  if (radioPuntoKm === null) return false;
  // Si enZona() dio false, la zona está configurada completa.
  return haversineKm(zona.notifZonaLat!, zona.notifZonaLng!, lat, lng) <= radioPuntoKm;
}
