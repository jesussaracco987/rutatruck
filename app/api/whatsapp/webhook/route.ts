import { NextRequest, after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { VERIFICACION_TELEFONO_HABILITADA } from "@/lib/verificacion-telefono";
import { CARGAS_POR_WHATSAPP_HABILITADO, enviarWhatsapp } from "@/lib/whatsapp";
import { consumirLimite } from "@/lib/limite-uso";
import {
  confirmarDesdeWhatsapp,
  respuestaConfirmacion,
} from "@/lib/services/verificacion-telefono.service";
import { responderMensajeCarga, type EntradaWhatsapp } from "@/lib/services/whatsapp-carga.service";

/**
 * Webhook de la WhatsApp Cloud API (Meta). Atiende dos flujos, cada uno con su
 * constante para prenderlo:
 * - Confirmación de teléfono (VERIFICACION_TELEFONO_HABILITADA): mensajes que
 *   traen el código firmado de Mi cuenta.
 * - Publicar cargas (CARGAS_POR_WHATSAPP_HABILITADO): todo lo demás pasa por
 *   el asistente (ver whatsapp-carga.service).
 *
 * Queda activo apenas existe WHATSAPP_VERIFY_TOKEN, para poder suscribirlo en
 * Meta antes de prender cualquier flujo.
 *
 * Variables:
 * - WHATSAPP_VERIFY_TOKEN: texto cualquiera, el mismo que se carga en Meta al
 *   suscribir el webhook.
 * - WHATSAPP_APP_SECRET: "Clave secreta de la app" de Meta, para validar la firma.
 * - WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID: para responder. Sin ellas
 *   procesa igual, solo que no contesta.
 */

// El asistente puede tardar hasta 20 s en OpenAI, más el envío de la respuesta.
export const maxDuration = 60;

const noEncontrado = () => new Response("Not found", { status: 404 });
const webhookConfigurado = () => Boolean(process.env.WHATSAPP_VERIFY_TOKEN);

/** Meta llama con GET una sola vez para verificar la suscripción. */
export async function GET(req: NextRequest) {
  if (!webhookConfigurado()) return noEncontrado();

  const params = req.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (params.get("hub.mode") === "subscribe" && token && params.get("hub.verify_token") === token) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type MensajeEntrante = {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  location?: { latitude?: number; longitude?: number };
  interactive?: { type?: string; button_reply?: { id?: string } };
  /** Agregado acá: el nombre de perfil llega aparte, en `contacts`. */
  perfil?: string;
};
type PayloadWebhook = {
  entry?: {
    changes?: {
      value?: {
        messages?: MensajeEntrante[];
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
      };
    }[];
  }[];
};

function entradaDe(m: MensajeEntrante): EntradaWhatsapp {
  if (m.type === "text") return { tipo: "texto", texto: m.text?.body ?? "" };
  const { latitude: lat, longitude: lng } = m.location ?? {};
  if (m.type === "location" && typeof lat === "number" && typeof lng === "number") {
    return { tipo: "ubicacion", lat, lng };
  }
  const boton = m.interactive?.button_reply?.id;
  if (m.type === "interactive" && boton) return { tipo: "boton", id: boton };
  return { tipo: "otro" };
}

/** Tipos que no son un pedido (reacciones, mensajes que WhatsApp no soporta): no se contestan. */
const IGNORADOS = new Set(["reaction", "unsupported", "system", "request_welcome"]);

export async function POST(req: NextRequest) {
  if (!webhookConfigurado()) return noEncontrado();

  const raw = await req.text();
  if (!firmaValida(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: PayloadWebhook;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Los avisos de entrega y lectura llegan sin `messages`.
  const mensajes = (payload.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) =>
      (c.value?.messages ?? []).map((m) => ({
        ...m,
        perfil: c.value?.contacts?.find((k) => k.wa_id === m?.from)?.profile?.name,
      })),
    )
    .filter((m) => m?.id && m.from && !IGNORADOS.has(m.type));

  // Meta reintenta si no recibe 200 en pocos segundos, y el asistente tarda más:
  // se contesta ya y se procesa después.
  if (mensajes.length > 0) after(() => procesar(mensajes));

  return new Response("OK", { status: 200 });
}

async function procesar(mensajes: MensajeEntrante[]) {
  for (const m of mensajes) {
    try {
      // Un reintento de Meta trae el mismo id: se atiende una sola vez.
      if (!(await consumirLimite(`wa-msg:${m.id}`, 1, 24 * 60 * 60 * 1000))) continue;

      const entrada = entradaDe(m);

      if (VERIFICACION_TELEFONO_HABILITADA && entrada.tipo === "texto") {
        const resultado = await confirmarDesdeWhatsapp(m.from, entrada.texto);
        if (resultado.ok || resultado.motivo !== "sin-codigo") {
          const respuesta = respuestaConfirmacion(resultado);
          if (respuesta) await enviarWhatsapp(m.from, respuesta);
          continue;
        }
      }

      if (!CARGAS_POR_WHATSAPP_HABILITADO) continue;
      // null: número bloqueado o tope ya avisado, no se contesta.
      const respuesta = await responderMensajeCarga(m.from, entrada, m.perfil);
      if (respuesta) await enviarWhatsapp(m.from, respuesta);
    } catch (err) {
      // Un mensaje que falla no debe trabar al resto.
      console.error("[whatsapp/webhook]", err);
    }
  }
}

function firmaValida(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const recibida = Buffer.from(header.slice("sha256=".length));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
