import type { Metadata } from "next";
import Landing from "../_components/Landing";
import { OG_IMAGE, absoluteUrl } from "@/lib/site";

// El contador de días de la promo depende de la fecha: sin esto quedaría
// congelado en el valor del último deploy.
export const revalidate = 3600;

const title = "Fletes y transporte de cargas en todo el país | ClickCargo";
const description =
  "¿Necesitás un flete? Publicá tu carga, recibí postulaciones de transportistas de la zona y coordiná por chat. Gratis durante el lanzamiento.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/para-empresas") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/para-empresas"),
    siteName: "ClickCargo",
    locale: "es_AR",
    type: "website",
    images: [OG_IMAGE],
  },
};

export default function ParaEmpresasPage() {
  return <Landing variant="empresa" />;
}
