import type { MetadataRoute } from "next";
import { PLAY_STORE_URL } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClickCargo",
    short_name: "ClickCargo",
    description: "Plataforma que conecta empresas con transportistas de carga",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#060F0F",
    theme_color: "#060F0F",
    // En Android, Chrome ofrece la app de Play Store en lugar de instalar la web,
    // y permite saber si ya está instalada (getInstalledRelatedApps, InstallPWA).
    related_applications: [
      { platform: "play", id: "ar.com.clickcargo.twa", url: PLAY_STORE_URL },
    ],
    prefer_related_applications: true,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
