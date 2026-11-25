/**
 * Localidades argentinas con la API Georef (datos.gob.ar). Sin "server-only":
 * la usan formularios del navegador y el bot de WhatsApp.
 */

export type Localidad = { label: string; lat: number; lng: number };

/**
 * Localidad con ese nombre exacto ("Rosario, Santa Fe"). La búsqueda que usa el
 * autocompletado ordena por nombre: su primer resultado para "Rosario" es
 * "Balde del Rosario", en San Juan.
 */
export async function buscarLocalidadExacta(lugar: string): Promise<Localidad | null> {
  const [nombre, provincia] = lugar.split(",").map((p) => p.trim());
  if (!nombre) return null;
  const consulta = async (conProvincia: boolean) => {
    const params = new URLSearchParams({ nombre, exacto: "true", max: "1", campos: "nombre,provincia.nombre,centroide" });
    if (conProvincia) params.set("provincia", provincia);
    const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${params}`);
    if (!res.ok) return null;
    const [l] = (await res.json()).localidades ?? [];
    return l ? { label: `${l.nombre}, ${l.provincia.nombre}`, lat: l.centroide.lat, lng: l.centroide.lon } : null;
  };
  return (provincia ? await consulta(true) : null) ?? consulta(false);
}

/**
 * Centro de la ciudad que escribió la persona, o null si Georef no la conoce o
 * tarda más de 2,5 s.
 */
export async function centroDeLocalidad(lugar: string | null): Promise<Localidad | null> {
  if (!lugar) return null;
  // Georef la tiene como provincia, no como localidad, y es de los destinos más pedidos.
  if (/^(caba|capital federal|ciudad de buenos aires|ciudad aut[oó]noma|buenos aires)\b/i.test(lugar.trim())) {
    return { label: lugar, lat: -34.6037, lng: -58.3816 };
  }
  const consulta = buscarLocalidadExacta(lugar).catch(() => null);
  const sinRespuesta = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
  return Promise.race([consulta, sinRespuesta]);
}

/** Caja que contiene a la Argentina continental, para descartar ubicaciones de otro país. */
export function dentroDeArgentina(lat: number, lng: number): boolean {
  return lat >= -55.1 && lat <= -21.7 && lng >= -73.6 && lng <= -53.5;
}
