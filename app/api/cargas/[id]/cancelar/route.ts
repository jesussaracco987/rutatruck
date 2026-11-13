import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isEmpresa } from "@/lib/roles";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isEmpresa(session.role)) return NextResponse.json({ error: "Solo quien publica la carga puede hacer esto" }, { status: 403 });

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const carga = await db.carga.findUnique({
    where: { id: cargaId, empresaId: session.userId },
  });
  if (carga && carga.estado !== "ACTIVA" && carga.estado !== "PENDIENTE_PAGO") {
    return NextResponse.json({ error: "Carga no se puede cancelar en su estado actual" }, { status: 400 });
  }
  if (!carga) return NextResponse.json({ error: "Carga no encontrada o no se puede cancelar" }, { status: 404 });

  await db.carga.update({
    where: { id: cargaId },
    data: { estado: "CANCELADA" },
  });

  return NextResponse.json({ ok: true });
}
