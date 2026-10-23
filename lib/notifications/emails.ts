import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { absoluteUrl } from "@/lib/site";

/**
 * Emails a quien publica una carga. Son el único aviso que le llega a alguien
 * que publicó desde `/publicar` y cerró la pestaña sin aceptar notificaciones:
 * sin esto no se entera de las postulaciones ni recuerda que tiene cuenta.
 */

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plantilla({
  titulo,
  parrafos,
  boton,
  pie,
}: {
  titulo: string;
  parrafos: string[];
  boton?: { texto: string; url: string };
  pie: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0C1E1E;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C1E1E;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" style="max-width:480px;background:#112424;border-radius:16px;border:1px solid #1E3838;padding:40px;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">
                <span style="color:#2DD4BF;">CLICK</span>CARGO
              </p>
              <p style="margin:0 0 28px;font-size:11px;letter-spacing:2px;color:#2DD4BF;opacity:.7;text-transform:uppercase;">
                Red integral de cargas
              </p>
              <h2 style="margin:0 0 12px;font-size:18px;color:#fff;font-weight:600;">${titulo}</h2>
              ${parrafos
                .map((p) => `<p style="margin:0 0 16px;font-size:14px;color:#9CA3AF;line-height:1.6;">${p}</p>`)
                .join("")}
              ${
                boton
                  ? `<p style="margin:12px 0 28px;">
                      <a href="${boton.url}" style="display:inline-block;background:#2DD4BF;color:#0C1E1E;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:10px;">${boton.texto}</a>
                    </p>`
                  : ""
              }
              <p style="margin:0;font-size:12px;color:#4B5563;line-height:1.5;">${pie}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

async function enviar(etiqueta: string, opciones: { to: string; subject: string; html: string }) {
  const result = await sendEmail(opciones);
  if (result.error) console.error(`[emails] ${etiqueta}: Resend error:`, result.error);
}

/** Confirmación de publicación, con el recordatorio de cómo volver a entrar. */
export async function emailCargaPublicada(cargaId: number) {
  const carga = await db.carga.findUnique({
    where: { id: cargaId },
    select: { titulo: true, empresa: { select: { email: true } } },
  });
  if (!carga) return;

  const titulo = escapeHtml(carga.titulo);
  const email = escapeHtml(carga.empresa.email);
  const link = absoluteUrl(`/empresa/cargas/${cargaId}`);
  const recuperar = absoluteUrl("/recuperar-contrasena");

  await enviar("carga publicada", {
    to: carga.empresa.email,
    subject: `Tu carga está publicada: ${carga.titulo}`,
    html: plantilla({
      titulo: "Tu carga está publicada",
      parrafos: [
        `<strong style="color:#fff;">${titulo}</strong> ya está visible y les avisamos a los transportistas de la zona.`,
        "Cuando alguien se postule te mandamos un email. Ahí vas a poder ver su reputación, elegir y coordinar por chat.",
        `Para entrar usá este email (<strong style="color:#fff;">${email}</strong>) y la contraseña que elegiste.`,
      ],
      boton: link ? { texto: "Ver mi carga", url: link } : undefined,
      pie: recuperar
        ? `¿No te acordás la contraseña? <a href="${recuperar}" style="color:#2DD4BF;">Recuperala acá</a>.`
        : "Si no publicaste esta carga, ignorá este email.",
    }),
  });
}

/**
 * Aviso de la primera postulación de una carga. Las siguientes no generan
 * email (llegan por push y en la app), para no llenarle la casilla.
 */
export async function emailPrimeraPostulacion(cargaId: number) {
  const [carga, postulaciones] = await Promise.all([
    db.carga.findUnique({
      where: { id: cargaId },
      select: { titulo: true, empresa: { select: { email: true } } },
    }),
    db.postulacion.count({ where: { cargaId } }),
  ]);
  if (!carga || postulaciones !== 1) return;

  const titulo = escapeHtml(carga.titulo);
  const link = absoluteUrl(`/empresa/cargas/${cargaId}`);

  await enviar("primera postulación", {
    to: carga.empresa.email,
    subject: `Un transportista se postuló a tu carga: ${carga.titulo}`,
    html: plantilla({
      titulo: "Tenés una postulación",
      parrafos: [
        `Un transportista se postuló a <strong style="color:#fff;">${titulo}</strong>.`,
        "Entrá para ver quién es, su reputación y su oferta. Si te sirve, lo elegís y coordinan por chat.",
      ],
      boton: link ? { texto: "Ver postulaciones", url: link } : undefined,
      pie: "Te avisamos por email solo la primera postulación de cada carga. Las siguientes las ves en ClickCargo.",
    }),
  });
}
