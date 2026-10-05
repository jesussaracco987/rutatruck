import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { resolverRondaPago } from "@/lib/services/comision.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ estado: null });

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) return NextResponse.json({ estado: null });

  const carga = await db.carga.findUnique({
    where: { id: cargaId },
    select: { estado: true },
  });

  if (!carga) return NextResponse.json({ estado: null });

  // Resolución perezosa de la ronda de cobro: la cierra si ya pagaron todos o
  // la expira si venció el plazo.
  if (carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA") {
    await resolverRondaPago(cargaId);
    const actual = await db.carga.findUnique({ where: { id: cargaId }, select: { estado: true } });
    return NextResponse.json({ estado: actual?.estado ?? null });
  }

  return NextResponse.json({ estado: carga.estado });
}
