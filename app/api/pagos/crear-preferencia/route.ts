import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { crearPreferencia } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.role !== "EMPRESA") {
    return NextResponse.json(
      { error: "Tu cuenta no está habilitada para este pago" },
      { status: 403 },
    );
  }

  let body: { cargaId: number; postulacionId: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const carga = await db.carga.findUnique({
    where: { id: body.cargaId, empresaId: session.userId, estado: "ACTIVA" },
  });

  if (!carga) {
    return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 });
  }

  if (!carga.presupuesto) {
    return NextResponse.json(
      { error: "La carga no tiene presupuesto definido" },
      { status: 400 },
    );
  }

  const postulacion = await db.postulacion.findUnique({
    where: {
      id: body.postulacionId,
      cargaId: body.cargaId,
      estado: "PENDIENTE",
    },
    include: { transportista: { select: { name: true } } },
  });

  if (!postulacion) {
    return NextResponse.json(
      { error: "Postulación no encontrada" },
      { status: 404 },
    );
  }

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const externalReference = `carga_${carga.id}_post_${postulacion.id}`;

  const preference = await crearPreferencia({
    items: [
      {
        id: carga.id.toString(),
        title: `Transporte: ${carga.titulo}`,
        description: `Transportista: ${postulacion.transportista.name}`,
        quantity: 1,
        unit_price: carga.presupuesto,
        currency_id: "ARS",
      },
    ],
    external_reference: externalReference,
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

  if (!url) {
    return NextResponse.json(
      { error: "Error al crear preferencia de pago" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url });
}
