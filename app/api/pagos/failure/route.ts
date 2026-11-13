import { NextRequest, NextResponse } from "next/server";
import { findCargaIdDePostulacion } from "@/lib/repositories/postulacion.repository";

/**
 * Vuelta desde Mercado Pago cuando el pago se rechazó o se canceló. Es un GET
 * sin sesión que cualquiera puede armar, así que no modifica nada: la carga
 * queda en PENDIENTE_PAGO, la empresa puede reintentar el pago desde su
 * detalle y el cron cancela las que nunca se pagan.
 */
export async function GET(req: NextRequest) {
  const externalReference = req.nextUrl.searchParams.get("external_reference");

  if (externalReference) {
    const matchPublicar = externalReference.match(/^publicar_(\d+)$/);
    if (matchPublicar) {
      return NextResponse.redirect(
        new URL(`/empresa/cargas/${parseInt(matchPublicar[1])}?error=pago_cancelado`, req.nextUrl),
      );
    }

    const matchComision = externalReference.match(/^comision_post_(\d+)$/);
    if (matchComision) {
      const cargaId = await findCargaIdDePostulacion(parseInt(matchComision[1]));
      return NextResponse.redirect(
        new URL(
          cargaId !== null
            ? `/transportista/cargas/${cargaId}?error=pago_cancelado`
            : "/transportista/postulaciones",
          req.nextUrl,
        ),
      );
    }
  }

  return NextResponse.redirect(new URL("/empresa/cargas", req.nextUrl));
}
