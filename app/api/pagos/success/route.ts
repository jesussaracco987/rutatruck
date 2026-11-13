import { NextRequest, NextResponse } from "next/server";
import {
  confirmarPagoPublicacion,
  confirmarPagoComision,
  verificarPagoAprobado,
} from "@/lib/services/pago.service";
import { findCargaIdDePostulacion } from "@/lib/repositories/postulacion.repository";
import { registrarEvento } from "@/lib/analytics";

/**
 * Vuelta desde Mercado Pago (back_urls success y pending). Los parámetros de la
 * URL no se usan como prueba de pago: el `status` se ignora y el pago se
 * consulta al proveedor (verificarPagoAprobado). Si todavía no está aprobado
 * (pendiente, en proceso o un link armado a mano) no se toca nada y el usuario
 * ve el estado de su carga; el webhook la activa cuando se acredite.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const externalReference = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id") ?? searchParams.get("collection_id");

  if (!externalReference) {
    return NextResponse.redirect(new URL("/empresa/cargas", req.nextUrl));
  }

  const pagoVerificado =
    paymentId && paymentId !== "null"
      ? await verificarPagoAprobado(paymentId, externalReference)
      : null;

  // Publicación de carga: "publicar_{cargaId}"
  const matchPublicar = externalReference.match(/^publicar_(\d+)$/);
  if (matchPublicar) {
    const cargaId = parseInt(matchPublicar[1]);
    if (!pagoVerificado) {
      return NextResponse.redirect(
        new URL(`/empresa/cargas/${cargaId}?error=pago_pendiente`, req.nextUrl),
      );
    }
    const result = await confirmarPagoPublicacion(cargaId, pagoVerificado);
    if (!result.ok) {
      return NextResponse.redirect(new URL("/empresa/cargas?error=pago", req.nextUrl));
    }
    await registrarEvento("carga_publicada");
    return NextResponse.redirect(new URL("/empresa/cargas?success=1", req.nextUrl));
  }

  // Comisión transportista: "comision_post_{postulacionId}"
  const matchComision = externalReference.match(/^comision_post_(\d+)$/);
  if (matchComision) {
    const postulacionId = parseInt(matchComision[1]);
    if (!pagoVerificado) {
      const cargaId = await findCargaIdDePostulacion(postulacionId);
      return NextResponse.redirect(
        new URL(
          cargaId !== null
            ? `/transportista/cargas/${cargaId}?error=pago_pendiente`
            : "/transportista/postulaciones",
          req.nextUrl,
        ),
      );
    }
    const result = await confirmarPagoComision(postulacionId, pagoVerificado);
    if (!result.ok) {
      return NextResponse.redirect(
        new URL(
          // Con carga: el pago se acreditó pero la postulación ya había quedado
          // afuera por vencimiento del plazo.
          result.cargaId !== null
            ? `/transportista/cargas/${result.cargaId}?error=pago_fuera_de_termino`
            : "/transportista/postulaciones",
          req.nextUrl,
        ),
      );
    }
    return NextResponse.redirect(
      new URL(`/transportista/cargas/${result.cargaId}?pago=1`, req.nextUrl),
    );
  }

  return NextResponse.redirect(new URL("/empresa/cargas", req.nextUrl));
}
