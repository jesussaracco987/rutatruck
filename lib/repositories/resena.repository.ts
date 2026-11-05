import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Carga finalizada con los transportistas que efectivamente hicieron el viaje.
 * Es la base para decidir quién puede reseñar a quién: la empresa es
 * `empresaId` y las contrapartes son las postulaciones ACEPTADA (el escalar
 * `transportistaAsignadoId` solo guarda a uno cuando son varios camiones).
 */
export async function findCargaFinalizadaConPartes(cargaId: number) {
  return db.carga.findUnique({
    where: { id: cargaId },
    select: {
      id: true,
      titulo: true,
      estado: true,
      empresaId: true,
      postulaciones: {
        where: { estado: "ACEPTADA" },
        select: { transportistaId: true },
      },
    },
  });
}

export async function crearResena(data: Prisma.ResenaUncheckedCreateInput) {
  return db.resena.create({ data });
}

/** La reseña que la contraparte ya escribió sobre el autor en esta carga. */
export async function findResenaReciproca(
  cargaId: number,
  autorId: string,
  destinatarioId: string,
) {
  return db.resena.findUnique({
    where: {
      cargaId_autorId_destinatarioId: {
        cargaId,
        autorId: destinatarioId,
        destinatarioId: autorId,
      },
    },
    select: { id: true, autorId: true, destinatarioId: true, publicadaEn: true },
  });
}

/** Reseñas que el usuario escribió en una carga, para no ofrecer el formulario dos veces. */
export async function findResenasEscritasEnCarga(cargaId: number, autorId: string) {
  return db.resena.findMany({
    where: { cargaId, autorId },
    select: { id: true, destinatarioId: true, promedio: true, publicadaEn: true },
  });
}

export async function publicarResenas(ids: number[], ahora: Date) {
  if (ids.length === 0) return;
  await db.resena.updateMany({
    where: { id: { in: ids }, publicadaEn: null },
    data: { publicadaEn: ahora },
  });
}

/** Reseñas sin publicar cuya ventana de doble ciego ya venció. */
export async function findResenasVencidasSinPublicar(limite: Date) {
  return db.resena.findMany({
    where: { publicadaEn: null, creadaEn: { lte: limite } },
    select: { id: true, destinatarioId: true },
  });
}

/**
 * Recalcula el promedio del usuario desde las reseñas publicadas. Se recalcula
 * en vez de acumular para que el número sobreviva a borrados y correcciones.
 */
export async function recalcularRatingUsuario(userId: string) {
  const agg = await db.resena.aggregate({
    where: { destinatarioId: userId, publicadaEn: { not: null } },
    _avg: { promedio: true },
    _count: { _all: true },
  });

  await db.user.update({
    where: { id: userId },
    data: {
      ratingPromedio: agg._count._all > 0 ? agg._avg.promedio : null,
      ratingCantidad: agg._count._all,
    },
  });
}

export async function findResenasPublicadasDe(destinatarioId: string, take = 10) {
  return db.resena.findMany({
    where: { destinatarioId, publicadaEn: { not: null } },
    orderBy: { publicadaEn: "desc" },
    take,
    select: {
      id: true,
      tipo: true,
      comunicacion: true,
      cumplioFecha: true,
      integridadCarga: true,
      pagoEnTiempo: true,
      datosReales: true,
      promedio: true,
      comentario: true,
      publicadaEn: true,
      autor: { select: { name: true } },
      carga: { select: { id: true, titulo: true } },
    },
  });
}

export async function findRatingsDeUsuarios(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, ratingPromedio: true, ratingCantidad: true, emailVerified: true },
  });
}

export type ConfianzaTransportista = {
  ratingPromedio: number | null;
  ratingCantidad: number;
  emailVerified: boolean;
  /** ISO: desde cuándo tiene cuenta. */
  miembroDesde: string | null;
  viajesRealizados: number;
  esFlota: boolean;
};

/**
 * Lo que el mapa de transportistas muestra para elegir a quién escribirle sin
 * revelar quién es: reputación, antigüedad y viajes hechos en la app. Nada de
 * nombre ni contacto (ver app/(empresa)/empresa/transportistas/page.tsx).
 */
export async function findConfianzaTransportistas(
  userIds: string[],
): Promise<Map<string, ConfianzaTransportista>> {
  if (userIds.length === 0) return new Map();
  const [usuarios, viajes] = await Promise.all([
    db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, ratingPromedio: true, ratingCantidad: true, emailVerified: true, createdAt: true, esFlota: true },
    }),
    // Mismo criterio que contarViajesFinalizados: postulaciones aceptadas de cargas finalizadas.
    db.postulacion.groupBy({
      by: ["transportistaId"],
      where: { transportistaId: { in: userIds }, estado: "ACEPTADA", carga: { estado: "FINALIZADA" } },
      _count: { _all: true },
    }),
  ]);
  const viajesPorId = new Map(viajes.map((v) => [v.transportistaId, v._count._all]));
  return new Map(
    usuarios.map((u) => [
      u.id,
      {
        ratingPromedio: u.ratingPromedio,
        ratingCantidad: u.ratingCantidad,
        emailVerified: u.emailVerified,
        miembroDesde: u.createdAt.toISOString(),
        viajesRealizados: viajesPorId.get(u.id) ?? 0,
        esFlota: u.esFlota,
      },
    ]),
  );
}

export const CONFIANZA_VACIA: ConfianzaTransportista = {
  ratingPromedio: null,
  ratingCantidad: 0,
  emailVerified: false,
  miembroDesde: null,
  viajesRealizados: 0,
  esFlota: false,
};

/** Datos públicos de reputación: nada de contacto, solo nombre y calificaciones. */
export async function findPerfilPublico(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      ratingPromedio: true,
      ratingCantidad: true,
    },
  });
}

/** Promedio de cada criterio sobre las reseñas publicadas del usuario. */
export async function findPromediosPorCriterio(userId: string) {
  const agg = await db.resena.aggregate({
    where: { destinatarioId: userId, publicadaEn: { not: null } },
    _avg: {
      comunicacion: true,
      cumplioFecha: true,
      integridadCarga: true,
      pagoEnTiempo: true,
      datosReales: true,
    },
  });

  return agg._avg;
}

/** Viajes finalizados: como empresa las cargas propias, como transportista las aceptadas. */
export async function contarViajesFinalizados(userId: string) {
  const [comoEmpresa, comoTransportista] = await Promise.all([
    db.carga.count({ where: { empresaId: userId, estado: "FINALIZADA" } }),
    db.postulacion.count({
      where: { transportistaId: userId, estado: "ACEPTADA", carga: { estado: "FINALIZADA" } },
    }),
  ]);

  return { comoEmpresa, comoTransportista };
}
