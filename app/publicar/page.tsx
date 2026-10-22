import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getPrecioPublicacion } from "@/lib/comision";
import { OG_IMAGE, absoluteUrl } from "@/lib/site";
import NuevaCargaForm from "@/app/(empresa)/empresa/cargas/nueva/_components/NuevaCargaForm";

const title = "Publicá tu carga | ClickCargo";
const description =
  "Cargá origen, destino y fecha, y recibí postulaciones de transportistas de la zona. Sin registrarte antes.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/publicar") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/publicar"),
    siteName: "ClickCargo",
    locale: "es_AR",
    type: "website",
    images: [OG_IMAGE],
  },
};

/**
 * Publicar una carga sin cuenta previa: la cuenta se crea al publicar (ver
 * app/api/cargas/invitado). Es el destino del botón principal de la landing
 * de empresas.
 */
export default async function PublicarPage() {
  // Con sesión, el formulario de siempre (el proxy saca de ahí a quien no es empresa).
  if (await getSession()) redirect("/empresa/cargas/nueva");

  const precioPublicacion = await getPrecioPublicacion();

  return (
    <NuevaCargaForm
      invitado
      contactoDefecto={{ nombre: "", email: "", telefono: "" }}
      precioPublicacion={precioPublicacion}
      freeTier={process.env.FREE_TIER === "true"}
    />
  );
}
