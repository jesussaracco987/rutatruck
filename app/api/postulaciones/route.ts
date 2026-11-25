import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isTransportista } from "@/lib/roles";
import { crearPostulacion } from "@/lib/services/postulacion.service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isTransportista(session.role)) {
    return NextResponse.json({ error: "Solo transportistas pueden postularse" }, { status: 403 });
  }

  let body: { cargaId: number; mensaje?: string; contactoEmail?: string; contactoTelefono?: string; camionesCubiertos?: number; precioOfrecido?: number; grupo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.cargaId) {
    return NextResponse.json({ error: "Falta cargaId" }, { status: 400 });
  }

  const result = await crearPostulacion(session.userId, {
    cargaId: body.cargaId,
    mensaje: body.mensaje ?? null,
    contactoEmail: body.contactoEmail ?? null,
    contactoTelefono: body.contactoTelefono ?? null,
    camionesCubiertos: Math.max(1, body.camionesCubiertos ?? 1),
    precioOfrecido: body.precioOfrecido ?? null,
    grupo: body.grupo,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    );
  }

  return NextResponse.json({ id: result.postulacionId }, { status: 201 });
}
