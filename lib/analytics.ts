import { cookies } from "next/headers";
import { EVENTOS_COOKIE, type EventoAnalytics } from "@/lib/analytics-cookie";

/**
 * Registra un paso importante (registro, carga publicada, postulación, viaje
 * concretado) para Google Analytics y el píxel de Meta.
 *
 * Esos pasos se confirman en el servidor, pero ambos necesitan que el evento
 * salga del navegador del usuario para poder atribuirlo al anuncio por el que
 * llegó. Por eso acá solo se deja anotado en una cookie de vida corta, y
 * `app/_components/Analytics.tsx` lo envía y la borra.
 *
 * Nunca rompe el flujo que lo llama: sin `NEXT_PUBLIC_GA_ID` ni
 * `NEXT_PUBLIC_META_PIXEL_ID` no hace nada, y
 * fuera de un pedido del usuario (cron, webhook) falla en silencio.
 */
export async function registrarEvento(
  nombre: string,
  params?: EventoAnalytics["params"],
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_GA_ID && !process.env.NEXT_PUBLIC_META_PIXEL_ID) return;

  try {
    const store = await cookies();
    let pendientes: EventoAnalytics[] = [];
    try {
      const previos = JSON.parse(store.get(EVENTOS_COOKIE)?.value ?? "[]");
      if (Array.isArray(previos)) pendientes = previos;
    } catch {}

    store.set(EVENTOS_COOKIE, JSON.stringify([...pendientes, { nombre, params }]), {
      // Sin httpOnly: la tiene que leer el navegador.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
  } catch {}
}
