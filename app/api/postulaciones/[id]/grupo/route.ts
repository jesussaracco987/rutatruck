import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isTransportista } from "@/lib/roles";
import { quitarMiembroDelGrupo } from "@/lib/services/postulacion.service";

/** El líder saca de su grupo al miembro dueño de esta postulación. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isTransportista(session.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const postulacionId = parseInt((await params).id);
  if (isNaN(postulacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const result = await quitarMiembroDelGrupo(session.userId, postulacionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
