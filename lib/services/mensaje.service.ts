import {
  crearMensaje,
  findPostulacionParaChat,
  contarMensajesRecientesDeAutor,
  findCargaConAceptadosParaDifusion,
} from "@/lib/repositories/mensaje.repository";
import { emit } from "@/lib/events/bus";
import { consumirLimite } from "@/lib/limite-uso";
import { puedeChatear } from "@/lib/match";
import { esChatVigente } from "@/lib/chat";

/** Techo de envío: 10 mensajes cada 10 segundos por autor, sumando todos sus hilos. */
const MAX_MENSAJES_POR_VENTANA = 10;
const VENTANA_ENVIO_MS = 10_000;

export type EnviarMensajeResult =
  | { ok: true; mensaje: Awaited<ReturnType<typeof crearMensaje>> }
  | { ok: false; status: number; error: string };

export async function enviarMensaje(
  postulacionId: number,
  autorId: string,
  cuerpoCrudo: string,
): Promise<EnviarMensajeResult> {
  const cuerpo = cuerpoCrudo.trim();
  if (!cuerpo) {
    return { ok: false, status: 400, error: "El mensaje no puede estar vacío" };
  }
  if (cuerpo.length > 2000) {
    return { ok: false, status: 400, error: "Mensaje demasiado largo" };
  }

  // Cada mensaje dispara un push al otro extremo, así que sin techo un cliente
  // en loop se convierte en un generador de notificaciones. Se chequea antes de
  // resolver permisos para que el intento cueste un count y no un join.
  const recientes = await contarMensajesRecientesDeAutor(
    autorId,
    new Date(Date.now() - VENTANA_ENVIO_MS),
  );
  if (recientes >= MAX_MENSAJES_POR_VENTANA) {
    return {
      ok: false,
      status: 429,
      error: "Estás enviando mensajes demasiado rápido. Esperá unos segundos.",
    };
  }

  const postulacion = await findPostulacionParaChat(postulacionId, autorId);
  if (!postulacion) {
    return { ok: false, status: 404, error: "Conversación no encontrada" };
  }

  const mensaje = await crearMensaje(postulacionId, autorId, cuerpo);

  // Un hilo es una postulación: quien publica y el transportista. Si es una
  // postulación grupal, también los miembros aceptados del grupo. Les llega a
  // todos menos al que escribió.
  const participantes = participantesDelHilo(postulacion);
  const autorNombre = participantes.find((p) => p.id === autorId)?.nombre ?? "";
  for (const p of participantes) {
    if (p.id === autorId) continue;
    emit("mensaje.creado", {
      postulacionId,
      autorId,
      destinatarioId: p.id,
      destinatarioRole: p.rol,
      autorNombre,
      cuerpo,
      titulo: postulacion.carga.titulo,
    });
  }

  return { ok: true, mensaje };
}

type HiloConParticipantes = NonNullable<Awaited<ReturnType<typeof findPostulacionParaChat>>>;

/** Todos los que están en el hilo, con el nombre que ven los demás. */
export function participantesDelHilo(hilo: HiloConParticipantes) {
  return [
    { id: hilo.carga.empresaId, nombre: hilo.carga.empresa.name, rol: "empresa" as const },
    { id: hilo.transportistaId, nombre: hilo.transportista.name, rol: "transportista" as const },
    ...hilo.miembros.map((m) => ({
      id: m.transportistaId,
      nombre: m.transportista.name,
      rol: "transportista" as const,
    })),
  ];
}

/** Difusiones por carga y por hora: cada una dispara un push a cada transportista. */
const MAX_DIFUSIONES_POR_HORA = 10;

export type MensajeATodosResult =
  | { ok: true; enviados: number }
  | { ok: false; status: number; error: string };

/**
 * Un mismo mensaje de quien publica a todos los transportistas aceptados de la
 * carga (horario, lugar de carga, documentación). No hay chat grupal: se
 * escribe en el hilo de cada uno, así la respuesta de cada transportista sigue
 * siendo privada y cada hilo conserva su historia.
 *
 * Solo llega a los hilos habilitados: match confirmado y chat todavía vigente.
 */
export async function enviarMensajeATodos(
  cargaId: number,
  empresaId: string,
  cuerpoCrudo: string,
): Promise<MensajeATodosResult> {
  const cuerpo = cuerpoCrudo.trim();
  if (!cuerpo) return { ok: false, status: 400, error: "El mensaje no puede estar vacío" };
  if (cuerpo.length > 2000) return { ok: false, status: 400, error: "Mensaje demasiado largo" };

  const carga = await findCargaConAceptadosParaDifusion(cargaId, empresaId);
  if (!carga) return { ok: false, status: 404, error: "Carga no encontrada" };
  if (!esChatVigente(carga)) return { ok: false, status: 409, error: "El chat de esta carga ya cerró" };

  const hilos = carga.postulaciones.filter((p) => puedeChatear({ ...p, carga }));
  if (hilos.length === 0) {
    return { ok: false, status: 409, error: "Todavía no hay transportistas con el chat habilitado" };
  }

  if (!(await consumirLimite(`difusion:${cargaId}`, MAX_DIFUSIONES_POR_HORA))) {
    return { ok: false, status: 429, error: "Mandaste muchos mensajes a todos. Probá en un rato." };
  }

  for (const p of hilos) {
    await crearMensaje(p.id, empresaId, cuerpo);
    emit("mensaje.creado", {
      postulacionId: p.id,
      autorId: empresaId,
      destinatarioId: p.transportistaId,
      destinatarioRole: "transportista",
      autorNombre: carga.empresa.name,
      cuerpo,
      titulo: carga.titulo,
    });
  }
  return { ok: true, enviados: hilos.length };
}
