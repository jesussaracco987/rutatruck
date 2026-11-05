import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getPrecioPublicacion } from "@/lib/comision";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import ChatPublicar from "@/app/_components/publicar-chat/ChatPublicar";
import NuevaCargaForm from "./_components/NuevaCargaForm";
import ModoPublicacion from "./_components/ModoPublicacion";

export default async function NuevaCargaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; modo?: string }>;
}) {
  const session = await verifySession();
  const { error, modo } = await searchParams;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, phone: true },
  });
  const contacto = { nombre: user?.name ?? "", email: user?.email ?? "", telefono: user?.phone ?? "" };

  const precioPublicacion = await getPrecioPublicacion();
  const freeTier = process.env.FREE_TIER === "true";

  // Un pago cancelado vuelve al formulario, que tiene la carga guardada como borrador.
  if (modo === "formulario" || error) {
    return (
      <NuevaCargaForm
        contactoDefecto={contacto}
        precioPublicacion={precioPublicacion}
        freeTier={freeTier}
        selectorModo={<ModoPublicacion actual="formulario" />}
        errorInicial={
          error === "pago_cancelado"
            ? "El pago fue cancelado. Podés intentarlo nuevamente."
            : undefined
        }
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}
      >
        <Link href="/empresa/dashboard">
          <LogoClickCargo />
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/empresa/dashboard"
          className="inline-flex items-center gap-2 mb-4 font-semibold text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--primary)" }}
        >
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full border-2"
            style={{ borderColor: "var(--primary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          Volver al panel
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Publicar nueva carga</h1>
        <p className="mt-1 mb-6 text-sm" style={{ color: "#6B7280" }}>
          Contale al asistente qué necesitás mover, escribiendo o con un audio, y arma la carga por vos.
        </p>
        <ModoPublicacion actual="asistente" />
        <ChatPublicar
          freeTier={freeTier}
          precioPublicacion={precioPublicacion}
          cuenta={contacto}
          hrefFormulario="/empresa/cargas/nueva?modo=formulario"
        />
      </main>
    </div>
  );
}
