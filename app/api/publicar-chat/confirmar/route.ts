import { NextRequest, NextResponse } from "next/server";
import { claveVisitante, consumirLimite } from "@/lib/limite-uso";
import { confirmarPublicacion } from "@/lib/services/publicar-chat.service";
import { registrarPublicada } from "@/lib/services/conversacion-chat.service";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!(await consumirLimite(`confirmar:${claveVisitante(req)}`, 20))) {
    return NextResponse.json({ error: "Demasiados intentos. Probá en un rato." }, { status: 429 });
  }

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const resultado = await confirmarPublicacion(body, origin);

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, cuentaCreada: "cuentaCreada" in resultado },
      { status: resultado.status },
    );
  }
  await registrarPublicada(body.conversacionId, "cargaId" in resultado ? resultado.cargaId : undefined);
  return NextResponse.json(
    "cargaId" in resultado ? { cargaId: resultado.cargaId } : { url: resultado.url },
    { status: 201 },
  );
}
