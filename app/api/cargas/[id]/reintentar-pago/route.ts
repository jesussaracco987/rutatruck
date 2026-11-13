import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { crearPreferencia } from "@/lib/mercadopago";
import { getPrecioPublicacion } from "@/lib/comision";
import { isEmpresa } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isEmpresa(session.role)) return NextResponse.json({ error: "Solo quien publica la carga puede hacer esto" }, { status: 403 });

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const carga = await db.carga.findUnique({
    where: { id: cargaId, empresaId: session.userId, estado: "PENDIENTE_PAGO" },
  });
  if (!carga) return NextResponse.json({ error: "Carga no encontrada o ya fue pagada" }, { status: 404 });

  const fee = await getPrecioPublicacion();
  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;

  const preference = await crearPreferencia({
    items: [
      {
        id: carga.id.toString(),
        title: `Publicación de carga: ${carga.titulo}`,
        quantity: 1,
        unit_price: fee,
        currency_id: "ARS",
      },
    ],
    external_reference: `publicar_${carga.id}`,
    back_urls: {
      success: `${origin}/api/pagos/success`,
      failure: `${origin}/api/pagos/failure`,
      pending: `${origin}/api/pagos/success`,
    },
    auto_return: "approved",
    statement_descriptor: "ClickCargo",
  });

  const url =
    process.env.NODE_ENV === "production"
      ? preference.init_point
      : preference.sandbox_init_point;

  if (!url) return NextResponse.json({ error: "Error al crear preferencia de pago" }, { status: 500 });

  return NextResponse.json({ url });
}
