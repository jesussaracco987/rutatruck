import { NextRequest, NextResponse } from "next/server";
import { claveVisitante, consumirLimite, hayCupoIA, registrarTokensIA } from "@/lib/limite-uso";
import { AsistenteNoDisponible, interpretarPedido } from "@/lib/asistente-carga";
import { getSession } from "@/lib/dal";
import { idConversacionValido, registrarFallo, registrarTurno } from "@/lib/services/conversacion-chat.service";
import {
  MAX_LARGO_MENSAJE,
  MAX_MENSAJES,
  MAX_PREGUNTAS,
  camposFaltantes,
  sanitizarBorrador,
  type CampoRequerido,
  type MensajeChat,
} from "@/lib/chat-carga";

const MENSAJES_POR_HORA = 30;

/** Por si el modelo no pregunta nada y todavía falta un dato obligatorio. */
const PREGUNTA_POR_CAMPO: Record<CampoRequerido, string> = {
  origen: "¿Desde dónde sale la carga?",
  destino: "¿A dónde va?",
  tipoCarga: "¿Qué tipo de carga es?",
  fechaCarga: "¿Para qué fecha la necesitás?",
};

const textoValido = (t: unknown): t is string =>
  typeof t === "string" && t.trim() !== "" && t.length <= MAX_LARGO_MENSAJE;

/** Se rearma cada mensaje: del navegador solo pasan los campos conocidos. */
function parseMensajes(raw: unknown): MensajeChat[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MENSAJES) return null;
  const validos = raw.every(
    (m) =>
      (m?.rol === "usuario" || m?.rol === "asistente") &&
      textoValido(m.texto) &&
      (m.dictado === undefined || textoValido(m.dictado)),
  );
  if (!validos || raw[raw.length - 1].rol !== "usuario") return null;
  return raw.map((m) => ({ rol: m.rol, texto: m.texto, ...(m.dictado ? { dictado: m.dictado } : {}) }));
}

export async function POST(req: NextRequest) {
  let body: { mensajes?: unknown; borrador?: unknown; conversacionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const mensajes = parseMensajes(body.mensajes);
  if (!mensajes) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });

  const conversacionId = idConversacionValido(body.conversacionId) ? body.conversacionId : null;
  const visitante = claveVisitante(req);
  const userId = conversacionId ? ((await getSession())?.userId ?? null) : null;
  const sinAsistente = async (error: string, status: number, motivo: string) => {
    if (conversacionId) await registrarFallo({ id: conversacionId, visitante, userId, mensajes, motivo });
    return NextResponse.json({ error, fallback: true }, { status });
  };

  if (!(await consumirLimite(`chat:${visitante}`, MENSAJES_POR_HORA))) {
    return sinAsistente("Llegaste al límite de mensajes por ahora.", 429, "limite_visitante");
  }
  if (!(await hayCupoIA())) return sinAsistente("El asistente no está disponible por ahora.", 503, "tope_diario");

  try {
    const resultado = await interpretarPedido(mensajes, sanitizarBorrador(body.borrador));
    await registrarTokensIA(resultado.tokens);

    const faltan = camposFaltantes(resultado.borrador);
    const preguntasHechas = mensajes.filter((m) => m.rol === "asistente").length;
    // Sin preguntas disponibles se pasa igual al resumen, donde se completa a mano.
    const listo = faltan.length === 0 || preguntasHechas >= MAX_PREGUNTAS;
    const pregunta = listo ? null : (resultado.pregunta ?? PREGUNTA_POR_CAMPO[faltan[0]]);

    if (conversacionId) {
      await registrarTurno({
        id: conversacionId,
        visitante,
        userId,
        // Con la pregunta que se va a mostrar: así la conversación guardada queda completa.
        mensajes: pregunta ? [...mensajes, { rol: "asistente", texto: pregunta }] : mensajes,
        borrador: resultado.borrador,
        tokens: resultado.tokens,
        listo,
      });
    }

    return NextResponse.json({
      borrador: resultado.borrador,
      listo,
      pregunta,
    });
  } catch (err) {
    if (!(err instanceof AsistenteNoDisponible)) throw err;
    console.error("[publicar-chat] Asistente:", err.message);
    return sinAsistente("El asistente no está disponible por ahora.", 503, "openai");
  }
}
