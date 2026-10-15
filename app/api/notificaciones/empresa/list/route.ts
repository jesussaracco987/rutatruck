import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isEmpresa } from "@/lib/roles";
import { findDisponibilidadesParaEmpresa } from "@/lib/repositories/disponibilidad.repository";
import { getVehiculoLabel } from "@/lib/vehiculos";

export async function GET() {
  const session = await getSession();
  if (!session || !isEmpresa(session.role)) {
    return NextResponse.json({ notificaciones: [] });
  }

  try {
    const postulacionSelect = {
      id: true,
      carga: { select: { id: true, titulo: true, origen: true, destino: true } },
      transportista: { select: { name: true } },
    } as const;

    const [enConfirmacion, postulacionesNuevas, postulacionesVistas, disponibilidades] = await Promise.all([
      db.carga.findMany({
        where: { empresaId: session.userId, estado: "EN_CONFIRMACION" },
        select: { id: true, titulo: true, origen: true, destino: true },
      }),
      db.postulacion.findMany({
        where: { carga: { empresaId: session.userId }, estado: "PENDIENTE", vistaEmpresa: false },
        select: postulacionSelect,
        orderBy: { createdAt: "desc" },
      }),
      db.postulacion.findMany({
        where: { carga: { empresaId: session.userId }, estado: "PENDIENTE", vistaEmpresa: true },
        select: postulacionSelect,
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      findDisponibilidadesParaEmpresa(session.userId),
    ]);

    const disponibilidadNotif = (d: (typeof disponibilidades)[number]) => ({
      tipo: "disponibilidad" as const,
      href: "/empresa/transportistas",
      titulo: d.transportista.name,
      origen: d.zona,
      destino: null,
      extra: getVehiculoLabel(d.vehiculo),
      vista: !d.nueva,
    });

    const notificaciones = [
      ...enConfirmacion.map((c) => ({
        tipo: "confirmacion" as const,
        href: `/empresa/cargas/${c.id}`,
        titulo: c.titulo,
        origen: c.origen,
        destino: c.destino,
        extra: null,
        vista: false,
      })),
      ...postulacionesNuevas.map((p) => ({
        tipo: "postulacion" as const,
        href: `/empresa/cargas/${p.carga.id}`,
        titulo: p.carga.titulo,
        origen: p.carga.origen,
        destino: p.carga.destino,
        extra: p.transportista.name,
        vista: false,
      })),
      ...disponibilidades.filter((d) => d.nueva).map(disponibilidadNotif),
      ...postulacionesVistas.map((p) => ({
        tipo: "postulacion" as const,
        href: `/empresa/cargas/${p.carga.id}`,
        titulo: p.carga.titulo,
        origen: p.carga.origen,
        destino: p.carga.destino,
        extra: p.transportista.name,
        vista: true,
      })),
      ...disponibilidades.filter((d) => !d.nueva).slice(0, 4).map(disponibilidadNotif),
    ];

    return NextResponse.json({ notificaciones });
  } catch {
    return NextResponse.json({ notificaciones: [] });
  }
}
