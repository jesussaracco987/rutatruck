import type { Prisma } from "@prisma/client";
import { crearPreferencia } from "@/lib/mercadopago";
import { getPrecioPublicacion } from "@/lib/comision";
import {
  createCargaActiva,
  createCargaPendientePago,
  deleteCarga,
  findOfertaPrivada,
  rechazarOfertaPrivada,
  aceptarOfertaPrivada,
  findCargaAsignadaTransportista,
  marcarEnConfirmacion,
  findCargaActivaConAceptadas,
  createOfertaPrivada,
  findCargasVencidasSinCompletar,
  marcarRecordatorioCompletarEnviado,
  findCargasProximasSinAceptar,
  marcarRecordatorioSinPostulantesEnviado,
  findCargasVencidasParaCancelar,
  findCargasPendientePagoVencidas,
  findCargasCanceladasParaPurgar,
  cancelarCargas,
  eliminarCargas,
  findCargaCanceladaDeEmpresa,
  reactivarCarga,
  findCargasAsignadasAbandonadas,
  marcarCargasEnConfirmacion,
  findCargasEnConfirmacionAbandonadas,
  finalizarCargas,
} from "@/lib/repositories/carga.repository";
import { findUserById, findUserContacto, linkPhoneSiFalta } from "@/lib/repositories/user.repository";
import { emit } from "@/lib/events/bus";
import { registrarEvento } from "@/lib/analytics";
import { sendPushToUser } from "@/lib/push";
import { FREE_TIER } from "@/lib/free-tier";
import { iniciarRondaPago } from "@/lib/services/comision.service";
import {
  DIAS_GRACIA_CANCELADA,
  DIAS_ASIGNADA_ABANDONADA,
  DIAS_EN_CONFIRMACION_ABANDONADA,
} from "@/lib/plazos";

type CargaData = Omit<Prisma.CargaUncheckedCreateInput, "estado" | "pagado"> & {
  titulo: string;
  origen: string;
  destino: string;
  origenLat: number | null;
  origenLng: number | null;
  empresaId: string;
};

export type PublicarCargaFreeTierResult =
  | { ok: true; cargaId: number }
  | { ok: false; status: number; error: string };

export async function publicarCargaFreeTier(
  cargaData: CargaData,
): Promise<PublicarCargaFreeTierResult> {
  let carga;
  try {
    carga = await createCargaActiva(cargaData);
  } catch (err) {
    console.error("[carga.service] Error Prisma:", err);
    return { ok: false, status: 500, error: "Error al guardar la carga" };
  }

  await linkPhoneSiFalta(cargaData.empresaId, cargaData.contactoTelefono).catch(() => {});

  emit("carga.publicada", {
    cargaId: carga.id,
    titulo: cargaData.titulo,
    origen: cargaData.origen,
    destino: cargaData.destino,
    origenLat: cargaData.origenLat,
    origenLng: cargaData.origenLng,
    empresaId: cargaData.empresaId,
  });
  await registrarEvento("carga_publicada");

  return { ok: true, cargaId: carga.id };
}

export type PublicarCargaConPagoResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

export async function publicarCargaConPago(
  cargaData: CargaData,
  origin: string,
): Promise<PublicarCargaConPagoResult> {
  let carga;
  try {
    carga = await createCargaPendientePago(cargaData);
  } catch (err) {
    console.error("[carga.service] Error Prisma:", err);
    return { ok: false, status: 500, error: "Error al guardar la carga" };
  }

  await linkPhoneSiFalta(cargaData.empresaId, cargaData.contactoTelefono).catch(() => {});

  const fee = await getPrecioPublicacion();

  let preference;
  try {
    preference = await crearPreferencia({
      items: [
        {
          id: carga.id.toString(),
          title: `Publicación de carga: ${carga.titulo}`,
          quantity: 1,
          unit_price: fee,
          currency_id: "ARS",
        },
      ],
      external_reference: `publicar_${carga.id}`,
      back_urls: {
        success: `${origin}/api/pagos/success`,
        failure: `${origin}/api/pagos/failure`,
        pending: `${origin}/api/pagos/failure`,
      },
      auto_return: "approved",
      statement_descriptor: "ClickCargo",
    });
  } catch (err) {
    console.error("[carga.service] Error MercadoPago:", err);
    await deleteCarga(carga.id);
    return { ok: false, status: 500, error: "Error al conectar con MercadoPago" };
  }

  const url =
    process.env.NODE_ENV === "production" ? preference.init_point : preference.sandbox_init_point;

  if (!url) {
    await deleteCarga(carga.id);
    return { ok: false, status: 500, error: "Error al crear preferencia de pago" };
  }

  return { ok: true, url };
}

export type ResponderOfertaPrivadaResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function responderOfertaPrivada(
  cargaId: number,
  transportistaId: string,
  accion: "aceptar" | "rechazar",
): Promise<ResponderOfertaPrivadaResult> {
  const carga = await findOfertaPrivada(cargaId, transportistaId);
  if (!carga) {
    return { ok: false, status: 404, error: "Oferta no encontrada" };
  }

  let pagoPendiente = false;
  if (accion === "rechazar") {
    await rechazarOfertaPrivada(cargaId);
  } else {
    // Una oferta privada aceptada es un match más: paga comisión igual que
    // una convocatoria pública.
    await aceptarOfertaPrivada(cargaId, transportistaId, FREE_TIER);
    pagoPendiente = (await iniciarRondaPago(cargaId, carga.titulo)) === "pago_pendiente";
  }

  emit("oferta-privada.respondida", {
    empresaId: carga.empresaId,
    transportistaId,
    cargaId,
    titulo: carga.titulo,
    accion,
    pagoPendiente,
  });
  return { ok: true };
}

export type CompletarViajeResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function completarViaje(
  cargaId: number,
  transportistaId: string,
): Promise<CompletarViajeResult> {
  const carga = await findCargaAsignadaTransportista(cargaId, transportistaId);
  if (!carga) {
    return { ok: false, status: 404, error: "Carga no encontrada" };
  }

  await marcarEnConfirmacion(cargaId);

  emit("carga.completada", { empresaId: carga.empresaId, cargaId, titulo: carga.titulo });
  await registrarEvento("viaje_concretado", { rol: "transportista" });
  return { ok: true };
}

export type CerrarConvocatoriaResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function cerrarConvocatoriaCarga(
  cargaId: number,
  empresaId: string,
): Promise<CerrarConvocatoriaResult> {
  const carga = await findCargaActivaConAceptadas(cargaId, empresaId);
  if (!carga) {
    return { ok: false, status: 404, error: "Carga no encontrada o no está activa" };
  }
  if (carga.postulaciones.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Debe aceptar al menos un transportista antes de cerrar",
    };
  }

  // Cerrar con menos camiones que los pedidos no saltea el cobro: los
  // aceptados que no pagaron entran en la ronda igual que con la
  // convocatoria cubierta.
  const ronda = await iniciarRondaPago(cargaId, carga.titulo);

  if (ronda === "asignada") {
    emit("convocatoria.cerrada", {
      cargaId,
      titulo: carga.titulo,
      transportistaIds: carga.postulaciones.map((p) => p.transportistaId),
    });
  }

  return { ok: true };
}

export type CrearOfertaPrivadaResult =
  | { ok: true; cargaId: number }
  | { ok: false; status: number; error: string };

export async function crearOfertaPrivada(
  empresaId: string,
  transportistaId: string,
  input: {
    titulo: string;
    origen: string;
    destino: string;
    tipoCarga: string;
    fechaCarga: Date;
    presupuesto: number | null;
    descripcion: string | null;
  },
): Promise<CrearOfertaPrivadaResult> {
  if (transportistaId === empresaId) {
    return { ok: false, status: 400, error: "No podés solicitarte a vos mismo" };
  }

  const [transportista, empresa] = await Promise.all([
    findUserById(transportistaId),
    findUserContacto(empresaId),
  ]);
  if (!transportista) {
    return { ok: false, status: 404, error: "Transportista no encontrado" };
  }

  const carga = await createOfertaPrivada({
    titulo: input.titulo,
    origen: input.origen,
    destino: input.destino,
    tipoCarga: input.tipoCarga,
    fechaCarga: input.fechaCarga,
    presupuesto: input.presupuesto,
    descripcion: input.descripcion,
    contactoNombre: empresa?.name ?? "Empresa",
    contactoTelefono: empresa?.phone ?? "",
    contactoEmail: empresa?.email ?? "",
    empresaId,
    estado: "ACTIVA",
    pagado: true,
    esPrivada: true,
    transportistaDestinadoId: transportistaId,
  });

  emit("oferta-privada.creada", { transportistaId, cargaId: carga.id, titulo: carga.titulo });

  return { ok: true, cargaId: carga.id };
}

export async function enviarRecordatoriosCompletar() {
  const umbral = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const vencidas = await findCargasVencidasSinCompletar(umbral);
  if (vencidas.length === 0) return { ok: true, transportistas: 0, cargas: 0 };

  // Una carga puede estar cubierta por varios transportistas aceptados; hay que
  // avisarle a todos, no solo al que quedó en el escalar transportistaAsignadoId.
  const porTransportista = new Map<string, { id: number; titulo: string }[]>();
  for (const c of vencidas) {
    const destinatarios = new Set(c.postulaciones.map((p) => p.transportistaId));
    if (c.transportistaAsignadoId) destinatarios.add(c.transportistaAsignadoId);
    for (const transportistaId of destinatarios) {
      const list = porTransportista.get(transportistaId) ?? [];
      list.push({ id: c.id, titulo: c.titulo });
      porTransportista.set(transportistaId, list);
    }
  }

  await Promise.allSettled(
    Array.from(porTransportista.entries()).map(([transportistaId, cargas]) => {
      const payload =
        cargas.length === 1
          ? {
              title: "Marcá tu viaje como completado",
              body: `"${cargas[0].titulo}" ya pasó su fecha de cupo. Marcalo como completado para cerrar la operación.`,
              url: "/transportista/dashboard",
            }
          : {
              title: "Tenés viajes por marcar como completados",
              body: `${cargas.length} cargas ya pasaron su fecha de cupo. Revisalas y marcalas como completadas.`,
              url: "/transportista/dashboard",
            };
      return sendPushToUser(transportistaId, payload);
    }),
  );

  await marcarRecordatorioCompletarEnviado(vencidas.map((c) => c.id));
  return { ok: true, transportistas: porTransportista.size, cargas: vencidas.length };
}

/**
 * Avisa a la empresa cuando una carga ACTIVA está por vencer (o ya venció)
 * sin ningún transportista aceptado, para que edite la fecha o gestione la
 * convocatoria a tiempo. Se repite una vez por día mientras el problema siga
 * sin resolverse (mismo patrón que enviarRecordatoriosCompletar).
 *
 * El umbral de reintento son 20hs y no 24: el cron corre una vez por día, y
 * con 24hs exactas alcanzaba con que hoy arrancara un segundo antes que ayer
 * para que el recordatorio de ayer no contara todavía como vencido y se
 * saltara el día entero.
 */
export async function enviarRecordatoriosSinPostulantes() {
  const limite = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const umbral = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const cargas = await findCargasProximasSinAceptar(limite, umbral);
  if (cargas.length === 0) return { ok: true, cargas: 0 };

  const ahora = new Date();

  await Promise.allSettled(
    cargas.map((c) => {
      const vencida = c.fechaCarga < ahora;
      return sendPushToUser(c.empresaId, {
        title: vencida ? "Carga sin transportista, fecha vencida" : "Tu carga está por vencer sin postulantes",
        body: vencida
          ? `"${c.titulo}" ya pasó su fecha de carga y no tenés ningún transportista aceptado. Editá la fecha o revisá las postulaciones.`
          : `"${c.titulo}" vence pronto y no tenés ningún transportista aceptado. Editá la fecha si hace falta.`,
        url: `/empresa/cargas/${c.id}`,
      });
    }),
  );

  await marcarRecordatorioSinPostulantesEnviado(cargas.map((c) => c.id));
  return { ok: true, cargas: cargas.length };
}

/**
 * Cancela automáticamente las cargas ACTIVA cuya fecha de carga ya pasó. Una
 * carga solo sigue ACTIVA mientras la convocatoria está abierta (al cubrirse
 * pasa a ASIGNADA), así que acá caen tanto las que no tuvieron ningún aceptado
 * como las que quedaron a medio cubrir.
 *
 * No se borra en el acto: la carga queda CANCELADA y visible en el listado de
 * la empresa durante DIAS_GRACIA_CANCELADA para que pueda reactivarla con una
 * fecha nueva. Pasada esa ventana sin tocarla, purgarCargasCanceladas la borra.
 *
 * El umbral es el inicio del día de hoy, no `now`: la comparación es contra
 * `fechaCarga`, que se guarda a medianoche, y usar `now` mataría una carga
 * fechada hoy mismo cuando el cron corre a las 14:00.
 */
export async function cancelarCargasVencidasSinAceptar() {
  const inicioDeHoy = new Date();
  inicioDeHoy.setUTCHours(0, 0, 0, 0);
  const cargas = await findCargasVencidasParaCancelar(inicioDeHoy);
  if (cargas.length === 0) return { ok: true, cargas: 0 };

  await cancelarCargas(cargas.map((c) => c.id));

  await Promise.allSettled(
    cargas.flatMap((c) => [
      sendPushToUser(c.empresaId, {
        title: "Carga cancelada automáticamente",
        body: `"${c.titulo}" se canceló porque pasó su fecha sin cubrir la convocatoria. Podés reactivarla con una fecha nueva durante ${DIAS_GRACIA_CANCELADA} días.`,
        url: `/empresa/cargas/${c.id}`,
      }),
      // Los aceptados de una convocatoria que quedó incompleta pierden el
      // viaje: su postulación se rechaza, avisarles para que no la esperen.
      ...c.postulaciones.map((p) =>
        sendPushToUser(p.transportistaId, {
          title: "Carga dada de baja",
          body: `"${c.titulo}" se canceló porque la empresa no llegó a cubrir la convocatoria a tiempo.`,
          url: `/transportista/cargas`,
        }),
      ),
    ]),
  );

  return { ok: true, cargas: cargas.length };
}

/**
 * Cancela las PENDIENTE_PAGO cuya fecha ya pasó. Va aparte de
 * cancelarCargasVencidasSinAceptar porque el caso es otro: acá no hubo
 * convocatoria que cubrir ni transportistas a los que avisar, solo un pago de
 * publicación que nunca se completó.
 *
 * Quedan CANCELADA y no borradas para que la empresa vea qué pasó con lo que
 * cargó, pero no son reactivables: la carga nunca se pagó, así que
 * reactivarCargaCancelada las rechaza y el camino correcto es "Repetir carga",
 * que pasa de nuevo por el checkout.
 */
export async function cancelarPendientesDePagoVencidas() {
  const inicioDeHoy = new Date();
  inicioDeHoy.setUTCHours(0, 0, 0, 0);
  const cargas = await findCargasPendientePagoVencidas(inicioDeHoy);
  if (cargas.length === 0) return { ok: true, cargas: 0 };

  await cancelarCargas(cargas.map((c) => c.id));

  await Promise.allSettled(
    cargas.map((c) =>
      sendPushToUser(c.empresaId, {
        title: "Carga cancelada por falta de pago",
        body: `"${c.titulo}" se canceló: pasó su fecha de carga y el pago de la publicación nunca se completó.`,
        url: `/empresa/cargas/${c.id}`,
      }),
    ),
  );

  return { ok: true, cargas: cargas.length };
}

/**
 * Purga cargas CANCELADA con más de DIAS_GRACIA_CANCELADA días desde su
 * última actualización. Ese updatedAt es el momento en que se cancelaron (o
 * el de la última modificación de la empresa dentro de la ventana), así que
 * lo que se borra es lo que quedó cancelado y sin tocar.
 */
export async function purgarCargasCanceladas() {
  const umbral = new Date(Date.now() - DIAS_GRACIA_CANCELADA * 24 * 60 * 60 * 1000);
  const cargas = await findCargasCanceladasParaPurgar(umbral);
  if (cargas.length === 0) return { ok: true, cargas: 0 };

  await eliminarCargas(cargas.map((c) => c.id));

  return { ok: true, cargas: cargas.length };
}

/**
 * Cierra los viajes que quedaron colgados porque nadie apretó el botón que
 * les tocaba. Sin esto una ASIGNADA se queda en el listado para siempre: no
 * hay ninguna otra transición automática desde ASIGNADA ni desde
 * EN_CONFIRMACION.
 *
 * La escalera es de dos pasos y usa los estados que ya existen:
 *
 *   ASIGNADA (viaje vencido hace DIAS_ASIGNADA_ABANDONADA)
 *     -> EN_CONFIRMACION, dando el viaje por realizado
 *   EN_CONFIRMACION (sin respuesta hace DIAS_EN_CONFIRMACION_ABANDONADA)
 *     -> FINALIZADA
 *
 * Cada paso avisa a las dos partes, y en ninguno se pierde la salida de
 * emergencia: mientras la carga esté en ASIGNADA o EN_CONFIRMACION cualquiera
 * de los dos puede abrir una disputa, que la saca de este circuito.
 *
 * No hay plata retenida por la plataforma en estos estados: la publicación la
 * paga la empresa antes de que la carga sea ACTIVA y la comisión la paga el
 * transportista antes de que la carga sea ASIGNADA, así que llegar acá no
 * mueve ningún cobro. El flete se arregla entre las partes fuera de la app.
 */
export async function cerrarViajesAbandonados() {
  const umbralAsignada = new Date(
    Date.now() - DIAS_ASIGNADA_ABANDONADA * 24 * 60 * 60 * 1000,
  );
  const asignadas = await findCargasAsignadasAbandonadas(umbralAsignada);

  if (asignadas.length > 0) {
    await marcarCargasEnConfirmacion(asignadas.map((c) => c.id));

    await Promise.allSettled(
      asignadas.flatMap((c) => [
        sendPushToUser(c.empresaId, {
          title: "Viaje dado por realizado",
          body: `"${c.titulo}" quedó sin cerrar y se dio por realizado. Tenés ${DIAS_EN_CONFIRMACION_ABANDONADA} días para confirmarlo o abrir una disputa.`,
          url: `/empresa/cargas/${c.id}`,
        }),
        ...destinatariosTransportistas(c).map((transportistaId) =>
          sendPushToUser(transportistaId, {
            title: "Viaje dado por realizado",
            body: `"${c.titulo}" quedó sin marcar como completado y se dio por realizado. Si hubo algún problema, abrí una disputa.`,
            url: `/transportista/cargas/${c.id}`,
          }),
        ),
      ]),
    );
  }

  // Las que se acaban de mover arriba tienen updatedAt de recién, así que no
  // caen en esta query: recién entran dentro de DIAS_EN_CONFIRMACION_ABANDONADA.
  const umbralConfirmacion = new Date(
    Date.now() - DIAS_EN_CONFIRMACION_ABANDONADA * 24 * 60 * 60 * 1000,
  );
  const enConfirmacion = await findCargasEnConfirmacionAbandonadas(umbralConfirmacion);

  if (enConfirmacion.length > 0) {
    await finalizarCargas(enConfirmacion.map((c) => c.id));

    await Promise.allSettled(
      enConfirmacion.flatMap((c) => [
        sendPushToUser(c.empresaId, {
          title: "Viaje cerrado automáticamente",
          body: `"${c.titulo}" se cerró sin tu confirmación tras ${DIAS_EN_CONFIRMACION_ABANDONADA} días. Ya podés calificar al transportista.`,
          url: `/empresa/cargas/${c.id}`,
        }),
        ...destinatariosTransportistas(c).map((transportistaId) =>
          sendPushToUser(transportistaId, {
            title: "Viaje cerrado automáticamente",
            body: `"${c.titulo}" se cerró sin confirmación de la empresa. Ya podés calificarla.`,
            url: `/transportista/cargas/${c.id}`,
          }),
        ),
      ]),
    );
  }

  return {
    ok: true,
    dadasPorRealizadas: asignadas.length,
    finalizadas: enConfirmacion.length,
  };
}

/**
 * Una carga cubierta por varios camiones tiene un transportista por
 * postulación aceptada; transportistaAsignadoId guarda solo al primero, así
 * que hay que unir las dos fuentes para no dejar a nadie sin aviso.
 */
function destinatariosTransportistas(carga: {
  transportistaAsignadoId: string | null;
  postulaciones: { transportistaId: string }[];
}): string[] {
  const ids = new Set(carga.postulaciones.map((p) => p.transportistaId));
  if (carga.transportistaAsignadoId) ids.add(carga.transportistaAsignadoId);
  return Array.from(ids);
}

export type ReactivarCargaResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Devuelve una CANCELADA al ruedo con fecha nueva. Se exige fecha futura: sin
 * eso el cron la volvería a cancelar en la corrida siguiente.
 */
export async function reactivarCargaCancelada(
  cargaId: number,
  empresaId: string,
  fechaCarga: Date,
  fechaCupo: Date | null,
): Promise<ReactivarCargaResult> {
  const carga = await findCargaCanceladaDeEmpresa(cargaId, empresaId);
  if (!carga) {
    return { ok: false, status: 404, error: "Carga no encontrada o no reactivable" };
  }

  // Sin este chequeo, una PENDIENTE_PAGO cancelada por falta de pago volvería
  // a ACTIVA sin pasar por el checkout: publicación gratis. `pagado` es true
  // en las tres vías de publicación (free tier, pago aprobado y oferta
  // privada), así que en false significa que nunca se publicó.
  if (!carga.pagado) {
    return {
      ok: false,
      status: 400,
      error: "Esta carga nunca se pagó. Usá \"Repetir carga\" para publicarla de nuevo.",
    };
  }

  const inicioDeHoy = new Date();
  inicioDeHoy.setUTCHours(0, 0, 0, 0);
  if (fechaCarga < inicioDeHoy) {
    return { ok: false, status: 400, error: "La fecha de carga tiene que ser futura" };
  }
  if (fechaCupo && fechaCupo < fechaCarga) {
    return { ok: false, status: 400, error: "La fecha de cupo no puede ser anterior a la fecha de carga" };
  }

  await reactivarCarga(cargaId, fechaCarga, fechaCupo);

  return { ok: true };
}
