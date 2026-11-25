import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isEmpresa } from "@/lib/roles";
import { enviarMensajeATodos } from "@/lib/services/mensaje.service";

/** Quien publica le escribe lo mismo a todos los transportistas aceptados de la carga. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isEmpresa(session.role)) {
    return NextResponse.json({ error: "Solo quien publica la carga puede hacer esto" }, { status: 403 });
  }

  const cargaId = parseInt((await params).id);
  if (isNaN(cargaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  let body: { cuerpo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const result = await enviarMensajeATodos(cargaId, session.userId, typeof body.cuerpo === "string" ? body.cuerpo : "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, enviados: result.enviados });
}
