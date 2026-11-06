import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isTransportista } from "@/lib/roles";
import {
  FECHA_MAX_DIAS,
  esDisponibilidadVigente,
  esEspacio,
  fechaISO,
  sumarDias,
  viajeConCoords,
} from "@/lib/disponibilidad";
import { hoyArgentina } from "@/lib/chat-carga";
import { emit } from "@/lib/events/bus";

function texto(v: unknown, max: number): string | null {
  return typeof v === "string" ? v.trim().slice(0, max) || null : null;
}

function coord(v: unknown, limite: number): number | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= limite ? n : null;
}

/** "YYYY-MM-DD" entre hoy y FECHA_MAX_DIAS adelante (hora Argentina), o null. */
function fechaValida(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const hoy = hoyArgentina();
  return v >= hoy && v <= sumarDias(hoy, FECHA_MAX_DIAS) ? v : null;
}

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

  const { vehiculo, zona, lat, lng, radioKm, regresoVacio, buscaCarga, voyAPuerto, disponibleHoy } = body;

  if (!vehiculo || !zona || lat == null || lng == null) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // La fecha es opcional, pero si vino tiene que ser válida: guardarla mal
  // haría que la disponibilidad venza (o no) cuando el transportista no espera.
  const fecha = body.fecha == null || body.fecha === "" ? null : fechaValida(body.fecha);
  if (body.fecha && !fecha) {
    return NextResponse.json(
      { error: `La fecha tiene que ser entre hoy y los próximos ${FECHA_MAX_DIAS} días.` },
      { status: 400 },
    );
  }

  const salidaDesde = texto(body.salidaDesde, 120);
  const salidaDestino = texto(body.salidaDestino, 120);
  // Coordenadas solo si acompañan al texto: sin nombre no hay qué mostrar.
  const salidaDesdeLat = salidaDesde ? coord(body.salidaDesdeLat, 90) : null;
  const salidaDesdeLng = salidaDesde ? coord(body.salidaDesdeLng, 180) : null;
  const salidaDestinoLat = salidaDestino ? coord(body.salidaDestinoLat, 90) : null;
  const salidaDestinoLng = salidaDestino ? coord(body.salidaDestinoLng, 180) : null;

  const data = {
    vehiculo: vehiculo as string,
    zona: zona as string,
    lat: Number(lat),
    lng: Number(lng),
    radioKm: radioKm != null ? Number(radioKm) : null,
    regresoVacio: !!regresoVacio,
    buscaCarga: !!buscaCarga,
    voyAPuerto: !!voyAPuerto,
    // "Hoy" se guarda también como fecha; el flag queda por compatibilidad
    // con registros viejos y para el badge.
    disponibleHoy: fecha ? fecha === hoyArgentina() : !!disponibleHoy,
    fecha: fecha ? new Date(`${fecha}T00:00:00Z`) : null,
    espacio: esEspacio(body.espacio) ? body.espacio : null,
    espacioDetalle: texto(body.espacioDetalle, 80),
    salidaDesde,
    salidaDestino,
    salidaDesdeLat,
    salidaDesdeLng,
    salidaDestinoLat,
    salidaDestinoLng,
    activo: true,
  };

  try {
    // Re-guardar estando ya disponible (cambiar el vehículo, extender la
    // vigencia) no es novedad para las empresas: solo se avisa cuando pasa de
    // no disponible a disponible, si no cada edición sería un push a todas.
    const previa = await db.disponibilidadTransportista.findUnique({
      where: { transportistaId: session.userId },
      select: { activo: true, disponibleHoy: true, actualizadoEn: true, fecha: true },
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
        fecha: fechaISO(disp.fecha),
        salidaDesde: disp.salidaDesde,
        salidaDestino: disp.salidaDestino,
        viaje: viajeConCoords(disp),
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
