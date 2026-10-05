import { NextRequest, NextResponse } from "next/server";
import { confirmarPagoPublicacion, confirmarPagoComision } from "@/lib/services/pago.service";
import { registrarEvento } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const externalReference = searchParams.get("external_reference");
  const status = searchParams.get("status") ?? searchParams.get("collection_status");
  const paymentId = searchParams.get("payment_id") ?? searchParams.get("collection_id");

  if (!externalReference || status !== "approved") {
    return NextResponse.redirect(
      new URL(`/api/pagos/failure?external_reference=${externalReference ?? ""}`, req.nextUrl),
    );
  }

  // Publicación de carga: "publicar_{cargaId}"
  const matchPublicar = externalReference.match(/^publicar_(\d+)$/);
  if (matchPublicar) {
    const cargaId = parseInt(matchPublicar[1]);
    const result = await confirmarPagoPublicacion(cargaId, paymentId ?? null);
    if (!result.ok) {
      return NextResponse.redirect(new URL("/empresa/cargas?error=pago", req.nextUrl));
    }
    await registrarEvento("carga_publicada");
    return NextResponse.redirect(new URL("/empresa/cargas?success=1", req.nextUrl));
  }

  // Comisión transportista: "comision_post_{postulacionId}"
  const matchComision = externalReference.match(/^comision_post_(\d+)$/);
  if (matchComision) {
    const result = await confirmarPagoComision(parseInt(matchComision[1]), paymentId ?? null);
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
