import { NextRequest, NextResponse } from "next/server";
import { claveVisitante, consumirLimite, hayCupoIA, registrarTokensIA } from "@/lib/limite-uso";
import { AsistenteNoDisponible } from "@/lib/asistente-carga";
import { MAX_BYTES_AUDIO, extensionAudio, transcribirAudio } from "@/lib/transcribir-audio";

const AUDIOS_POR_HORA = 20;

export async function POST(req: NextRequest) {
  // Se corta antes de leer el cuerpo: no tiene sentido recibir un archivo enorme para rechazarlo.
  if (Number(req.headers.get("content-length")) > MAX_BYTES_AUDIO) {
    return NextResponse.json({ error: "El audio es demasiado largo. Probá con uno más corto." }, { status: 413 });
  }

  let audio: FormDataEntryValue | null;
  try {
    audio = (await req.formData()).get("audio");
  } catch {
    return NextResponse.json({ error: "No llegó el audio" }, { status: 400 });
  }
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No llegó el audio" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES_AUDIO) {
    return NextResponse.json({ error: "El audio es demasiado largo. Probá con uno más corto." }, { status: 413 });
  }
  const extension = extensionAudio(audio.type);
  if (!extension) return NextResponse.json({ error: "Formato de audio no soportado" }, { status: 415 });

  if (!(await consumirLimite(`audio:${claveVisitante(req)}`, AUDIOS_POR_HORA))) {
    return NextResponse.json({ error: "Llegaste al límite de audios por ahora. Escribilo." }, { status: 429 });
  }
  if (!(await hayCupoIA())) {
    return NextResponse.json({ error: "El audio no está disponible por ahora. Escribilo." }, { status: 503 });
  }

  try {
    const { texto, tokens } = await transcribirAudio(audio, extension);
    await registrarTokensIA(tokens);
    if (!texto) return NextResponse.json({ error: "No se entendió el audio. Probá de nuevo." }, { status: 422 });
    return NextResponse.json({ texto });
  } catch (err) {
    if (!(err instanceof AsistenteNoDisponible)) throw err;
    console.error("[publicar-chat] Transcripción:", err.message);
    return NextResponse.json({ error: "El audio no está disponible por ahora. Escribilo." }, { status: 503 });
  }
}
