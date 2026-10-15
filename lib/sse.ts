import { db } from "./db";
import { countMensajesNoLeidos } from "./repositories/mensaje.repository";
import { countDisponibilidadesNuevas } from "./repositories/disponibilidad.repository";

type Ctrl = ReadableStreamDefaultController<Uint8Array>;
export type Vista = "empresa" | "transportista";

/**
 * Keyed por usuario Y vista. Una cuenta EMPRESA_TRANSPORTISTA puede tener
 * abiertos streams de los dos lados; con la clave solo por userId, un
 * notifyEmpresa() (p. ej. nueva postulación) le llegaba también al stream del
 * lado transportista y le pisaba el contador de la campana con números de la
 * empresa: globo rojo y, al abrirla, la lista de transportista vacía.
 */
const subs = new Map<string, Set<Ctrl>>();
const enc = new TextEncoder();

const canal = (userId: string, vista: Vista) => `${userId}:${vista}`;

export function sseSubscribe(userId: string, vista: Vista, ctrl: Ctrl) {
  const key = canal(userId, vista);
  if (!subs.has(key)) subs.set(key, new Set());
  subs.get(key)!.add(ctrl);
}

export function sseUnsubscribe(userId: string, vista: Vista, ctrl: Ctrl) {
  const key = canal(userId, vista);
  const s = subs.get(key);
  if (!s) return;
  s.delete(ctrl);
  if (s.size === 0) subs.delete(key);
}

function ssePush(userId: string, vista: Vista, data: unknown) {
  const s = subs.get(canal(userId, vista));
  if (!s?.size) return;
  const chunk = enc.encode(`event: update\ndata: ${JSON.stringify(data)}\n\n`);
  for (const ctrl of [...s]) {
    try { ctrl.enqueue(chunk); }
    catch { s.delete(ctrl); }
  }
}

/**
 * Pub/sub separado para hilos de chat abiertos, keyed por postulacionId en vez de
 * userId. Igual que `subs`, vive en memoria de una sola instancia serverless
 * — el push cross-instancia puede no llegar, por eso el stream de chat
 * (app/api/conversaciones/[postulacionId]/stream) también re-consulta la DB en
 * cada tick: esto es solo el atajo cuando cae en la misma instancia.
 */
const chatSubs = new Map<number, Set<Ctrl>>();

export function chatSubscribe(postulacionId: number, ctrl: Ctrl) {
  if (!chatSubs.has(postulacionId)) chatSubs.set(postulacionId, new Set());
  chatSubs.get(postulacionId)!.add(ctrl);
}

export function chatUnsubscribe(postulacionId: number, ctrl: Ctrl) {
  const s = chatSubs.get(postulacionId);
  if (!s) return;
  s.delete(ctrl);
  if (s.size === 0) chatSubs.delete(postulacionId);
}

/** `mensajes` es un array para compartir el mismo evento SSE que usa el polling en stream/route.ts. */
export function chatPush(postulacionId: number, mensajes: unknown[]) {
  const s = chatSubs.get(postulacionId);
  if (!s?.size) return;
  const chunk = enc.encode(`event: mensajes\ndata: ${JSON.stringify(mensajes)}\n\n`);
  for (const ctrl of [...s]) {
    try { ctrl.enqueue(chunk); }
    catch { s.delete(ctrl); }
  }
}

/** Señal efímera "está escribiendo": no se persiste, solo se relaya a quien tenga el hilo abierto en esta misma instancia. */
export function chatPushTyping(postulacionId: number, autorId: string) {
  const s = chatSubs.get(postulacionId);
  if (!s?.size) return;
  const chunk = enc.encode(`event: typing\ndata: ${JSON.stringify({ autorId })}\n\n`);
  for (const ctrl of [...s]) {
    try { ctrl.enqueue(chunk); }
    catch { s.delete(ctrl); }
  }
}

/** Avisa que `lectorId` marcó como leídos los mensajes de la contraparte, para actualizar el check en el emisor. */
export function chatPushLeido(postulacionId: number, lectorId: string, en: string) {
  const s = chatSubs.get(postulacionId);
  if (!s?.size) return;
  const chunk = enc.encode(`event: leido\ndata: ${JSON.stringify({ lectorId, en })}\n\n`);
  for (const ctrl of [...s]) {
    try { ctrl.enqueue(chunk); }
    catch { s.delete(ctrl); }
  }
}

async function perfilIncompleto(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { phone: true, emailVerified: true },
  });
  return !user || !user.phone || !user.emailVerified;
}

export async function notifyTransportista(userId: string, extra?: Record<string, unknown>) {
  const [count, postulaciones, privadas, incompleto, mensajesNoLeidos] = await Promise.all([
    db.postulacion.count({
      where: { transportistaId: userId, estado: "ACEPTADA", vistaTransportista: false },
    }),
    db.postulacion.findMany({
      where: { transportistaId: userId },
      select: { id: true, estado: true, carga: { select: { estado: true } } },
      orderBy: { id: "asc" },
    }),
    db.carga.count({
      where: { transportistaDestinadoId: userId, esPrivada: true, estado: "ACTIVA" },
    }),
    perfilIncompleto(userId),
    countMensajesNoLeidos(userId, "transportista"),
  ]);
  const hash = [
    ...postulaciones.map((p) => `${p.id}:${p.estado}:${p.carga.estado}`),
    `priv:${privadas}`,
    `msj:${mensajesNoLeidos}`,
  ].join(",");
  ssePush(userId, "transportista", { count, privCount: privadas, hash, perfilIncompleto: incompleto, mensajesNoLeidos, ...extra });
  // Solo existe si es cuenta dual con el lado empresa abierto: le refresca el
  // badge del switcher sin tocar la campana de ese lado.
  ssePush(userId, "empresa", { otroRolPendiente: count + privadas + mensajesNoLeidos });
}

export async function notifyEmpresa(userId: string, extra?: Record<string, unknown>) {
  const [enConfirmacion, postulacionesNuevas, disponiblesNuevos, incompleto, mensajesNoLeidos] = await Promise.all([
    db.carga.count({ where: { empresaId: userId, estado: "EN_CONFIRMACION" } }),
    db.postulacion.count({
      where: { carga: { empresaId: userId }, estado: "PENDIENTE", vistaEmpresa: false },
    }),
    countDisponibilidadesNuevas(userId),
    perfilIncompleto(userId),
    countMensajesNoLeidos(userId, "empresa"),
  ]);
  const hash = [`conf:${enConfirmacion}`, `post:${postulacionesNuevas}`, `msj:${mensajesNoLeidos}`].join(",");
  ssePush(userId, "empresa", {
    // `count` es solo lo que el usuario puede marcar como visto. Las cargas
    // EN_CONFIRMACION son una acción pendiente: se van cuando confirma el
    // viaje, no cuando mira la campana. Sumarlas acá dejaba un badge rojo que
    // "Marcar todas como vistas" no podía limpiar nunca, y el usuario aprendía
    // a ignorarlo.
    count: postulacionesNuevas + disponiblesNuevos,
    accionesPendientes: enConfirmacion,
    hash,
    perfilIncompleto: incompleto,
    mensajesNoLeidos,
    ...extra,
  });
  ssePush(userId, "transportista", {
    otroRolPendiente: enConfirmacion + postulacionesNuevas + disponiblesNuevos + mensajesNoLeidos,
  });
}

/** Total de pendientes del lado empresa, para el badge del switcher de rol en cuentas duales. */
export async function totalPendienteEmpresa(userId: string): Promise<number> {
  const [enConfirmacion, postulacionesNuevas, disponiblesNuevos, mensajesNoLeidos] = await Promise.all([
    db.carga.count({ where: { empresaId: userId, estado: "EN_CONFIRMACION" } }),
    db.postulacion.count({
      where: { carga: { empresaId: userId }, estado: "PENDIENTE", vistaEmpresa: false },
    }),
    countDisponibilidadesNuevas(userId),
    countMensajesNoLeidos(userId, "empresa"),
  ]);
  return enConfirmacion + postulacionesNuevas + disponiblesNuevos + mensajesNoLeidos;
}

/** Total de pendientes del lado transportista, para el badge del switcher de rol en cuentas duales. */
export async function totalPendienteTransportista(userId: string): Promise<number> {
  const [count, privadas, mensajesNoLeidos] = await Promise.all([
    db.postulacion.count({
      where: { transportistaId: userId, estado: "ACEPTADA", vistaTransportista: false },
    }),
    db.carga.count({
      where: { transportistaDestinadoId: userId, esPrivada: true, estado: "ACTIVA" },
    }),
    countMensajesNoLeidos(userId, "transportista"),
  ]);
  return count + privadas + mensajesNoLeidos;
}
