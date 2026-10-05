import type { Metadata } from "next";
import Landing from "../_components/Landing";
import { absoluteUrl } from "@/lib/site";

// El contador de días de la promo depende de la fecha: sin esto quedaría
// congelado en el valor del último deploy.
export const revalidate = 3600;

const title = "Transporte de cargas en el sur de Córdoba y Santa Fe | ClickCargo";
const description =
  "Publicá tu carga y recibí postulaciones de transportistas de la zona. Elegí con quién viajar y coordiná por chat. Gratis durante el lanzamiento.";

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
  },
};

export default function ParaEmpresasPage() {
  return <Landing variant="empresa" />;
}
