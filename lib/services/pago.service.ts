import { obtenerPago } from "@/lib/mercadopago";
import {
  activarCargaPagadaSiPendiente,
  cargaYaActivada,
} from "@/lib/repositories/carga.repository";
import { registrarPagoComision } from "@/lib/services/comision.service";
import { emit } from "@/lib/events/bus";

/**
 * Punto único donde una carga pasa a ACTIVA por pago acreditado. Lo llaman los
 * dos caminos que Mercado Pago dispara —el webhook y el redirect de success—,
 * que pueden llegar en cualquier orden e incluso a la vez.
 *
 * Devuelve si la carga quedó publicada, no si la publicó esta llamada: el que
 * pierde la carrera igual reporta éxito, porque el pago se acreditó. Antes el
 * redirect devolvía error en ese caso y mandaba al usuario a `?error=pago` con
 * la carga ya activa. El anuncio por push, en cambio, sale una sola vez.
 */
async function publicarCargaPagada(
  cargaId: number,
  paymentId: string | null,
): Promise<boolean> {
  const carga = await activarCargaPagadaSiPendiente(cargaId, paymentId);

  if (carga) {
    emit("pago.aprobado.publicacion", {
      cargaId: carga.id,
      titulo: carga.titulo,
      origen: carga.origen,
      destino: carga.destino,
      origenLat: carga.origenLat,
      origenLng: carga.origenLng,
      empresaId: carga.empresaId,
    });
    return true;
  }

  return cargaYaActivada(cargaId);
}

export async function procesarPago(paymentId: string) {
  const pago = await obtenerPago(paymentId);

  if (pago.status !== "approved") return;

  const externalReference = pago.external_reference;
  if (!externalReference) return;

  const matchPublicar = externalReference.match(/^publicar_(\d+)$/);
  if (matchPublicar) {
    await publicarCargaPagada(parseInt(matchPublicar[1]), String(pago.id));
    return;
  }

  const matchComision = externalReference.match(/^comision_post_(\d+)$/);
  if (matchComision) {
    await registrarPagoComision(parseInt(matchComision[1]), String(pago.id));
  }
}

export async function confirmarPagoPublicacion(
  cargaId: number,
  paymentId: string | null,
): Promise<{ ok: boolean }> {
  return { ok: await publicarCargaPagada(cargaId, paymentId) };
}

/**
 * Redirect de success del pago de comisión. registrarPagoComision es
 * idempotente, así que da igual si el webhook llegó primero.
 */
export async function confirmarPagoComision(
  postulacionId: number,
  paymentId: string | null,
): Promise<{ cargaId: number | null; ok: boolean }> {
  try {
    const result = await registrarPagoComision(postulacionId, paymentId);
    return { cargaId: result?.cargaId ?? null, ok: result?.ok ?? false };
  } catch {
    return { cargaId: null, ok: false };
  }
}
