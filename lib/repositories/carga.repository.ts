import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const SELECT_CARGA_PUBLICADA = {
  id: true,
  titulo: true,
  origen: true,
  destino: true,
  origenLat: true,
  origenLng: true,
  empresaId: true,
} as const;

/**
 * Activa la carga solo si sigue en PENDIENTE_PAGO; devuelve null si ya no lo
 * estaba.
 *
 * El filtro por estado va DENTRO del update a propósito. El webhook de Mercado
 * Pago y el redirect de success llegan por caminos separados y pueden cruzarse:
 * con un chequeo previo suelto los dos leían PENDIENTE_PAGO antes de que el
 * otro escribiera, y la carga se anunciaba dos veces por push a todos los
 * transportistas de la zona. Acá el que pierde la carrera recibe null y no
 * vuelve a emitir.
 */
export async function activarCargaPagadaSiPendiente(cargaId: number, mpPaymentId: string | null) {
  try {
    return await db.carga.update({
      where: { id: cargaId, estado: "PENDIENTE_PAGO" },
      data: { estado: "ACTIVA", pagado: true, mpPaymentId },
      select: SELECT_CARGA_PUBLICADA,
    });
  } catch (err) {
    // P2025 = no matcheó ninguna fila, o sea que ya la activó el otro camino.
    if ((err as { code?: string }).code === "P2025") return null;
    throw err;
  }
}

/** Si la carga ya salió de PENDIENTE_PAGO con el pago acreditado, sin importar quién la activó. */
export async function cargaYaActivada(cargaId: number) {
  const carga = await db.carga.findUnique({
    where: { id: cargaId },
    select: { estado: true, pagado: true },
  });
  return !!carga && carga.pagado && carga.estado !== "PENDIENTE_PAGO";
}

/**
 * Cierra la ronda de cobro con todos los aceptados pagos: la carga pasa a
 * ASIGNADA. Filtra por PENDIENTE_PAGO_TRANSPORTISTA dentro del update porque
 * los pagos de distintos transportistas pueden acreditarse a la vez y cada uno
 * intenta cerrar la ronda.
 */
export async function cerrarRondaPago(cargaId: number, transportistaIds: string[]) {
  await db.$transaction([
    db.carga.updateMany({
      where: { id: cargaId, estado: "PENDIENTE_PAGO_TRANSPORTISTA" },
      data: { estado: "ASIGNADA", transportistaPagoDeadline: null },
    }),
    db.postulacion.updateMany({
      where: { cargaId, estado: "PENDIENTE" },
      data: { estado: "RECHAZADA" },
    }),
    db.disponibilidadTransportista.updateMany({
      where: { transportistaId: { in: transportistaIds } },
      data: { activo: false },
    }),
  ]);
}

/**
 * Venció el plazo de la ronda de cobro: los aceptados que no pagaron quedan
 * RECHAZADA y la carga vuelve a ACTIVA para que la empresa acepte reemplazos.
 * Los que sí pagaron conservan su match (y su chat); el escalar
 * transportistaAsignadoId pasa al primero de ellos, o a null si no hay.
 */
export async function expirarRondaPago(cargaId: number, transportistaAsignadoId: string | null) {
  await db.$transaction([
    db.carga.updateMany({
      where: { id: cargaId, estado: "PENDIENTE_PAGO_TRANSPORTISTA" },
      data: { estado: "ACTIVA", transportistaAsignadoId, transportistaPagoDeadline: null },
    }),
    db.postulacion.updateMany({
      where: { cargaId, estado: "ACEPTADA", matchConfirmadoEn: null },
      data: { estado: "RECHAZADA" },
    }),
  ]);
}

export async function findRondaPago(cargaId: number) {
  return db.carga.findUnique({
    where: { id: cargaId },
    select: { estado: true, transportistaPagoDeadline: true },
  });
}

export async function createCargaActiva(
  data: Omit<Prisma.CargaUncheckedCreateInput, "estado" | "pagado">,
) {
  return db.carga.create({ data: { ...data, estado: "ACTIVA", pagado: true } });
}

export async function createCargaPendientePago(
  data: Omit<Prisma.CargaUncheckedCreateInput, "estado">,
) {
  return db.carga.create({ data: { ...data, estado: "PENDIENTE_PAGO" } });
}

export async function deleteCarga(cargaId: number) {
  await db.carga.delete({ where: { id: cargaId } }).catch(() => {});
}

export async function findCargaActivaDeEmpresa(cargaId: number, empresaId: string) {
  return db.carga.findUnique({
    where: { id: cargaId, empresaId, estado: "ACTIVA" },
  });
}

/**
 * Pasa la carga a ASIGNADA. `transportistaAsignadoId` es un escalar y solo
 * puede guardar a uno, así que se le pone el primer aceptado: nunca queda en
 * null, porque una carga ASIGNADA sin transportista se vuelve inmanejable (no
 * se puede completar, no aparece en el historial ni en los recordatorios).
 * La lista completa de asignados sigue siendo la de postulaciones ACEPTADA.
 */
export async function asignarCargaConvocatoriaCubierta(
  cargaId: number,
  transportistaIds: string[],
) {
  await db.$transaction([
    db.carga.update({
      where: { id: cargaId },
      data: {
        estado: "ASIGNADA",
        ...(transportistaIds.length > 0
          ? { transportistaAsignadoId: transportistaIds[0] }
          : {}),
      },
    }),
    db.postulacion.updateMany({
      where: { cargaId, estado: "PENDIENTE" },
      data: { estado: "RECHAZADA" },
    }),
    db.disponibilidadTransportista.updateMany({
      where: { transportistaId: { in: transportistaIds } },
      data: { activo: false },
    }),
  ]);
}

export async function asignarPagoPendienteTransportista(
  cargaId: number,
  transportistaId: string,
  deadline: Date,
) {
  await db.carga.update({
    where: { id: cargaId },
    data: {
      estado: "PENDIENTE_PAGO_TRANSPORTISTA",
      transportistaAsignadoId: transportistaId,
      transportistaPagoDeadline: deadline,
    },
  });
}

export async function findOfertaPrivada(cargaId: number, transportistaId: string) {
  return db.carga.findUnique({
    where: {
      id: cargaId,
      esPrivada: true,
      transportistaDestinadoId: transportistaId,
      estado: "ACTIVA",
    },
  });
}

export async function rechazarOfertaPrivada(cargaId: number) {
  await db.carga.update({ where: { id: cargaId }, data: { estado: "CANCELADA" } });
}

/**
 * Solo crea la postulación ACEPTADA: la transición de la carga (a ASIGNADA, o
 * a PENDIENTE_PAGO_TRANSPORTISTA si hay comisión que cobrar) la hace
 * iniciarRondaPago, igual que en una convocatoria pública.
 */
export async function aceptarOfertaPrivada(
  cargaId: number,
  transportistaId: string,
  confirmarMatch: boolean,
) {
  await db.postulacion.create({
    data: {
      cargaId,
      transportistaId,
      estado: "ACEPTADA",
      camionesCubiertos: 1,
      ...(confirmarMatch ? { matchConfirmadoEn: new Date() } : {}),
    },
  });
}

/**
 * Un transportista "tiene" la carga si es el asignado escalar o si su
 * postulación quedó ACEPTADA. Lo segundo cubre las convocatorias que cubren
 * varios transportistas a la vez, donde el escalar solo guarda a uno.
 */
export function whereTransportistaDeLaCarga(transportistaId: string): Prisma.CargaWhereInput {
  return {
    OR: [
      { transportistaAsignadoId: transportistaId },
      { postulaciones: { some: { transportistaId, estado: "ACEPTADA" } } },
    ],
  };
}

export async function findCargaAsignadaTransportista(cargaId: number, transportistaId: string) {
  return db.carga.findFirst({
    where: {
      id: cargaId,
      estado: "ASIGNADA",
      ...whereTransportistaDeLaCarga(transportistaId),
    },
  });
}

export async function marcarEnConfirmacion(cargaId: number) {
  await db.carga.update({ where: { id: cargaId }, data: { estado: "EN_CONFIRMACION" } });
}

export async function findCargaActivaConAceptadas(cargaId: number, empresaId: string) {
  return db.carga.findUnique({
    where: { id: cargaId, empresaId, estado: "ACTIVA" },
    include: {
      postulaciones: {
        where: { estado: "ACEPTADA" },
        orderBy: { createdAt: "asc" },
        select: { transportistaId: true },
      },
    },
  });
}

export async function createOfertaPrivada(data: Prisma.CargaUncheckedCreateInput) {
  return db.carga.create({ data });
}

export async function findCargaActivaParaPostular(cargaId: number) {
  return db.carga.findUnique({
    where: { id: cargaId, estado: "ACTIVA" },
    select: { id: true, titulo: true, empresaId: true, fechaCarga: true },
  });
}

export async function findCargasEnViajeDeTransportista(transportistaId: string) {
  return db.carga.findMany({
    where: {
      estado: { in: ["ASIGNADA", "PENDIENTE_PAGO_TRANSPORTISTA"] },
      ...whereTransportistaDeLaCarga(transportistaId),
    },
    select: { id: true, fechaCarga: true, fechaCupo: true, titulo: true },
  });
}

export async function findCargasVencidasSinCompletar(umbralReintento: Date) {
  const ahora = new Date();
  return db.carga.findMany({
    where: {
      estado: "ASIGNADA",
      OR: [
        { recordatorioCompletarEnviadoEn: null },
        { recordatorioCompletarEnviadoEn: { lt: umbralReintento } },
      ],
      AND: [
        { OR: [{ fechaCupo: { lt: ahora } }, { fechaCupo: null, fechaCarga: { lt: ahora } }] },
      ],
    },
    select: {
      id: true,
      titulo: true,
      transportistaAsignadoId: true,
      postulaciones: {
        where: { estado: "ACEPTADA" },
        select: { transportistaId: true },
      },
    },
  });
}

export async function marcarRecordatorioCompletarEnviado(cargaIds: number[]) {
  await db.carga.updateMany({
    where: { id: { in: cargaIds } },
    data: { recordatorioCompletarEnviadoEn: new Date() },
  });
}

/**
 * ASIGNADA que el transportista nunca marcó como completada, con la fecha del
 * viaje pasada hace rato. Se compara contra fechaCupo y, si no hay, contra
 * fechaCarga: mismo criterio que findCargasVencidasSinCompletar, que es el
 * recordatorio que estos transportistas vienen ignorando hace días.
 */
export async function findCargasAsignadasAbandonadas(umbral: Date) {
  return db.carga.findMany({
    where: {
      estado: "ASIGNADA",
      OR: [{ fechaCupo: { lt: umbral } }, { fechaCupo: null, fechaCarga: { lt: umbral } }],
    },
    select: {
      id: true,
      titulo: true,
      empresaId: true,
      transportistaAsignadoId: true,
      postulaciones: {
        where: { estado: "ACEPTADA" },
        select: { transportistaId: true },
      },
    },
  });
}

export async function marcarCargasEnConfirmacion(cargaIds: number[]) {
  if (cargaIds.length === 0) return;
  await db.carga.updateMany({
    where: { id: { in: cargaIds } },
    data: { estado: "EN_CONFIRMACION" },
  });
}

/**
 * EN_CONFIRMACION que la empresa nunca respondió. Igual que en la purga de
 * canceladas, `updatedAt` sirve de reloj: a EN_CONFIRMACION solo se entra por
 * un cambio de estado y de ahí solo se sale por confirmar o por disputa, así
 * que ese timestamp es el momento en que la carga quedó esperando respuesta.
 */
export async function findCargasEnConfirmacionAbandonadas(umbral: Date) {
  return db.carga.findMany({
    where: {
      estado: "EN_CONFIRMACION",
      updatedAt: { lt: umbral },
    },
    select: {
      id: true,
      titulo: true,
      empresaId: true,
      transportistaAsignadoId: true,
      postulaciones: {
        where: { estado: "ACEPTADA" },
        select: { transportistaId: true },
      },
    },
  });
}

export async function finalizarCargas(cargaIds: number[]) {
  if (cargaIds.length === 0) return;
  await db.carga.updateMany({
    where: { id: { in: cargaIds } },
    data: { estado: "FINALIZADA", finalizadaEn: new Date() },
  });
}

export async function findCargasProximasSinAceptar(limite: Date, umbralReintento: Date) {
  return db.carga.findMany({
    where: {
      estado: "ACTIVA",
      fechaCarga: { lte: limite },
      postulaciones: { none: { estado: "ACEPTADA" } },
      OR: [
        { recordatorioSinPostulantesEnviadoEn: null },
        { recordatorioSinPostulantesEnviadoEn: { lt: umbralReintento } },
      ],
    },
    select: { id: true, titulo: true, empresaId: true, fechaCarga: true },
  });
}

export async function marcarRecordatorioSinPostulantesEnviado(cargaIds: number[]) {
  await db.carga.updateMany({
    where: { id: { in: cargaIds } },
    data: { recordatorioSinPostulantesEnviadoEn: new Date() },
  });
}

/**
 * Una carga sigue ACTIVA solo mientras la convocatoria no se cubrio: al
 * completarse pasa a ASIGNADA. Por eso no se filtra por postulaciones
 * aceptadas; una ACTIVA vencida es siempre una convocatoria incompleta,
 * tenga cero aceptados o algunos. Se devuelven los aceptados para poder
 * avisarles antes de cancelar.
 */
export async function findCargasVencidasParaCancelar(umbral: Date) {
  return db.carga.findMany({
    where: {
      estado: "ACTIVA",
      fechaCarga: { lt: umbral },
    },
    select: {
      id: true,
      titulo: true,
      empresaId: true,
      postulaciones: {
        where: { estado: "ACEPTADA" },
        select: { transportistaId: true },
      },
    },
  });
}

/**
 * PENDIENTE_PAGO cuya fecha ya pasó: la empresa llenó el formulario, nunca
 * completó el pago de la publicación y ahora la fecha no sirve. Nunca llegó a
 * ser visible para ningún transportista, así que no hay postulaciones ni
 * nadie más a quien avisar.
 */
export async function findCargasPendientePagoVencidas(umbral: Date) {
  return db.carga.findMany({
    where: {
      estado: "PENDIENTE_PAGO",
      fechaCarga: { lt: umbral },
    },
    select: { id: true, titulo: true, empresaId: true },
  });
}

/**
 * Pasa las cargas a CANCELADA y cierra sus postulaciones. La convocatoria
 * queda vacía a proposito: si la empresa reactiva, arranca de cero y no
 * hereda aceptados que ya perdieron el viaje. El updatedAt que deja este
 * update es el que arranca el reloj de gracia de findCargasCanceladasParaPurgar.
 */
export async function cancelarCargas(cargaIds: number[]) {
  if (cargaIds.length === 0) return;
  await db.$transaction([
    db.postulacion.updateMany({
      where: { cargaId: { in: cargaIds }, estado: { not: "RECHAZADA" } },
      data: { estado: "RECHAZADA" },
    }),
    db.carga.updateMany({
      where: { id: { in: cargaIds } },
      data: { estado: "CANCELADA", transportistaAsignadoId: null },
    }),
  ]);
}

export async function findCargaCanceladaDeEmpresa(cargaId: number, empresaId: string) {
  return db.carga.findUnique({
    where: { id: cargaId, empresaId, estado: "CANCELADA" },
  });
}

/**
 * Vuelve una CANCELADA a ACTIVA con fecha nueva. Se limpian los flags de
 * recordatorio para que el ciclo de avisos vuelva a correr sobre la fecha
 * nueva en lugar de darse por enviado.
 */
export async function reactivarCarga(
  cargaId: number,
  fechaCarga: Date,
  fechaCupo: Date | null,
) {
  await db.carga.update({
    where: { id: cargaId },
    data: {
      estado: "ACTIVA",
      fechaCarga,
      fechaCupo,
      recordatorioCompletarEnviadoEn: null,
      recordatorioSinPostulantesEnviadoEn: null,
    },
  });
}

/**
 * `updatedAt` es el reloj de gracia: lo pone la cancelación y lo pisa
 * cualquier cambio posterior, así que una carga que la empresa tocó dentro
 * de la ventana se queda otros dos días.
 */
export async function findCargasCanceladasParaPurgar(umbral: Date) {
  return db.carga.findMany({
    where: {
      estado: "CANCELADA",
      updatedAt: { lt: umbral },
      // Preservar las que pasaron por disputa: dejan evidencia del conflicto.
      disputaAbiertaPor: null,
    },
    select: { id: true },
  });
}

export async function eliminarCargas(cargaIds: number[]) {
  if (cargaIds.length === 0) return;
  await db.$transaction([
    // Mensaje cascadea desde Postulacion (ver la FK en schema.prisma), así que
    // borrar las postulaciones se lleva los hilos de chat con ellas.
    db.postulacion.deleteMany({ where: { cargaId: { in: cargaIds } } }),
    db.carga.deleteMany({ where: { id: { in: cargaIds } } }),
  ]);
}

export async function findCargasAsignadasVencidasDeTransportista(transportistaId: string) {
  const ahora = new Date();
  return db.carga.findMany({
    where: {
      estado: "ASIGNADA",
      AND: [
        whereTransportistaDeLaCarga(transportistaId),
        { OR: [{ fechaCupo: { lt: ahora } }, { fechaCupo: null, fechaCarga: { lt: ahora } }] },
      ],
    },
    select: { id: true, titulo: true, origen: true, destino: true },
    orderBy: { fechaCarga: "asc" },
  });
}
