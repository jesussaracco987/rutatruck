import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { sanitizarBorrador, type BorradorCarga, type MensajeChat } from "@/lib/chat-carga";

/**
 * Registro de las conversaciones con el asistente, para ver dónde se equivoca.
 * No llama a OpenAI: son escrituras en la base y no suman gasto de API.
 *
 * Nada de esto puede romper la publicación: cada función atrapa sus errores.
 */

const PASOS = ["chat", "resumen", "mapa", "contacto", "publicada"] as const;
export type PasoConversacion = (typeof PASOS)[number];

export const DIAS_RETENCION_CONVERSACIONES = 90;

/** UUID del navegador. Lo que no tenga esa forma no se registra. */
export const idConversacionValido = (id: unknown): id is string =>
  typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);

const avanza = (actual: string, nuevo: PasoConversacion) =>
  PASOS.indexOf(nuevo) > PASOS.indexOf(actual as PasoConversacion) ? nuevo : actual;

const normalizar = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Campos del borrador que la persona cambió respecto de lo que armó el asistente. */
export function camposDistintos(asistente: BorradorCarga, confirmado: BorradorCarga): string[] {
  return (Object.keys(confirmado) as (keyof BorradorCarga)[]).filter((k) => {
    const a = asistente[k];
    const c = confirmado[k];
    if (typeof a === "string" && typeof c === "string") return normalizar(a) !== normalizar(c);
    return a !== c;
  });
}

async function registrar(nombre: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[conversacion-chat] ${nombre}:`, err);
  }
}

/** Después de cada respuesta del asistente. Los mensajes llegan completos en cada pedido. */
export function registrarTurno(datos: {
  id: string;
  visitante: string;
  userId: string | null;
  mensajes: MensajeChat[];
  borrador: BorradorCarga;
  tokens: number;
  listo: boolean;
}) {
  const usuario = datos.mensajes.filter((m) => m.rol === "usuario");
  const conAudio = usuario.filter((m) => m.dictado);
  const resumen = {
    mensajes: datos.mensajes as unknown as Prisma.InputJsonValue,
    borradorAsistente: datos.borrador as unknown as Prisma.InputJsonValue,
    preguntas: datos.mensajes.filter((m) => m.rol === "asistente").length,
    audios: conAudio.length,
    audiosCorregidos: conAudio.filter((m) => normalizar(m.texto) !== normalizar(m.dictado ?? "")).length,
    fallo: null,
  };

  return registrar("turno", async () => {
    const previa = await db.conversacionChat.findUnique({ where: { id: datos.id }, select: { pasoMaximo: true } });
    const pasoMaximo = datos.listo ? avanza(previa?.pasoMaximo ?? "chat", "resumen") : (previa?.pasoMaximo ?? "chat");
    await db.conversacionChat.upsert({
      where: { id: datos.id },
      create: {
        id: datos.id,
        visitante: datos.visitante,
        userId: datos.userId,
        origen: datos.userId ? "panel" : "home",
        tokens: datos.tokens,
        pasoMaximo,
        ...resumen,
      },
      update: { ...resumen, pasoMaximo, tokens: { increment: datos.tokens } },
    });
  });
}

/** El asistente no respondió (límite o OpenAI caído): se ofreció el formulario. */
export function registrarFallo(datos: {
  id: string;
  visitante: string;
  userId: string | null;
  mensajes: MensajeChat[];
  motivo: string;
}) {
  return registrar("fallo", () =>
    db.conversacionChat.upsert({
      where: { id: datos.id },
      // Si falla el primer mensaje, la conversación igual cuenta: es alguien que no pudo usar el chat.
      create: {
        id: datos.id,
        visitante: datos.visitante,
        userId: datos.userId,
        origen: datos.userId ? "panel" : "home",
        mensajes: datos.mensajes as unknown as Prisma.InputJsonValue,
        fallo: datos.motivo,
      },
      update: { fallo: datos.motivo },
    }),
  );
}

/**
 * Avance del navegador. Al pasar del resumen al mapa llega el borrador tal como
 * lo dejó la persona: la diferencia con el del asistente son sus correcciones.
 */
export function registrarPaso(id: string, paso: "mapa" | "contacto", borradorRaw?: unknown) {
  return registrar("paso", async () => {
    const conv = await db.conversacionChat.findUnique({
      where: { id },
      select: { pasoMaximo: true, borradorAsistente: true },
    });
    if (!conv) return;

    const data: Prisma.ConversacionChatUpdateInput = { pasoMaximo: avanza(conv.pasoMaximo, paso) };
    if (paso === "mapa" && borradorRaw !== undefined && conv.borradorAsistente) {
      const confirmado = sanitizarBorrador(borradorRaw);
      data.borradorConfirmado = confirmado as unknown as Prisma.InputJsonValue;
      data.camposCorregidos = camposDistintos(sanitizarBorrador(conv.borradorAsistente), confirmado);
    }
    await db.conversacionChat.update({ where: { id }, data });
  });
}

/** Sin `cargaId` cuando la publicación siguió a MercadoPago: la conversación igual terminó. */
export function registrarPublicada(id: unknown, cargaId?: number) {
  if (!idConversacionValido(id)) return Promise.resolve();
  return registrar("publicada", () =>
    db.conversacionChat.updateMany({ where: { id }, data: { pasoMaximo: "publicada", cargaId: cargaId ?? null } }),
  );
}

export async function borrarConversacionesViejas() {
  const limite = new Date(Date.now() - DIAS_RETENCION_CONVERSACIONES * 24 * 60 * 60 * 1000);
  const { count } = await db.conversacionChat.deleteMany({ where: { creadaEn: { lt: limite } } });
  return count;
}
