import { PLAY_STORE_URL, PERFILES_SOCIALES, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Datos estructurados para Google: quién es ClickCargo (con sus redes, para que
 * las asocie a la marca) y que la app es gratuita en Play Store.
 * Va en las páginas públicas (home y landings), no en las de la app.
 */
export default function JsonLd() {
  if (!SITE_URL) return null;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organizacion`,
        name: "ClickCargo",
        url: SITE_URL,
        logo: absoluteUrl("/icon-512.png"),
        email: "clickcargoarg@gmail.com",
        sameAs: [PLAY_STORE_URL, ...PERFILES_SOCIALES],
      },
      {
        "@type": "MobileApplication",
        name: "ClickCargo",
        url: SITE_URL,
        operatingSystem: "ANDROID",
        applicationCategory: "BusinessApplication",
        installUrl: PLAY_STORE_URL,
        offers: { "@type": "Offer", price: 0, priceCurrency: "ARS" },
        publisher: { "@id": `${SITE_URL}/#organizacion` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
