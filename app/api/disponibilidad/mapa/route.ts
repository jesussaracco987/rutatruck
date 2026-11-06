import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isEmpresa } from "@/lib/roles";
import { whereDisponibilidadVigente } from "@/lib/disponibilidad";
import { CONFIANZA_VACIA, findConfianzaTransportistas } from "@/lib/repositories/resena.repository";

export async function GET() {
  const session = await getSession();
  if (!session || !isEmpresa(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const disponibilidades = await db.disponibilidadTransportista.findMany({
    where: whereDisponibilidadVigente(),
    select: {
      id: true,
      transportistaId: true,
      vehiculo: true,
      zona: true,
      lat: true,
      lng: true,
      radioKm: true,
      regresoVacio: true,
      buscaCarga: true,
      voyAPuerto: true,
      disponibleHoy: true,
      salidaDesde: true,
      salidaDestino: true,
      salidaDesdeLat: true,
      salidaDesdeLng: true,
      salidaDestinoLat: true,
      salidaDestinoLng: true,
      fecha: true,
      espacio: true,
      espacioDetalle: true,
      actualizadoEn: true,
    },
  });

  const favs = await db.favoritoTransportista.findMany({
    where: { empresaId: session.userId },
    select: { transportistaId: true },
  });
  const favSet = new Set(favs.map((f: { transportistaId: string }) => f.transportistaId));

  const confianza = await findConfianzaTransportistas(disponibilidades.map((d) => d.transportistaId));

  const result = disponibilidades.map((d: typeof disponibilidades[0]) => ({
    ...d,
    esFavorito: favSet.has(d.transportistaId),
    ...(confianza.get(d.transportistaId) ?? CONFIANZA_VACIA),
  }));

  return NextResponse.json({ disponibilidades: result });
}
