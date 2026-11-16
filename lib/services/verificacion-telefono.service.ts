import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { normalizarTelefono } from "@/lib/telefono";
import { whatsappUrl } from "@/lib/site";

/**
 * Confirmación del teléfono sin costo: en vez de mandarle un código (las
 * plantillas de autenticación de WhatsApp se cobran), la persona nos escribe
 * desde su WhatsApp con un mensaje precargado que lleva un código firmado. Los
 * mensajes entrantes no se cobran, y el número que lo envía queda probado
 * porque WhatsApp lo informa en el webhook.
 *
 * El código es `<userId>.<vence>.<firma>`, firmado con SESSION_SECRET: no hace
 * falta guardarlo en la base. Al confirmar, el número del remitente pasa a
 * `telefonoLogin` y desde ahí sirve para entrar.
 */

const VIGENCIA_MS = 30 * 60 * 1000;
const CODIGO_RE = /([a-z0-9]{20,40})\.([a-z0-9]{6,12})\.([A-Za-z0-9_-]{16})/;

function firmar(userId: string, vence: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "")
    .update(`telefono:${userId}:${vence}`)
    .digest("base64url")
    .slice(0, 16);
}

/** Link wa.me con el mensaje de confirmación, o null si no hay número de WhatsApp configurado. */
export function linkConfirmacion(userId: string): string | null {
  const vence = (Date.now() + VIGENCIA_MS).toString(36);
  const codigo = `${userId}.${vence}.${firmar(userId, vence)}`;
  return whatsappUrl(`Hola! Quiero confirmar mi teléfono en ClickCargo. Código: ${codigo}`);
}

export type ResultadoConfirmacion =
  | { ok: true; telefono: string }
  | { ok: false; motivo: "sin-codigo" | "codigo-invalido" | "vencido" | "telefono-invalido" | "en-uso" };

/** Procesa un mensaje entrante de WhatsApp: `from` es el número que lo envió, tal como lo manda Meta. */
export async function confirmarDesdeWhatsapp(from: string, texto: string): Promise<ResultadoConfirmacion> {
  const match = texto.match(CODIGO_RE);
  if (!match) return { ok: false, motivo: "sin-codigo" };
  const [, userId, vence, firma] = match;

  const esperada = Buffer.from(firmar(userId, vence));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return { ok: false, motivo: "codigo-invalido" };
  }
  if (parseInt(vence, 36) < Date.now()) return { ok: false, motivo: "vencido" };

  // Meta puede informar los números argentinos con o sin el 9 del celular.
  const telefono = normalizarTelefono(from);
  if (!telefono) return { ok: false, motivo: "telefono-invalido" };

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, phone: true } });
  if (!user) return { ok: false, motivo: "codigo-invalido" };

  const otro = await db.user.findUnique({ where: { telefonoLogin: telefono }, select: { id: true } });
  if (otro && otro.id !== user.id) return { ok: false, motivo: "en-uso" };

  await db.user.update({
    where: { id: user.id },
    data: { telefonoLogin: telefono, ...(user.phone ? {} : { phone: telefono }) },
  });
  return { ok: true, telefono };
}

/** Respuesta al que escribió. Es gratis porque va dentro de las 24 h de su mensaje. */
export function respuestaConfirmacion(resultado: ResultadoConfirmacion): string | null {
  if (resultado.ok) {
    return "¡Listo! Tu teléfono quedó confirmado en ClickCargo. Ya podés entrar con este número y tu contraseña.";
  }
  switch (resultado.motivo) {
    case "sin-codigo":
      return null; // Cualquier otro mensaje: no es para este flujo.
    case "vencido":
      return "El código venció. Entrá a Mi cuenta en ClickCargo y tocá de nuevo \"Confirmar por WhatsApp\".";
    case "en-uso":
      return "Este número ya está confirmado en otra cuenta de ClickCargo. Si es un error, respondé este mensaje y lo revisamos.";
    default:
      return "No pudimos confirmar tu teléfono. Entrá a Mi cuenta en ClickCargo y tocá de nuevo \"Confirmar por WhatsApp\" sin cambiar el mensaje.";
  }
}
