import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isEmpresa } from "@/lib/roles";
import { FREE_TIER } from "@/lib/free-tier";
import { getPrecioPublicacion } from "@/lib/comision";
import { conversacionAConfirmar } from "@/lib/services/whatsapp-carga.service";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import ChatPublicar from "@/app/_components/publicar-chat/ChatPublicar";

export const metadata: Metadata = {
  title: "Confirmá tu carga | ClickCargo",
  // Cada link es de una persona: no tiene que aparecer en buscadores.
  robots: { index: false, follow: false },
};

/**
 * Destino del link que manda el asistente de WhatsApp: abre el resumen de la
 * carga armada por chat para marcar el mapa y publicar. Quien no tiene sesión
 * confirma con email y código, igual que en la home.
 */
export default async function ConfirmarCargaWhatsappPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const conversacion = await conversacionAConfirmar(token);

  const session = await getSession();
  const conCuenta = session?.userId && isEmpresa(session.role);

  let contenido: React.ReactNode;
  if (conversacion.estado === "pendiente") {
    const user = conCuenta
      ? await db.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true } })
      : null;
    contenido = (
      <>
        <h1 className="text-3xl font-bold text-gray-900">Confirmá tu carga</h1>
        <p className="mt-1 mb-6 text-sm" style={{ color: "#6B7280" }}>
          Revisá lo que armamos por WhatsApp, marcá los puntos en el mapa y publicala.
        </p>
        <ChatPublicar
          freeTier={FREE_TIER}
          precioPublicacion={await getPrecioPublicacion()}
          cuenta={
            user
              ? { nombre: user.name ?? "", email: user.email ?? "", telefono: user.phone || conversacion.telefono }
              : undefined
          }
          hrefFormulario={conCuenta ? "/empresa/cargas/nueva?modo=formulario" : "/publicar"}
          inicial={{
            conversacionId: conversacion.id,
            mensajes: conversacion.mensajes,
            borrador: conversacion.borrador,
            telefono: conversacion.telefono,
          }}
        />
      </>
    );
  } else {
    const publicada = conversacion.estado === "publicada";
    contenido = (
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">
          {publicada ? "Esta carga ya está publicada" : "Este link venció"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {publicada
            ? "Podés ver quién se postuló desde tus cargas."
            : "Escribinos de nuevo por WhatsApp para armar la carga, o publicala desde la web."}
        </p>
        <Link
          href={publicada ? "/empresa/cargas" : "/publicar"}
          className="mt-5 inline-block rounded-xl px-5 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {publicada ? "Ver mis cargas" : "Publicar una carga"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header className="px-6 py-4 flex items-center border-b" style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}>
        <Link href="/">
          <LogoClickCargo />
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 sm:py-10">{contenido}</main>
    </div>
  );
}
