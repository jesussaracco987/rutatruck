import {
  findCargaActivaDeEmpresa,
  findCargaActivaParaPostular,
  findCargasEnViajeDeTransportista,
} from "@/lib/repositories/carga.repository";
import {
  findPostulacionesPendientes,
  aceptarPostulacion,
  findPostulacionesAceptadas,
  crearPostulacion as crearPostulacionDb,
  marcarVistasTransportista,
  marcarVistasEmpresa,
  sumarCamionesAceptados,
  findPostulacionLider,
  findMiembroDeGrupo,
  borrarMiembroPendiente,
} from "@/lib/repositories/postulacion.repository";
import { isFlota } from "@/lib/roles";
import { leerInvitacionGrupo } from "@/lib/grupo-postulacion";
import { findUserEmailVerified } from "@/lib/repositories/user.repository";
import { iniciarRondaPago } from "@/lib/services/comision.service";
import { emit } from "@/lib/events/bus";
import { registrarEvento } from "@/lib/analytics";

const FREE_TIER = process.env.FREE_TIER === "true";

export type AceptarPostulacionResult =
  | { ok: true; cubiertos: number; necesarios: number; aceptadas: number }
  | { ok: false; status: number; error: string };

/** Tope por pedido al aceptar en lote: una convocatoria grande, no la base entera. */
const MAX_ACEPTAR_JUNTAS = 100;

export function aceptarPostulacionParaCarga(cargaId: number, empresaId: string, postulacionId: number) {
  return aceptarPostulacionesParaCarga(cargaId, empresaId, [postulacionId]);
}

/**
 * Acepta una o varias postulaciones de la carga. En una convocatoria de 30
 * camiones aceptar de a una es lento: acá se valida el lote entero (que estén
 * pendientes y que no se pasen de los camiones que faltan) y se acepta todo
 * junto, con un solo cálculo de cobertura y de ronda de cobro.
 */
export async function aceptarPostulacionesParaCarga(
  cargaId: number,
  empresaId: string,
  postulacionIds: number[],
): Promise<AceptarPostulacionResult> {
  const ids = [...new Set(postulacionIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return { ok: false, status: 400, error: "Elegí al menos una postulación" };
  if (ids.length > MAX_ACEPTAR_JUNTAS) {
    return { ok: false, status: 400, error: `Podés aceptar hasta ${MAX_ACEPTAR_JUNTAS} postulaciones por vez` };
  }

  const carga = await findCargaActivaDeEmpresa(cargaId, empresaId);
  if (!carga) {
    return { ok: false, status: 404, error: "Carga no encontrada" };
  }

  const postulaciones = await findPostulacionesPendientes(ids, cargaId);
  if (postulaciones.length !== ids.length) {
    return {
      ok: false,
      status: 404,
      error: ids.length === 1 ? "Postulación no encontrada" : "Alguna de las postulaciones ya no está disponible. Recargá la página.",
    };
  }

  // Una flota que ofrece más camiones de los que faltan no se puede aceptar a
  // medias: se pasaría de los pedidos (y de las comisiones a cobrar).
  const faltan = carga.cantidadCamiones - (await sumarCamionesAceptados(cargaId));
  const ofrecidos = postulaciones.reduce((sum, p) => sum + p.camionesCubiertos, 0);
  if (ofrecidos > faltan) {
    return {
      ok: false,
      status: 409,
      error:
        ids.length === 1
          ? `Esta postulación cubre ${ofrecidos} vehículos y faltan ${faltan}. Pedile al transportista que se postule por ${faltan} o menos.`
          : `Las postulaciones elegidas suman ${ofrecidos} vehículos y faltan ${faltan}. Sacá alguna.`,
    };
  }

  for (const p of postulaciones) await aceptarPostulacion(p.id, FREE_TIER);

  const aceptadas = await findPostulacionesAceptadas(cargaId);
  const totalCubiertos = aceptadas.reduce((sum, p) => sum + p.camionesCubiertos, 0);
  const convocatoriaCubierta = totalCubiertos >= carga.cantidadCamiones;

  // La carga solo sale de ACTIVA cuando la convocatoria está cubierta. Si
  // saliera con el primer aceptado, en una carga de varios camiones la empresa
  // ya no podría aceptar al resto ni cerrar la convocatoria (ambas exigen
  // estado ACTIVA).
  const ronda = convocatoriaCubierta ? await iniciarRondaPago(cargaId, carga.titulo) : null;

  // Si abrió una ronda de cobro, el aviso de "pagá tu comisión" ya lo mandó
  // iniciarRondaPago a todos los que deben pagar, estos incluidos.
  if (ronda !== "pago_pendiente") {
    for (const p of postulaciones) {
      emit("postulacion.aceptada", {
        transportistaId: p.transportistaId,
        cargaId,
        titulo: carga.titulo,
        convocatoriaCubierta,
      });
    }
  }

  return {
    ok: true,
    cubiertos: totalCubiertos,
    necesarios: carga.cantidadCamiones,
    aceptadas: postulaciones.length,
  };
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
    /** Token del link de invitación: se suma a la postulación grupal de ese líder. */
    grupo?: unknown;
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

  // Solo una flota cubre varios camiones. El formulario ya lo limita, pero el
  // pedido lo puede armar cualquiera, y cada camión es una comisión.
  const flota = isFlota(transportista.role, transportista.esFlota);
  const faltan = carga.cantidadCamiones - (await sumarCamionesAceptados(carga.id));
  const camiones = flota ? Math.floor(input.camionesCubiertos) : 1;
  if (!Number.isFinite(camiones) || camiones < 1) {
    return { ok: false, status: 400, error: "Indicá cuántos vehículos cubrís" };
  }
  if (camiones > faltan) {
    return {
      ok: false,
      status: 400,
      error: `A esta carga le faltan ${faltan} ${faltan === 1 ? "vehículo" : "vehículos"}. Postulate por esa cantidad o menos.`,
    };
  }

  // Un camión no puede estar en dos viajes el mismo día. Una flota sí: con
  // varios camiones toma varias cargas a la vez, y lo que tiene disponible lo
  // maneja ella (todavía no cargamos el tamaño de cada flota).
  const conflicto = !flota && cargasEnViaje.find((c) => {
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

  let lider: { id: number; transportistaId: string } | null = null;
  if (input.grupo !== undefined && input.grupo !== null && input.grupo !== "") {
    const resultado = await liderDelGrupo(input.grupo, carga.id, transportistaId);
    if (!resultado.ok) return resultado;
    lider = resultado;
  }

  let postulacion;
  try {
    postulacion = await crearPostulacionDb({
      cargaId: input.cargaId,
      transportistaId,
      mensaje: input.mensaje,
      contactoEmail: input.contactoEmail,
      contactoTelefono: input.contactoTelefono,
      camionesCubiertos: camiones,
      precioOfrecido: input.precioOfrecido,
      grupoLiderId: lider?.id ?? null,
    });
  } catch {
    return { ok: false, status: 409, error: "Ya te postulaste a esta carga" };
  }

  emit("postulacion.creada", { cargaId: carga.id, empresaId: carga.empresaId, titulo: carga.titulo });
  if (lider) {
    emit("grupo.miembro_sumado", {
      liderId: lider.transportistaId,
      cargaId: carga.id,
      titulo: carga.titulo,
      miembroNombre: transportista.name,
      camiones,
    });
  }
  await registrarEvento("postulacion_enviada");

  return { ok: true, postulacionId: postulacion.id };
}

/**
 * Valida el link de invitación a una postulación grupal. El líder tiene que
 * estar en la misma carga, con su postulación abierta (pendiente o aceptada) y
 * no ser él mismo miembro de otro grupo: los grupos no se anidan.
 */
async function liderDelGrupo(
  token: unknown,
  cargaId: number,
  transportistaId: string,
): Promise<{ ok: true; id: number; transportistaId: string } | { ok: false; status: number; error: string }> {
  const id = leerInvitacionGrupo(token);
  const lider = id ? await findPostulacionLider(id) : null;
  if (!lider || lider.cargaId !== cargaId) {
    return { ok: false, status: 400, error: "El link del grupo no es válido. Pedile uno nuevo a quien te invitó." };
  }
  if (lider.transportistaId === transportistaId) {
    return { ok: false, status: 400, error: "Ese es tu propio grupo." };
  }
  if (lider.grupoLiderId !== null || lider.estado === "RECHAZADA") {
    return { ok: false, status: 409, error: "Ese grupo ya no acepta transportistas. Podés postularte por tu cuenta." };
  }
  return { ok: true, id: lider.id, transportistaId: lider.transportistaId };
}

/**
 * El líder saca a alguien de su grupo. Solo mientras esa persona esté
 * pendiente: una vez aceptada, ya es parte de lo que quien publica eligió, y
 * sacarla le cambiaría los camiones asignados sin que se entere.
 *
 * Su postulación se borra (no queda rechazada): así se puede volver a
 * postular por su cuenta o en otro grupo.
 */
export async function quitarMiembroDelGrupo(
  liderUserId: string,
  miembroPostulacionId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const miembro = await findMiembroDeGrupo(miembroPostulacionId);
  if (!miembro?.grupoLider || miembro.grupoLider.transportistaId !== liderUserId) {
    return { ok: false, status: 404, error: "No encontramos a esa persona en tu grupo" };
  }
  if (miembro.estado !== "PENDIENTE") {
    return {
      ok: false,
      status: 409,
      error:
        miembro.estado === "ACEPTADA"
          ? "Ya fue aceptado por quien publica. Si no va a viajar, hablalo con quien publica por el chat del grupo."
          : "Ya no está en el grupo.",
    };
  }
  if (!(await borrarMiembroPendiente(miembro.id, miembro.grupoLider.id))) {
    return { ok: false, status: 409, error: "Ya no está pendiente. Recargá la página." };
  }

  emit("grupo.miembro_quitado", {
    miembroId: miembro.transportistaId,
    liderNombre: miembro.grupoLider.transportista.name,
    cargaId: miembro.carga.id,
    titulo: miembro.carga.titulo,
  });
  return { ok: true };
}

export async function marcarPostulacionesVistasTransportista(transportistaId: string) {
  await marcarVistasTransportista(transportistaId);
  emit("postulacion.vista_transportista", { transportistaId });
}

export async function marcarPostulacionesVistasEmpresa(empresaId: string) {
  await marcarVistasEmpresa(empresaId);
  emit("postulacion.vista_empresa", { empresaId });
}
