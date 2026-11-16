import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { VERIFICACION_TELEFONO_HABILITADA } from "@/lib/verificacion-telefono";
import { linkConfirmacion } from "@/lib/services/verificacion-telefono.service";

/** Link wa.me para confirmar el teléfono desde Mi cuenta (ver verificacion-telefono.service). */
export async function POST() {
  if (!VERIFICACION_TELEFONO_HABILITADA) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = linkConfirmacion(session.userId);
  if (!url) {
    return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 503 });
  }
  return NextResponse.json({ url });
}
