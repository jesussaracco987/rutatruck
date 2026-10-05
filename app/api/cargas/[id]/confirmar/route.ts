import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isEmpresa } from "@/lib/roles";
import { registrarEvento } from "@/lib/analytics";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isEmpresa(session.role)) return NextResponse.json({ error: "Solo empresas" }, { status: 403 });

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const carga = await db.carga.findUnique({
    where: { id: cargaId, empresaId: session.userId, estado: "EN_CONFIRMACION" },
  });
  if (!carga) return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 });

  await db.carga.update({
    where: { id: cargaId },
    data: { estado: "FINALIZADA", finalizadaEn: new Date() },
  });
  await registrarEvento("viaje_concretado", { rol: "empresa" });

  return NextResponse.json({ ok: true });
}
