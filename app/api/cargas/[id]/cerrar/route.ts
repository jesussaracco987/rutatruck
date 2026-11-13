import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { cerrarConvocatoriaCarga } from "@/lib/services/carga.service";
import { isEmpresa } from "@/lib/roles";

export async function POST(
  _req: NextRequest,
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

  const result = await cerrarConvocatoriaCarga(cargaId, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
