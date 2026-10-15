import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isTransportista } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session || !isTransportista(session.role)) {
    return NextResponse.json({ notificaciones: [] });
  }

  const select = {
    id: true,
    carga: {
      select: { id: true, titulo: true, origen: true, destino: true },
    },
  } as const;

  const [ofertas, nuevas, vistas] = await Promise.all([
    // Ofertas directas sin responder: suman al globo (privCount en lib/sse.ts)
    // y antes no se listaban, así que la campana mostraba número y lista vacía.
    db.carga.findMany({
      where: { transportistaDestinadoId: session.userId, esPrivada: true, estado: "ACTIVA" },
      select: { id: true, titulo: true, origen: true, destino: true },
      orderBy: { createdAt: "desc" },
    }),
    db.postulacion.findMany({
      where: { transportistaId: session.userId, estado: "ACEPTADA", vistaTransportista: false },
      select,
      orderBy: { updatedAt: "desc" },
    }),
    db.postulacion.findMany({
      where: { transportistaId: session.userId, estado: "ACEPTADA", vistaTransportista: true },
      select,
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const notificaciones = [
    ...ofertas.map((c) => ({ id: `oferta-${c.id}`, tipo: "oferta" as const, carga: c, vista: false })),
    ...nuevas.map((p) => ({ ...p, id: `aceptada-${p.id}`, tipo: "aceptada" as const, vista: false })),
    ...vistas.map((p) => ({ ...p, id: `aceptada-${p.id}`, tipo: "aceptada" as const, vista: true })),
  ];

  return NextResponse.json({ notificaciones });
}
