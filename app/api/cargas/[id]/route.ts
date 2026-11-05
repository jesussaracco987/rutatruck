import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isEmpresa } from "@/lib/roles";
import { linkPhoneSiFalta } from "@/lib/repositories/user.repository";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isEmpresa(session.role)) return NextResponse.json({ error: "Solo empresas" }, { status: 403 });

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const carga = await db.carga.findUnique({
    where: { id: cargaId, empresaId: session.userId, estado: "ACTIVA" },
  });
  if (!carga) return NextResponse.json({ error: "Carga no encontrada o no editable" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const {
    origen, destino, cantidadCamiones, tipoCarga, tipoCargaDetalle,
    peso, pesoUnidad, presupuesto,
    fechaCarga, fechaCupo, preferenciaCamion,
    descripcion,
    contactoNombre, contactoTelefono, contactoEmail,
  } = body;

  if (!origen || !destino || !tipoCarga || !fechaCarga || !contactoNombre || !contactoTelefono || !contactoEmail) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (fechaCupo && String(fechaCupo) !== "" && new Date(String(fechaCupo)) < new Date(String(fechaCarga))) {
    return NextResponse.json({ error: "La fecha de entrega no puede ser anterior a la fecha de carga" }, { status: 400 });
  }

  await db.carga.update({
    where: { id: cargaId },
    data: {
      titulo: `${String(origen)} → ${String(destino)}`,
      origen: String(origen),
      destino: String(destino),
      cantidadCamiones: cantidadCamiones !== undefined && cantidadCamiones !== "" ? parseInt(String(cantidadCamiones)) : undefined,
      tipoCarga: String(tipoCarga),
      tipoCargaDetalle: tipoCargaDetalle && String(tipoCargaDetalle) !== "" ? String(tipoCargaDetalle) : null,
      peso: peso !== undefined && peso !== "" ? parseFloat(String(peso)) : null,
      pesoUnidad: pesoUnidad && String(pesoUnidad) !== "" ? String(pesoUnidad) : null,
      ...(carga.transportistaAsignadoId === null && {
        presupuesto: presupuesto !== undefined && presupuesto !== "" ? parseFloat(String(presupuesto)) : null,
      }),
      fechaCarga: new Date(String(fechaCarga)),
      fechaCupo: fechaCupo && String(fechaCupo) !== "" ? new Date(String(fechaCupo)) : null,
      preferenciaCamion: preferenciaCamion && String(preferenciaCamion) !== "" ? String(preferenciaCamion) : null,
      descripcion: descripcion && String(descripcion) !== "" ? String(descripcion) : null,
      contactoNombre: String(contactoNombre),
      contactoTelefono: String(contactoTelefono),
      contactoEmail: String(contactoEmail),
    },
  });

  await linkPhoneSiFalta(session.userId, String(contactoTelefono)).catch(() => {});

  return NextResponse.json({ ok: true });
}
