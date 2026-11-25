import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isEmpresa } from "@/lib/roles";
import { aceptarPostulacionesParaCarga } from "@/lib/services/postulacion.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isEmpresa(session.role)) {
    return NextResponse.json({ error: "Solo quien publica la carga puede hacer esto" }, { status: 403 });
  }

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // `postulacionId` (una) o `postulacionIds` (aceptar varias a la vez).
  let body: { postulacionId?: unknown; postulacionIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const ids = Array.isArray(body.postulacionIds) ? body.postulacionIds : [body.postulacionId];
  const result = await aceptarPostulacionesParaCarga(
    cargaId,
    session.userId,
    ids.map((id) => Number(id)),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    cubiertos: result.cubiertos,
    necesarios: result.necesarios,
    aceptadas: result.aceptadas,
  });
}
