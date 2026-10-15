import webpush from "web-push";
import { db } from "./db";
import { enAlcance, enZona, tieneZonaConfigurada } from "./zona";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const ROLES_TRANSPORTISTA = [
  "TRANSPORTISTA",
  "TRANSPORTISTA_FLOTA",
  "EMPRESA_TRANSPORTISTA",
] as const;

const ROLES_EMPRESA = ["EMPRESA", "EMPRESA_TRANSPORTISTA"] as const;

export type PushPayload = { title: string; body: string; url?: string };

/**
 * Envío individual. Es el único lugar que habla con web-push: centraliza el
 * JSON.stringify, el log y la limpieza de subscripciones muertas (410/404).
 * Nunca propaga el error — un endpoint caído no puede tumbar el resto del
 * lote — así que devuelve si el envío salió o no.
 *
 * Todo envío pasa por acá a propósito: cuando el cron de cargas se escribió
 * su propia copia de esta lógica terminó ignorando el filtro de zona durante
 * meses sin que nada lo delatara.
 */
async function enviar(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  contexto: string,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err) {
    const { statusCode, body } = err as { statusCode?: number; body?: string };
    console.error(`[push] ${contexto} fallo`, statusCode, body);
    if (statusCode === 410 || statusCode === 404) {
      await db.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
    }
    return false;
  }
}


/**
 * Techo de envíos simultáneos. Un `Promise.allSettled` sobre todas las
 * subscripciones abría N conexiones HTTPS a la vez desde una sola función
 * serverless: con miles de suscriptores eso choca contra los límites de sockets
 * y contra el tiempo que `after()` mantiene viva la invocación.
 */
const CONCURRENCIA_PUSH = 25;

async function enLotes<T>(items: T[], tarea: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += CONCURRENCIA_PUSH) {
    await Promise.allSettled(items.slice(i, i + CONCURRENCIA_PUSH).map(tarea));
  }
}
export async function sendPushToAllTransportistas(
  payload: PushPayload,
  excludeUserId?: string
) {
  const subscriptions = await db.pushSubscription.findMany({
    where: {
      user: {
        role: { in: [...ROLES_TRANSPORTISTA] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    },
  });

  await enLotes(subscriptions, (sub) => enviar(sub, payload, "sendPushToAllTransportistas"));
}

export async function sendPushToTransportistasCercanos(
  payload: PushPayload,
  origenLat: number | null,
  origenLng: number | null,
  excludeUserId?: string
) {
  const subscriptions = await db.pushSubscription.findMany({
    where: {
      user: {
        role: { in: [...ROLES_TRANSPORTISTA] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    },
    include: {
      user: { select: { notifZonaLat: true, notifZonaLng: true, notifRadioKm: true } },
    },
  });

  const filtered = subscriptions.filter((sub) => enZona(sub.user, origenLat, origenLng));

  await enLotes(filtered, (sub) => enviar(sub, payload, "sendPushToTransportistasCercanos"));
}

/**
 * Espejo de sendPushToTransportistasCercanos para el otro lado: avisa a las
 * empresas que un transportista quedó disponible cerca. Usa la misma zona de
 * interés del usuario; una empresa sin zona configurada recibe todos. Con
 * zona, alcanza con que la cubra su radio o el radio de trabajo del
 * transportista (`radioKm` de la disponibilidad).
 */
export async function sendPushToEmpresasCercanas(
  payload: PushPayload,
  lat: number,
  lng: number,
  radioKm: number | null,
  excludeUserId?: string
) {
  const subscriptions = await db.pushSubscription.findMany({
    where: {
      user: {
        role: { in: [...ROLES_EMPRESA] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    },
    include: {
      user: { select: { notifZonaLat: true, notifZonaLng: true, notifRadioKm: true } },
    },
  });

  const filtered = subscriptions.filter((sub) => enAlcance(sub.user, lat, lng, radioKm));

  await enLotes(filtered, (sub) => enviar(sub, payload, "sendPushToEmpresasCercanas"));
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  await enLotes(subscriptions, (sub) => enviar(sub, payload, "sendPushToUser"));
}

/**
 * Resumen diario de cargas disponibles. A diferencia de un blast, a cada
 * transportista se le cuentan solo las cargas que caen dentro de su zona
 * configurada, y si no le queda ninguna no se le manda nada: un aviso de
 * "hay 8 cargas" sobre cargas del otro lado del país es lo que hace que la
 * gente apague las notificaciones y se pierda también las que importan.
 *
 * `cargas` ya viene filtrado por quien llama (activas y públicas); acá solo
 * se recorta por zona.
 */
export async function sendDigestCargasDisponibles(
  cargas: { origenLat: number | null; origenLng: number | null }[],
  url = "/transportista/cargas",
) {
  const subscriptions = await db.pushSubscription.findMany({
    where: { user: { role: { in: [...ROLES_TRANSPORTISTA] } } },
    include: {
      user: { select: { notifZonaLat: true, notifZonaLng: true, notifRadioKm: true } },
    },
  });

  let enviadas = 0;
  let fallidas = 0;
  let sinCargasEnZona = 0;

  await enLotes(subscriptions, async (sub) => {
      const relevantes = cargas.filter((c) => enZona(sub.user, c.origenLat, c.origenLng)).length;
      if (relevantes === 0) {
        sinCargasEnZona++;
        return;
      }

      const plural = relevantes !== 1;
      const body = tieneZonaConfigurada(sub.user)
        ? `${relevantes} carga${plural ? "s" : ""} disponible${plural ? "s" : ""} en tu zona.`
        : `${relevantes} carga${plural ? "s" : ""} activa${plural ? "s" : ""} esperando transportistas.`;

      const ok = await enviar(
        sub,
        { title: "¡Hay cargas disponibles!", body, url },
        "sendDigestCargasDisponibles",
      );
      if (ok) enviadas++;
      else fallidas++;
  });

  return { suscripciones: subscriptions.length, enviadas, fallidas, sinCargasEnZona };
}
