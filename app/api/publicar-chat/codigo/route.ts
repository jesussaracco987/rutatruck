import { NextRequest, NextResponse } from "next/server";
import { claveVisitante, consumirLimite } from "@/lib/limite-uso";
import { enviarCodigoPublicacion, normalizarEmail } from "@/lib/services/publicar-chat.service";

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const email = normalizarEmail(body.email);
  if (!email) return NextResponse.json({ error: "Ingresá tu email" }, { status: 400 });

  // Por visitante y por casilla: frena tanto el abuso como el bombardeo a un tercero.
  const permitido =
    (await consumirLimite(`codigo-ip:${claveVisitante(req)}`, 10)) &&
    (await consumirLimite(`codigo-email:${email}`, 5));
  if (!permitido) {
    return NextResponse.json({ error: "Pediste demasiados códigos. Probá en un rato." }, { status: 429 });
  }

  const resultado = await enviarCodigoPublicacion(email);
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  // Misma respuesta exista o no la cuenta: no revela qué emails están registrados.
  return NextResponse.json({ ok: true });
}
