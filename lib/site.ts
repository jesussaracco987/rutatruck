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

/** Perfiles oficiales de ClickCargo en redes (los usa JsonLd para Google). */
export const PERFILES_SOCIALES: string[] = [
  "https://www.instagram.com/clickcargoarg/",
  "https://www.facebook.com/profile.php?id=61595386619664",
];

/** URL absoluta de una ruta, o `undefined` si no hay URL base configurada. */
export function absoluteUrl(path: string): string | undefined {
  return SITE_URL ? `${SITE_URL}${path}` : undefined;
}

/**
 * Link a Play Store que le dice a Play Console de dónde vino la instalación
 * (Estadísticas → Adquisición de usuarios). El parámetro `referrer` va con los
 * utm_* codificados adentro, como lo pide Google Play.
 */
export function playStoreUrl(utm: { source: string; medium: string; campaign?: string }): string {
  const referrer = new URLSearchParams({
    utm_source: utm.source,
    utm_medium: utm.medium,
    ...(utm.campaign ? { utm_campaign: utm.campaign } : {}),
  });
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer.toString())}`;
}

/**
 * Imagen de vista previa al compartir un link (WhatsApp, Facebook). Se generó
 * con marketing/redes/render.sh. Cada página que define su propio `openGraph`
 * la tiene que repetir, porque Next reemplaza ese objeto entero.
 */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "ClickCargo: cargas y camiones, conectados",
};

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
