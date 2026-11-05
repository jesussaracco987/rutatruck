import { NextRequest, NextResponse } from "next/server";
import { claveVisitante, consumirLimite } from "@/lib/limite-uso";
import { idConversacionValido, registrarPaso } from "@/lib/services/conversacion-chat.service";

/** Avance del chat después del resumen. Solo métricas: el navegador no espera la respuesta. */
export async function POST(req: NextRequest) {
  let body: { conversacionId?: unknown; paso?: unknown; borrador?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const { conversacionId, paso } = body;
  if (!idConversacionValido(conversacionId) || (paso !== "mapa" && paso !== "contacto")) {
    return new NextResponse(null, { status: 400 });
  }
  if (!(await consumirLimite(`seguimiento:${claveVisitante(req)}`, 60))) {
    return new NextResponse(null, { status: 429 });
  }
  await registrarPaso(conversacionId, paso, body.borrador);
  return new NextResponse(null, { status: 204 });
}
