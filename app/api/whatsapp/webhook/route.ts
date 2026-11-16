import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { VERIFICACION_TELEFONO_HABILITADA } from "@/lib/verificacion-telefono";
import {
  confirmarDesdeWhatsapp,
  respuestaConfirmacion,
} from "@/lib/services/verificacion-telefono.service";

/**
 * Webhook de la WhatsApp Cloud API (Meta). Por ahora solo procesa los mensajes
 * de confirmación de teléfono; el resto se ignora.
 *
 * Variables que pide al prenderlo:
 * - WHATSAPP_VERIFY_TOKEN: texto cualquiera, el mismo que se carga en Meta al
 *   suscribir el webhook.
 * - WHATSAPP_APP_SECRET: "App secret" de la app de Meta, para validar la firma.
 * - WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID: para responder. Sin ellas
 *   confirma igual, solo que no contesta (Mi cuenta se entera sola).
 */

const noEncontrado = () => new Response("Not found", { status: 404 });

/** Meta llama con GET una sola vez para verificar la suscripción. */
export async function GET(req: NextRequest) {
  if (!VERIFICACION_TELEFONO_HABILITADA) return noEncontrado();

  const params = req.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (params.get("hub.mode") === "subscribe" && token && params.get("hub.verify_token") === token) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type MensajeEntrante = { from: string; type: string; text?: { body?: string } };
type PayloadWebhook = {
  entry?: { changes?: { value?: { messages?: MensajeEntrante[] } }[] }[];
};

export async function POST(req: NextRequest) {
  if (!VERIFICACION_TELEFONO_HABILITADA) return noEncontrado();

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

  const mensajes = (payload.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) => c.value?.messages ?? [])
    .filter((m) => m.type === "text" && m.text?.body);

  for (const m of mensajes) {
    try {
      const resultado = await confirmarDesdeWhatsapp(m.from, m.text!.body!);
      const respuesta = respuestaConfirmacion(resultado);
      if (respuesta) await responder(m.from, respuesta);
    } catch (err) {
      // Meta reintenta si no recibe 200; un mensaje que falla no debe trabar al resto.
      console.error("[whatsapp/webhook]", err);
    }
  }

  return new Response("OK", { status: 200 });
}

function firmaValida(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const recibida = Buffer.from(header.slice("sha256=".length));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

async function responder(to: string, texto: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: texto } }),
  });
  if (!res.ok) console.error("[whatsapp/webhook] respuesta falló", res.status, await res.text());
}
