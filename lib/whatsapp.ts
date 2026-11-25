import "server-only";

/**
 * Publicar cargas escribiéndole al número de WhatsApp de ClickCargo (ver
 * whatsapp-carga.service). Constante y no variable de entorno, igual que
 * VERIFICACION_TELEFONO_HABILITADA: se prende o apaga con un commit.
 *
 * Mientras la app de Meta esté en modo desarrollo, solo pueden escribir los
 * números cargados como destinatarios de prueba.
 */
export const CARGAS_POR_WHATSAPP_HABILITADO = true;

/**
 * Lo que contesta el bot: texto solo, texto con botones de respuesta (hasta 3,
 * de 20 caracteres) o texto con el botón de WhatsApp para mandar la ubicación.
 */
export type RespuestaWhatsapp =
  | string
  | { texto: string; botones: { id: string; titulo: string }[] }
  | { texto: string; pedirUbicacion: true };

function cuerpo(respuesta: RespuestaWhatsapp): Record<string, unknown> {
  if (typeof respuesta === "string") {
    // El link de confirmación se ve con vista previa: ayuda a que lo toquen.
    return { type: "text", text: { body: respuesta, preview_url: true } };
  }
  if ("botones" in respuesta) {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: respuesta.texto.slice(0, 1024) },
        action: {
          buttons: respuesta.botones.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.titulo.slice(0, 20) },
          })),
        },
      },
    };
  }
  return {
    type: "interactive",
    interactive: {
      type: "location_request_message",
      body: { text: respuesta.texto.slice(0, 1024) },
      action: { name: "send_location" },
    },
  };
}

/**
 * Responde por la WhatsApp Cloud API. Dentro de las 24 h del último mensaje de
 * la persona es una respuesta de servicio y no se cobra; fuera de esa ventana
 * Meta la rechaza (haría falta una plantilla aprobada).
 *
 * Sin WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no hace nada.
 */
export async function enviarWhatsapp(to: string, respuesta: RespuestaWhatsapp): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  const enviar = (destino: string) =>
    fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: destino, ...cuerpo(respuesta) }),
      signal: AbortSignal.timeout(10_000),
    });

  let res = await enviar(to);
  let error = res.ok ? "" : await res.text();

  // Meta informa los celulares argentinos con el 9 (549…), pero la lista de
  // destinatarios de prueba los guarda sin él (54…) y rechaza el envío con el
  // error 131030. Se reintenta una vez sin el 9.
  if (!res.ok && error.includes("131030") && /^549\d{10}$/.test(to)) {
    res = await enviar(`54${to.slice(3)}`);
    error = res.ok ? "" : await res.text();
  }
  if (!res.ok) console.error("[whatsapp] El envío falló", res.status, error.slice(0, 300));
}
