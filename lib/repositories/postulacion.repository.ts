import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function findPostulacionPendiente(postulacionId: number, cargaId: number) {
  return db.postulacion.findUnique({
    where: { id: postulacionId, cargaId, estado: "PENDIENTE" },
  });
}

/**
 * `confirmarMatch` es para FREE_TIER: sin comisión que cobrar, el match queda
 * confirmado en el mismo momento en que se acepta.
 */
export async function aceptarPostulacion(postulacionId: number, confirmarMatch: boolean) {
  await db.postulacion.update({
    where: { id: postulacionId },
    data: { estado: "ACEPTADA", ...(confirmarMatch ? { matchConfirmadoEn: new Date() } : {}) },
  });
}

/**
 * Confirma el match por pago acreditado. El filtro va dentro del update porque
 * el webhook y el redirect de success pueden llegar a la vez; devuelve la
 * postulación tal como quedó (o null si no existe) para que el llamador sepa
 * si el pago llegó tarde —postulación ya RECHAZADA por vencimiento—.
 */
export async function confirmarMatchPorPago(postulacionId: number, mpPaymentId: string | null) {
  await db.postulacion.updateMany({
    where: { id: postulacionId, estado: "ACEPTADA", matchConfirmadoEn: null },
    data: { matchConfirmadoEn: new Date(), comisionMpPaymentId: mpPaymentId },
  });
  return db.postulacion.findUnique({
    where: { id: postulacionId },
    select: { cargaId: true, estado: true, matchConfirmadoEn: true },
  });
}

/** La postulación aceptada de un transportista que todavía debe su comisión. */
export async function findPostulacionConComisionPendiente(cargaId: number, transportistaId: string) {
  return db.postulacion.findFirst({
    where: {
      cargaId,
      transportistaId,
      estado: "ACEPTADA",
      matchConfirmadoEn: null,
      carga: { estado: "PENDIENTE_PAGO_TRANSPORTISTA" },
    },
    select: {
      id: true,
      camionesCubiertos: true,
      carga: {
        select: {
          id: true,
          titulo: true,
          origen: true,
          destino: true,
          presupuesto: true,
          transportistaPagoDeadline: true,
        },
      },
    },
  });
}

export async function findCargaIdDePostulacion(postulacionId: number) {
  const postulacion = await db.postulacion.findUnique({
    where: { id: postulacionId },
    select: { cargaId: true },
  });
  return postulacion?.cargaId ?? null;
}

/**
 * Postulaciones ACEPTADA de la carga, de la más antigua a la más nueva. Es la
 * fuente de verdad de quién quedó asignado: `Carga.transportistaAsignadoId` es
 * un escalar y solo puede guardar a uno cuando la convocatoria la cubren
 * varios transportistas a la vez.
 */
export async function findPostulacionesAceptadas(cargaId: number) {
  return db.postulacion.findMany({
    where: { cargaId, estado: "ACEPTADA" },
    orderBy: { createdAt: "asc" },
    select: { transportistaId: true, camionesCubiertos: true, matchConfirmadoEn: true },
  });
}

export async function crearPostulacion(data: Prisma.PostulacionUncheckedCreateInput) {
  return db.postulacion.create({ data });
}

export async function marcarVistasTransportista(transportistaId: string) {
  await db.postulacion.updateMany({
    where: { transportistaId, estado: "ACEPTADA", vistaTransportista: false },
    data: { vistaTransportista: true },
  });
}

export async function marcarVistasEmpresa(empresaId: string) {
  await db.postulacion.updateMany({
    where: { carga: { empresaId }, estado: "PENDIENTE", vistaEmpresa: false },
    data: { vistaEmpresa: true },
  });
}
