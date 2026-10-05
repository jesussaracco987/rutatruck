import {
  findCargaActivaDeEmpresa,
  findCargaActivaParaPostular,
  findCargasEnViajeDeTransportista,
} from "@/lib/repositories/carga.repository";
import {
  findPostulacionPendiente,
  aceptarPostulacion,
  findPostulacionesAceptadas,
  crearPostulacion as crearPostulacionDb,
  marcarVistasTransportista,
  marcarVistasEmpresa,
} from "@/lib/repositories/postulacion.repository";
import { findUserEmailVerified } from "@/lib/repositories/user.repository";
import { iniciarRondaPago } from "@/lib/services/comision.service";
import { emit } from "@/lib/events/bus";
import { registrarEvento } from "@/lib/analytics";

const FREE_TIER = process.env.FREE_TIER === "true";

export type AceptarPostulacionResult =
  | { ok: true; cubiertos: number; necesarios: number }
  | { ok: false; status: number; error: string };

export async function aceptarPostulacionParaCarga(
  cargaId: number,
  empresaId: string,
  postulacionId: number,
): Promise<AceptarPostulacionResult> {
  const carga = await findCargaActivaDeEmpresa(cargaId, empresaId);
  if (!carga) {
    return { ok: false, status: 404, error: "Carga no encontrada" };
  }

  const postulacion = await findPostulacionPendiente(postulacionId, cargaId);
  if (!postulacion) {
    return { ok: false, status: 404, error: "Postulación no encontrada" };
  }

  await aceptarPostulacion(postulacionId, FREE_TIER);

  const aceptadas = await findPostulacionesAceptadas(cargaId);
  const totalCubiertos = aceptadas.reduce((sum, p) => sum + p.camionesCubiertos, 0);
  const convocatoriaCubierta = totalCubiertos >= carga.cantidadCamiones;

  // La carga solo sale de ACTIVA cuando la convocatoria está cubierta. Si
  // saliera con el primer aceptado, en una carga de varios camiones la empresa
  // ya no podría aceptar al resto ni cerrar la convocatoria (ambas exigen
  // estado ACTIVA).
  const ronda = convocatoriaCubierta ? await iniciarRondaPago(cargaId, carga.titulo) : null;

  // Si abrió una ronda de cobro, el aviso de "pagá tu comisión" ya lo mandó
  // iniciarRondaPago a todos los que deben pagar, este incluido.
  if (ronda !== "pago_pendiente") {
    emit("postulacion.aceptada", {
      transportistaId: postulacion.transportistaId,
      cargaId,
      titulo: carga.titulo,
      convocatoriaCubierta,
    });
  }

  return { ok: true, cubiertos: totalCubiertos, necesarios: carga.cantidadCamiones };
}

export type CrearPostulacionResult =
  | { ok: true; postulacionId: number }
  | { ok: false; status: number; error: string; code?: string };

export async function crearPostulacion(
  transportistaId: string,
  input: {
    cargaId: number;
    mensaje: string | null;
    contactoEmail: string | null;
    contactoTelefono: string | null;
    camionesCubiertos: number;
    precioOfrecido: number | null;
  },
): Promise<CrearPostulacionResult> {
  const [carga, cargasEnViaje, transportista] = await Promise.all([
    findCargaActivaParaPostular(input.cargaId),
    findCargasEnViajeDeTransportista(transportistaId),
    findUserEmailVerified(transportistaId),
  ]);

  if (!carga) {
    return { ok: false, status: 404, error: "Carga no encontrada o no disponible" };
  }

  if (!transportista?.emailVerified) {
    return {
      ok: false,
      status: 403,
      error: "Verificá tu email antes de postularte a una carga",
      code: "EMAIL_NOT_VERIFIED",
    };
  }

  const conflicto = cargasEnViaje.find((c) => {
    const endDate = c.fechaCupo ?? c.fechaCarga;
    return carga.fechaCarga <= endDate;
  });
  if (conflicto) {
    return {
      ok: false,
      status: 409,
      error:
        "Tenés una carga en viaje que coincide con esta fecha. Completá tus viajes activos antes de postularte a cargas en la misma fecha.",
      code: "DATE_CONFLICT",
    };
  }

  let postulacion;
  try {
    postulacion = await crearPostulacionDb({
      cargaId: input.cargaId,
      transportistaId,
      mensaje: input.mensaje,
      contactoEmail: input.contactoEmail,
      contactoTelefono: input.contactoTelefono,
      camionesCubiertos: input.camionesCubiertos,
      precioOfrecido: input.precioOfrecido,
    });
  } catch {
    return { ok: false, status: 409, error: "Ya te postulaste a esta carga" };
  }

  emit("postulacion.creada", { cargaId: carga.id, empresaId: carga.empresaId, titulo: carga.titulo });
  await registrarEvento("postulacion_enviada");

  return { ok: true, postulacionId: postulacion.id };
}

export async function marcarPostulacionesVistasTransportista(transportistaId: string) {
  await marcarVistasTransportista(transportistaId);
  emit("postulacion.vista_transportista", { transportistaId });
}

export async function marcarPostulacionesVistasEmpresa(empresaId: string) {
  await marcarVistasEmpresa(empresaId);
  emit("postulacion.vista_empresa", { empresaId });
}
