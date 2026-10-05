import { db } from "@/lib/db";
import { esChatVigente, whereChatVigente, labelChatPorVencer, CHAT_RETENCION_FINALIZADA_MS } from "@/lib/chat";
import { esMatchConfirmado, whereMatchConfirmado } from "@/lib/match";

// El chat se abre recién con el match confirmado (ver lib/match.ts): antes, las
// partes podrían pasarse el contacto y cerrar el viaje por fuera de la app.

export async function crearMensaje(postulacionId: number, autorId: string, cuerpo: string) {
  return db.mensaje.create({ data: { postulacionId, autorId, cuerpo } });
}

/**
 * Los mensajes del hilo. Sin cursor devuelve la ÚLTIMA página, no la primera:
 * ordenar ascendente con `take` traía los 200 mensajes más viejos y escondía
 * los recientes en cuanto una conversación pasaba ese largo.
 */
export async function findMensajesDeHilo(postulacionId: number, sinceId?: number, limit = 200) {
  if (sinceId) {
    return db.mensaje.findMany({
      where: { postulacionId, id: { gt: sinceId } },
      orderBy: { id: "asc" },
      take: limit,
    });
  }

  const ultimos = await db.mensaje.findMany({
    where: { postulacionId },
    orderBy: { id: "desc" },
    take: limit,
  });
  return ultimos.reverse();
}

export async function marcarLeidos(postulacionId: number, userId: string) {
  const { count } = await db.mensaje.updateMany({
    where: { postulacionId, autorId: { not: userId }, leidoEn: null },
    data: { leidoEn: new Date() },
  });
  return count;
}

export async function countMensajesNoLeidos(userId: string, role: "empresa" | "transportista") {
  return db.mensaje.count({
    where: {
      autorId: { not: userId },
      leidoEn: null,
      postulacion:
        role === "empresa"
          ? { estado: "ACEPTADA", carga: { empresaId: userId } }
          : { estado: "ACEPTADA", transportistaId: userId },
    },
  });
}

/**
 * El hilo, con los datos de la contraparte, solo si `userId` es una de las dos
 * partes: el transportista de la postulación o la empresa dueña de la carga.
 *
 * Exige `estado: ACEPTADA` para ambos lados. Antes la empresa entraba con solo
 * ser dueña de la carga, así que al cancelarse —lo que manda todas las
 * postulaciones a RECHAZADA— el transportista quedaba afuera pero la empresa
 * seguía pudiendo escribir mensajes que ya no le llegaban a nadie.
 */
export async function findPostulacionParaChat(postulacionId: number, userId: string) {
  const postulacion = await db.postulacion.findUnique({
    where: { id: postulacionId },
    select: {
      id: true,
      estado: true,
      matchConfirmadoEn: true,
      transportistaId: true,
      transportista: { select: { name: true } },
      carga: {
        select: {
          id: true,
          titulo: true,
          origen: true,
          destino: true,
          estado: true,
          finalizadaEn: true,
          empresaId: true,
          empresa: { select: { name: true } },
        },
      },
    },
  });
  if (!postulacion) return null;
  if (postulacion.estado !== "ACEPTADA") return null;
  if (postulacion.transportistaId !== userId && postulacion.carga.empresaId !== userId) return null;
  if (!esMatchConfirmado(postulacion)) return null;
  if (!esChatVigente(postulacion.carga)) return null;
  return postulacion;
}

/** La postulación aceptada de un transportista en una carga, para linkear al hilo desde la carga. */
export async function findPostulacionAceptadaDeTransportista(cargaId: number, transportistaId: string) {
  return db.postulacion.findFirst({
    where: { cargaId, transportistaId, estado: "ACEPTADA" },
    select: { id: true },
  });
}

/** Borra los mensajes de cargas FINALIZADA hace más de 24h. Se llama desde un cron ya existente. */
export async function eliminarMensajesFinalizadosVencidos() {
  const cutoff = new Date(Date.now() - CHAT_RETENCION_FINALIZADA_MS);
  const { count } = await db.mensaje.deleteMany({
    where: { postulacion: { carga: { estado: "FINALIZADA", finalizadaEn: { lt: cutoff } } } },
  });
  return count;
}

export type ConversacionResumen = {
  postulacionId: number;
  cargaId: number;
  titulo: string;
  origen: string;
  destino: string;
  estado: string;
  contraparteNombre: string;
  ultimoMensaje: string | null;
  ultimoMensajeEn: Date;
  noLeidos: number;
  avisoVencimiento: string | null;
};

/**
 * Una fila por hilo, o sea por postulación aceptada. Para una empresa con una
 * convocatoria de tres camiones eso son tres conversaciones distintas sobre la
 * misma carga, una por transportista.
 */
export async function findConversaciones(
  userId: string,
  role: "empresa" | "transportista",
): Promise<ConversacionResumen[]> {
  const postulaciones = await db.postulacion.findMany({
    where: {
      estado: "ACEPTADA",
      ...whereMatchConfirmado(),
      ...(role === "empresa"
        ? { carga: { empresaId: userId, ...whereChatVigente() } }
        : { transportistaId: userId, carga: whereChatVigente() }),
    },
    select: {
      id: true,
      transportista: { select: { name: true } },
      carga: {
        select: {
          id: true,
          titulo: true,
          origen: true,
          destino: true,
          estado: true,
          updatedAt: true,
          finalizadaEn: true,
          empresa: { select: { name: true } },
        },
      },
    },
  });

  if (postulaciones.length === 0) return [];

  const ids = postulaciones.map((p) => p.id);

  // Agregados en la base en vez de traerse todos los mensajes a memoria como
  // antes. Se evita `distinct` a propósito: según el conector Prisma lo puede
  // resolver en memoria, que es exactamente lo que se quiere evitar acá.
  const [ultimoDeCadaHilo, noLeidos] = await Promise.all([
    db.mensaje.groupBy({
      by: ["postulacionId"],
      where: { postulacionId: { in: ids } },
      _max: { id: true },
    }),
    db.mensaje.groupBy({
      by: ["postulacionId"],
      where: { postulacionId: { in: ids }, autorId: { not: userId }, leidoEn: null },
      _count: { _all: true },
    }),
  ]);

  const ultimosIds = ultimoDeCadaHilo
    .map((g) => g._max.id)
    .filter((id): id is number => id !== null);

  const ultimos = ultimosIds.length
    ? await db.mensaje.findMany({
        where: { id: { in: ultimosIds } },
        select: { postulacionId: true, cuerpo: true, creadoEn: true },
      })
    : [];


  const ultimoPorHilo = new Map(ultimos.map((m) => [m.postulacionId, m]));
  const noLeidosPorHilo = new Map(noLeidos.map((g) => [g.postulacionId, g._count._all]));

  return postulaciones
    .map((p) => {
      const ultimo = ultimoPorHilo.get(p.id);
      return {
        postulacionId: p.id,
        cargaId: p.carga.id,
        titulo: p.carga.titulo,
        origen: p.carga.origen,
        destino: p.carga.destino,
        estado: p.carga.estado,
        contraparteNombre: role === "empresa" ? p.transportista.name : p.carga.empresa.name,
        ultimoMensaje: ultimo?.cuerpo ?? null,
        ultimoMensajeEn: ultimo?.creadoEn ?? p.carga.updatedAt,
        noLeidos: noLeidosPorHilo.get(p.id) ?? 0,
        avisoVencimiento: labelChatPorVencer(p.carga),
      };
    })
    .sort((a, b) => b.ultimoMensajeEn.getTime() - a.ultimoMensajeEn.getTime());
}

/** Mensajes que este autor escribió desde `desde`, para el límite de envío. */
export async function contarMensajesRecientesDeAutor(autorId: string, desde: Date) {
  return db.mensaje.count({ where: { autorId, creadoEn: { gte: desde } } });
}

/**
 * Chequeo mínimo de pertenencia al hilo. Lo usa el ping de "está escribiendo",
 * que se dispara cada 2s mientras alguien teclea: resolverlo con
 * findPostulacionParaChat traía la carga entera y los nombres de las dos partes
 * para una señal efímera que ni siquiera se persiste.
 */
export async function esParteDelHilo(postulacionId: number, userId: string) {
  const encontrada = await db.postulacion.findFirst({
    where: {
      id: postulacionId,
      estado: "ACEPTADA",
      ...whereMatchConfirmado(),
      carga: whereChatVigente(),
      OR: [{ transportistaId: userId }, { carga: { empresaId: userId } }],
    },
    select: { id: true },
  });
  return encontrada !== null;
}
