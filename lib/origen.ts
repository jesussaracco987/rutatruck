/**
 * Canal de origen de un visitante: de dónde llegó antes de registrarse
 * (anuncio de Facebook, Google, grupo de WhatsApp, landing, etc.).
 *
 * `proxy.ts` lo guarda en una cookie al entrar y `signup` lo copia al usuario.
 * Sin imports de servidor a propósito: lo usan los dos.
 */

export const ORIGEN_COOKIE = "cc_origen";
export const ORIGEN_MAX_AGE = 60 * 60 * 24 * 30;

export type Origen = {
  fuente: string | null;
  medio: string | null;
  campania: string | null;
  contenido: string | null;
  /** Primera página que vio (ej. "/para-empresas"). */
  landing: string | null;
  /** Dominio externo desde el que llegó, si el navegador lo informó. */
  referrer: string | null;
};

const MAX_LARGO = 100;

function limpiar(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim().slice(0, MAX_LARGO);
  return recortado || null;
}

function hostExterno(referer: string | null, hostPropio: string): string | null {
  if (!referer) return null;
  try {
    const host = new URL(referer).host;
    return host && host !== hostPropio ? limpiar(host) : null;
  } catch {
    return null;
  }
}

export function origenDesdeRequest(url: URL, referer: string | null): Origen {
  const p = url.searchParams;
  let fuente = limpiar(p.get("utm_source"));
  let medio = limpiar(p.get("utm_medium"));

  // Los anuncios agregan su propio identificador de clic aunque el link no
  // tenga utm_*. gclid solo existe en clics pagos; fbclid también aparece en
  // clics orgánicos, así que ahí no se asume el medio.
  if (!fuente && p.has("gclid")) {
    fuente = "google";
    medio = medio ?? "cpc";
  } else if (!fuente && p.has("fbclid")) {
    fuente = "facebook";
  }

  return {
    fuente,
    medio,
    campania: limpiar(p.get("utm_campaign")),
    contenido: limpiar(p.get("utm_content")),
    landing: limpiar(url.pathname),
    referrer: hostExterno(referer, url.host),
  };
}

export function parseOrigen(raw: string | undefined): Origen | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return {
      fuente: limpiar(data.fuente),
      medio: limpiar(data.medio),
      campania: limpiar(data.campania),
      contenido: limpiar(data.contenido),
      landing: limpiar(data.landing),
      referrer: limpiar(data.referrer),
    };
  } catch {
    return null;
  }
}
