import { DEADLINE_HORAS } from "@/lib/comision";
import { emit } from "@/lib/events/bus";
import {
  asignarCargaConvocatoriaCubierta,
  asignarPagoPendienteTransportista,
  cerrarRondaPago,
  expirarRondaPago,
  findRondaPago,
} from "@/lib/repositories/carga.repository";
import {
  confirmarMatchPorPago,
  findPostulacionesAceptadas,
} from "@/lib/repositories/postulacion.repository";

/**
 * Ronda de cobro de una carga. La comisión se cobra por postulación: cuando la
 * convocatoria queda cubierta (o la empresa la cierra), cada aceptado que
 * todavía no confirmó su match tiene DEADLINE_HORAS para pagar la suya. La
 * carga espera en PENDIENTE_PAGO_TRANSPORTISTA hasta que pagan todos
 * (→ ASIGNADA) o vence el plazo (los que no pagaron quedan afuera y la carga
 * vuelve a ACTIVA; los que pagaron conservan su lugar).
 *
 * Con FREE_TIER los matches se confirman al aceptar, así que la ronda se
 * resuelve en el acto y la carga pasa directo a ASIGNADA.
 */
export async function iniciarRondaPago(
  cargaId: number,
  titulo: string,
): Promise<"asignada" | "pago_pendiente"> {
  const aceptadas = await findPostulacionesAceptadas(cargaId);
  const sinPagar = aceptadas.filter((p) => p.matchConfirmadoEn === null);

  if (sinPagar.length === 0) {
    await asignarCargaConvocatoriaCubierta(
      cargaId,
      aceptadas.map((p) => p.transportistaId),
    );
    return "asignada";
  }

  const deadlineHoras = DEADLINE_HORAS();
  const deadline = new Date(Date.now() + deadlineHoras * 60 * 60 * 1000);
  // El escalar queda en el primer aceptado solo para que la carga nunca tenga
  // null ahí; quién paga lo dice cada postulación, no este campo.
  await asignarPagoPendienteTransportista(cargaId, aceptadas[0].transportistaId, deadline);

  emit("comision.requerida", {
    cargaId,
    titulo,
    transportistaIds: sinPagar.map((p) => p.transportistaId),
    deadlineHoras,
  });

  return "pago_pendiente";
}

/**
 * Lleva la ronda a su estado correcto: la cierra si ya pagaron todos, o la
 * expira si venció el plazo. Idempotente y segura de llamar en cualquier
 * momento —la llaman los pagos acreditados y los chequeos perezosos de las
 * páginas—; cada transición filtra por estado dentro del update.
 *
 * Tiene que correr DESPUÉS de confirmar cada pago y no dentro de la misma
 * transacción: si dos transportistas pagan a la vez, el último en confirmar
 * es el que ve a todos pagos y cierra la ronda.
 */
export async function resolverRondaPago(cargaId: number) {
  const carga = await findRondaPago(cargaId);
  if (!carga || carga.estado !== "PENDIENTE_PAGO_TRANSPORTISTA") return;

  const aceptadas = await findPostulacionesAceptadas(cargaId);
  const pagadas = aceptadas.filter((p) => p.matchConfirmadoEn !== null);

  if (pagadas.length === aceptadas.length) {
    await cerrarRondaPago(cargaId, aceptadas.map((p) => p.transportistaId));
    return;
  }

  if (carga.transportistaPagoDeadline && carga.transportistaPagoDeadline < new Date()) {
    await expirarRondaPago(cargaId, pagadas[0]?.transportistaId ?? null);
  }
}

/**
 * Registra el pago de la comisión de una postulación. Devuelve la carga y si
 * el match quedó confirmado; `ok: false` con carga significa que el pago llegó
 * cuando la postulación ya había quedado afuera por vencimiento.
 */
export async function registrarPagoComision(
  postulacionId: number,
  mpPaymentId: string | null,
): Promise<{ cargaId: number; ok: boolean } | null> {
  const postulacion = await confirmarMatchPorPago(postulacionId, mpPaymentId);
  if (!postulacion) return null;

  const ok = postulacion.estado === "ACEPTADA" && postulacion.matchConfirmadoEn !== null;
  if (!ok) {
    // No hay reembolso automático: queda registrado para devolverlo a mano.
    console.error("[comision] pago acreditado para una postulación que ya no está aceptada", {
      postulacionId,
      mpPaymentId,
    });
  }

  await resolverRondaPago(postulacion.cargaId);
  return { cargaId: postulacion.cargaId, ok };
}
