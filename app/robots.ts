import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Con barra final a propósito: robots.txt matchea por prefijo, y sin ella
      // "/empresa" bloquearía también cualquier ruta pública que empiece igual.
      disallow: ["/api/", "/admin/", "/empresa/", "/transportista/"],
    },
    sitemap: SITE_URL ? `${SITE_URL}/sitemap.xml` : undefined,
  };
}
