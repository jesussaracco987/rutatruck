import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isEmpresa } from "@/lib/roles";
import { marcarPostulacionesVistasEmpresa } from "@/lib/services/postulacion.service";
import { marcarDisponibilidadesVistas } from "@/lib/repositories/disponibilidad.repository";

export async function POST() {
  const session = await getSession();
  if (!session || !isEmpresa(session.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Primero las disponibilidades: marcar las postulaciones emite el evento que
  // recalcula el contador por SSE, y tiene que encontrar ambas ya vistas.
  await marcarDisponibilidadesVistas(session.userId);
  await marcarPostulacionesVistasEmpresa(session.userId);

  return NextResponse.json({ ok: true });
}
