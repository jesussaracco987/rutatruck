import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { crearPreferencia } from "@/lib/mercadopago";
import { getComisionConfig, calcularComisionPostulacion } from "@/lib/comision";
import { isTransportista } from "@/lib/roles";
import { findPostulacionConComisionPendiente } from "@/lib/repositories/postulacion.repository";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isTransportista(session.role)) {
    return NextResponse.json(
      { error: "Solo transportistas pueden pagar la comisión" },
      { status: 403 },
    );
  }

  let body: { cargaId: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // La comisión se paga por postulación: cada transportista aceptado en la
  // convocatoria paga la suya, no solo el escalar transportistaAsignadoId.
  const postulacion = await findPostulacionConComisionPendiente(body.cargaId, session.userId);
  if (!postulacion) {
    return NextResponse.json({ error: "No tenés una comisión pendiente en esta carga" }, { status: 404 });
  }

  const { carga } = postulacion;
  if (carga.transportistaPagoDeadline && carga.transportistaPagoDeadline < new Date()) {
    return NextResponse.json({ error: "El tiempo para pagar venció" }, { status: 400 });
  }

  const config = await getComisionConfig();
  const monto = calcularComisionPostulacion(config, carga.presupuesto, postulacion.camionesCubiertos);

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const externalReference = `comision_post_${postulacion.id}`;

  const preference = await crearPreferencia({
    items: [
      {
        id: postulacion.id.toString(),
        title: `Comisión: ${carga.titulo}`,
        description:
          postulacion.camionesCubiertos > 1
            ? `${carga.origen} → ${carga.destino} · ${postulacion.camionesCubiertos} camiones`
            : `${carga.origen} → ${carga.destino}`,
        quantity: 1,
        unit_price: monto,
        currency_id: "ARS",
      },
    ],
    external_reference: externalReference,
    back_urls: {
      success: `${origin}/api/pagos/success`,
      failure: `${origin}/api/pagos/failure`,
      pending: `${origin}/api/pagos/failure`,
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
