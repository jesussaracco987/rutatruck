import { after } from "next/server";
import { onUnaVez } from "@/lib/events/bus";
import { sendPushToTransportistasCercanos, sendPushToUser } from "@/lib/push";
import { notifyEmpresa, notifyTransportista } from "@/lib/sse";
import { DIAS_EN_CONFIRMACION_ABANDONADA } from "@/lib/plazos";

/**
 * Los listeners disparan trabajo async (push + SSE) sin bloquear la respuesta
 * HTTP. En Vercel, la función serverless puede congelarse apenas se envía la
 * respuesta, matando esas promesas a mitad de camino si no van dentro de
 * `after()` — por eso todo el trabajo de cada listener se agrupa en un único
 * `after()` en vez de quedar "fire-and-forget" suelto.
 */

function notificarCargaDisponibleCercana({
  titulo,
  origen,
  destino,
  origenLat,
  origenLng,
  empresaId,
}: {
  titulo: string;
  origen: string;
  destino: string;
  origenLat: number | null;
  origenLng: number | null;
  empresaId: string;
}) {
  // El título de una carga publicada ya es "origen → destino": repetirlo
  // duplicaba la ruta en el aviso. Solo se antepone si dice otra cosa.
  const ruta = `${origen} → ${destino}`;
  after(() =>
    sendPushToTransportistasCercanos(
      {
        title: "Nueva carga disponible",
        body: titulo && titulo !== ruta ? `${titulo} · ${ruta}` : ruta,
        url: "/transportista/cargas",
      },
      origenLat,
      origenLng,
      empresaId,
    ).catch(() => {}),
  );
}

onUnaVez("pago.aprobado.publicacion", notificarCargaDisponibleCercana);
onUnaVez("carga.publicada", notificarCargaDisponibleCercana);

onUnaVez("postulacion.aceptada", ({ transportistaId, cargaId, titulo, convocatoriaCubierta }) => {
  console.log("[listener] postulacion.aceptada recibido", { transportistaId, cargaId });
  const body = convocatoriaCubierta
    ? `Sos el transportista asignado para "${titulo}". Iniciá una conversación con la empresa desde la app para coordinar.`
    : `Fuiste aceptado para "${titulo}". La empresa está coordinando los transportistas restantes.`;

  after(async () => {
    console.log("[listener] postulacion.aceptada after() ejecutando", { transportistaId });
    await Promise.allSettled([
      sendPushToUser(transportistaId, {
        title: "¡Fuiste seleccionado!",
        body,
        url: `/transportista/cargas/${cargaId}`,
      }),
      notifyTransportista(transportistaId),
    ]);
  });
});

onUnaVez("comision.requerida", ({ cargaId, titulo, transportistaIds, deadlineHoras }) => {
  after(async () => {
    await Promise.allSettled(
      transportistaIds.flatMap((transportistaId) => [
        sendPushToUser(transportistaId, {
          title: "¡Fuiste seleccionado!",
          body: `Tenés ${deadlineHoras} horas para pagar la comisión y confirmar el viaje "${titulo}".`,
          url: `/transportista/cargas/${cargaId}`,
        }),
        notifyTransportista(transportistaId),
      ]),
    );
  });
});

onUnaVez("oferta-privada.respondida", ({ empresaId, transportistaId, cargaId, titulo, accion, pagoPendiente }) => {
  after(async () => {
    await Promise.allSettled([
      accion === "aceptar"
        ? sendPushToUser(empresaId, {
            title: "¡Oferta aceptada!",
            body: pagoPendiente
              ? `El transportista aceptó tu oferta para "${titulo}". El viaje se confirma cuando pague la comisión.`
              : `El transportista aceptó tu oferta para "${titulo}". Iniciá una conversación desde la app para coordinar.`,
            url: `/empresa/cargas/${cargaId}`,
          })
        : sendPushToUser(empresaId, {
            title: "Oferta rechazada",
            body: `El transportista rechazó tu oferta para "${titulo}".`,
            url: `/empresa/cargas/${cargaId}`,
          }),
      notifyEmpresa(empresaId),
      notifyTransportista(transportistaId),
    ]);
  });
});

onUnaVez("carga.completada", ({ empresaId, cargaId, titulo }) => {
  after(async () => {
    await Promise.allSettled([
      sendPushToUser(empresaId, {
        title: "Viaje marcado como completado",
        body: `El transportista marcó "${titulo}" como completado. Confirmá o abrí una disputa: si no respondés en ${DIAS_EN_CONFIRMACION_ABANDONADA} días se cierra solo.`,
        url: `/empresa/cargas/${cargaId}`,
      }),
      notifyEmpresa(empresaId),
    ]);
  });
});

onUnaVez("convocatoria.cerrada", ({ cargaId, titulo, transportistaIds }) => {
  after(async () => {
    await Promise.allSettled(
      transportistaIds.flatMap((transportistaId) => [
        sendPushToUser(transportistaId, {
          title: "¡Convocatoria cerrada!",
          body: `Fuiste asignado para "${titulo}". Iniciá una conversación con la empresa desde la app para coordinar.`,
          url: `/transportista/cargas/${cargaId}`,
        }),
        notifyTransportista(transportistaId),
      ]),
    );
  });
});

onUnaVez("postulacion.creada", ({ cargaId, empresaId, titulo }) => {
  after(async () => {
    await Promise.allSettled([
      sendPushToUser(empresaId, {
        title: "Nueva postulación",
        body: `Un transportista se postuló a "${titulo}"`,
        url: `/empresa/cargas/${cargaId}`,
      }),
      notifyEmpresa(empresaId),
    ]);
  });
});

onUnaVez("postulacion.vista_transportista", ({ transportistaId }) => {
  after(() => notifyTransportista(transportistaId).catch(() => {}));
});

onUnaVez("postulacion.vista_empresa", ({ empresaId }) => {
  after(() => notifyEmpresa(empresaId).catch(() => {}));
});

onUnaVez("oferta-privada.creada", ({ transportistaId, cargaId, titulo }) => {
  after(async () => {
    await Promise.allSettled([
      sendPushToUser(transportistaId, {
        title: "Nueva oferta directa",
        body: `Una empresa te ofrece un servicio: ${titulo}`,
        url: `/transportista/cargas/${cargaId}`,
      }),
      notifyTransportista(transportistaId),
    ]);
  });
});

onUnaVez("mensaje.creado", ({ postulacionId, destinatarioId, destinatarioRole, autorNombre, cuerpo }) => {
  const preview = cuerpo.length > 80 ? `${cuerpo.slice(0, 80)}…` : cuerpo;
  const url =
    destinatarioRole === "empresa"
      ? `/empresa/conversaciones/${postulacionId}`
      : `/transportista/conversaciones/${postulacionId}`;

  after(async () => {
    await Promise.allSettled([
      sendPushToUser(destinatarioId, { title: `Mensaje de ${autorNombre}`, body: preview, url }),
      destinatarioRole === "empresa"
        ? notifyEmpresa(destinatarioId)
        : notifyTransportista(destinatarioId),
    ]);
  });
});
