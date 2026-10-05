import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findCargaIdDePostulacion } from "@/lib/repositories/postulacion.repository";

export async function GET(req: NextRequest) {
  const externalReference = req.nextUrl.searchParams.get("external_reference");

  if (externalReference) {
    const matchPublicar = externalReference.match(/^publicar_(\d+)$/);
    if (matchPublicar) {
      const cargaId = parseInt(matchPublicar[1]);
      await db.carga.deleteMany({
        where: { id: cargaId, estado: "PENDIENTE_PAGO" },
      });
      return NextResponse.redirect(
        new URL("/empresa/cargas/nueva?error=pago_cancelado", req.nextUrl),
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
