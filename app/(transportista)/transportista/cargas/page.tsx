import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBell from "../_components/NotificacionBell";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import Link from "next/link";
import CargasClientWrapper from "./_components/CargasClientWrapper";
import { FREE_TIER, diasRestantesFreeTier } from "@/lib/free-tier";

export default async function TransportistasCargasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; pago?: string }>;
}) {
  const session = await verifySession();
  const { success, pago } = await searchParams;

  const [cargasRaw, misPostulaciones, pendientesPagoRaw, cargasPrivadasRaw] = await Promise.all([
    db.carga.findMany({
      where: { estado: "ACTIVA", esPrivada: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titulo: true,
        origen: true,
        origenLat: true,
        origenLng: true,
        destino: true,
        tipoCarga: true,
        tipoCargaDetalle: true,
        peso: true,
        pesoUnidad: true,
        presupuesto: true,
        fechaCarga: true,
        cantidadCamiones: true,
      },
    }),
    db.postulacion.findMany({
      where: { transportistaId: session.userId },
      select: { cargaId: true },
    }),
    db.carga.findMany({
      where: {
        estado: "PENDIENTE_PAGO_TRANSPORTISTA",
        postulaciones: {
          some: { transportistaId: session.userId, estado: "ACEPTADA", matchConfirmadoEn: null },
        },
      },
      orderBy: { transportistaPagoDeadline: "asc" },
      select: {
        id: true,
        titulo: true,
        origen: true,
        destino: true,
        tipoCarga: true,
        presupuesto: true,
        transportistaPagoDeadline: true,
      },
    }),
    db.carga.findMany({
      where: {
        transportistaDestinadoId: session.userId,
        esPrivada: true,
        estado: "ACTIVA",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titulo: true,
        origen: true,
        destino: true,
        tipoCarga: true,
        presupuesto: true,
        fechaCarga: true,
        descripcion: true,
      },
    }),
  ]);

  // Serialize dates for client components
  const cargas = cargasRaw.map((c) => ({
    ...c,
    fechaCarga: c.fechaCarga.toISOString(),
  }));

  const pendientesPago = pendientesPagoRaw.map((c) => ({
    ...c,
    transportistaPagoDeadline: c.transportistaPagoDeadline?.toISOString() ?? null,
  }));

  const cargasPrivadas = cargasPrivadasRaw.map((c) => ({
    ...c,
    fechaCarga: c.fechaCarga.toISOString(),
  }));

  const yaPostuladoIds = misPostulaciones.map((p: { cargaId: number }) => p.cargaId);

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="px-4 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}
      >
        <Link href="/transportista/dashboard">
          <LogoClickCargo />
        </Link>
        <div className="flex items-center gap-2">
          <NotificacionBell />
          <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <CargasClientWrapper
        cargas={cargas}
        yaPostuladoIds={yaPostuladoIds}
        pendientesPago={pendientesPago}
        cargasPrivadas={cargasPrivadas}
        success={success}
        pago={pago}
        freeTier={FREE_TIER}
        freeTierDias={diasRestantesFreeTier()}
      />
    </div>
  );
}
