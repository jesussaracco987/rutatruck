/**
 * Datos públicos del sitio que usan las landings, el sitemap y robots.txt.
 *
 * `NEXTAUTH_URL` ya es la URL base en producción (la usan los links de pago y
 * de recuperación de contraseña), así que se reutiliza en vez de sumar otra
 * variable.
 */

export const SITE_URL = process.env.NEXTAUTH_URL?.replace(/\/+$/, "") || null;

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=ar.com.clickcargo.twa";

/** URL absoluta de una ruta, o `undefined` si no hay URL base configurada. */
export function absoluteUrl(path: string): string | undefined {
  return SITE_URL ? `${SITE_URL}${path}` : undefined;
}

/**
 * Link a WhatsApp con un mensaje precargado, o `null` mientras no esté cargado
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` (formato internacional, ej. "5493581234567").
 * Las landings ocultan el botón cuando devuelve `null`.
 */
export function whatsappUrl(texto: string): string | null {
  const numero = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
