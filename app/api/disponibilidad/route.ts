import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isTransportista } from "@/lib/roles";
import { esDisponibilidadVigente } from "@/lib/disponibilidad";
import { emit } from "@/lib/events/bus";

export async function GET() {
  const session = await getSession();
  if (!session || !isTransportista(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const disp = await db.disponibilidadTransportista.findUnique({
    where: { transportistaId: session.userId },
  });

  return NextResponse.json({ disponibilidad: disp });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isTransportista(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { vehiculo, zona, lat, lng, radioKm, regresoVacio, buscaCarga, voyAPuerto, disponibleHoy, salidaDesde, salidaDestino } = body as Record<string, unknown>;

  if (!vehiculo || !zona || lat == null || lng == null) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const data = {
    vehiculo: vehiculo as string,
    zona: zona as string,
    lat: Number(lat),
    lng: Number(lng),
    radioKm: radioKm != null ? Number(radioKm) : null,
    regresoVacio: !!regresoVacio,
    buscaCarga: !!buscaCarga,
    voyAPuerto: !!voyAPuerto,
    disponibleHoy: !!disponibleHoy,
    salidaDesde: (salidaDesde as string) || null,
    salidaDestino: (salidaDestino as string) || null,
    activo: true,
  };

  try {
    // Re-guardar estando ya disponible (cambiar el vehículo, extender la
    // vigencia) no es novedad para las empresas: solo se avisa cuando pasa de
    // no disponible a disponible, si no cada edición sería un push a todas.
    const previa = await db.disponibilidadTransportista.findUnique({
      where: { transportistaId: session.userId },
      select: { activo: true, disponibleHoy: true, actualizadoEn: true },
    });
    const esNueva = !previa || !previa.activo || !esDisponibilidadVigente(previa);

    const disp = await db.disponibilidadTransportista.upsert({
      where: { transportistaId: session.userId },
      create: { transportistaId: session.userId, ...data },
      update: esNueva ? { ...data, disponibleDesde: new Date() } : data,
    });

    if (esNueva) {
      emit("disponibilidad.activada", {
        transportistaId: session.userId,
        vehiculo: disp.vehiculo,
        zona: disp.zona,
        lat: disp.lat,
        lng: disp.lng,
        radioKm: disp.radioKm,
        disponibleHoy: disp.disponibleHoy,
      });
    }

    return NextResponse.json({ disponibilidad: disp });
  } catch (err) {
    console.error("[disponibilidad POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session || !isTransportista(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await db.disponibilidadTransportista.updateMany({
    where: { transportistaId: session.userId },
    data: { activo: false },
  });

  return NextResponse.json({ ok: true });
}
