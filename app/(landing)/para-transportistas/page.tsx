import type { Metadata } from "next";
import Landing from "../_components/Landing";
import { absoluteUrl } from "@/lib/site";

// El contador de días de la promo depende de la fecha: sin esto quedaría
// congelado en el valor del último deploy.
export const revalidate = 3600;

const title = "Cargas para camiones en todo el país | ClickCargo";
const description =
  "Encontrá cargas cerca tuyo, postulate desde el celular y coordiná directo con la empresa. Avisos por zona. Gratis durante el lanzamiento.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/para-transportistas") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/para-transportistas"),
    siteName: "ClickCargo",
    locale: "es_AR",
    type: "website",
  },
};

export default function ParaTransportistasPage() {
  return <Landing variant="transportista" />;
}
