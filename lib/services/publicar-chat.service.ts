import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { createSession } from "@/lib/session";
import { isEmpresa } from "@/lib/roles";
import { isValidEmail } from "@/lib/validate-email";
import { parseCargaInput } from "@/lib/carga-input";
import { crearCuenta } from "@/lib/services/cuenta.service";
import { publicarCarga } from "@/lib/services/carga.service";
import { camposFaltantes, sanitizarBorrador } from "@/lib/chat-carga";
import { borrarConversacionesViejas } from "@/lib/services/conversacion-chat.service";

const VIGENCIA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

/**
 * El código abre la cuenta del email (igual que un link de recuperar
 * contraseña), así que no se guarda legible: quien lea la base no puede usarlo.
 */
function hashCodigo(email: string, codigo: string): Buffer {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`${email}:${codigo}`).digest();
}

export const normalizarEmail = (email: unknown) => (typeof email === "string" ? email.trim().toLowerCase() : "");

function plantilla(titulo: string, cuerpo: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0C1E1E;font-family:sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C1E1E;padding:40px 20px;"><tr><td align="center">
      <table width="100%" style="max-width:480px;background:#112424;border-radius:16px;border:1px solid #1E3838;padding:40px;"><tr><td>
        <p style="margin:0 0 28px;font-size:22px;font-weight:700;color:#fff;"><span style="color:#2DD4BF;">CLICK</span>CARGO</p>
        <h2 style="margin:0 0 12px;font-size:18px;color:#fff;font-weight:600;">${titulo}</h2>
        ${cuerpo}
      </td></tr></table>
    </td></tr></table></body></html>`;
}

export async function enviarCodigoPublicacion(
  email: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!(await isValidEmail(email))) {
    return { ok: false, status: 400, error: "El email ingresado no existe o no es válido" };
  }

  const codigo = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const datos = {
    codigoHash: hashCodigo(email, codigo).toString("hex"),
    intentos: 0,
    expiraEn: new Date(Date.now() + VIGENCIA_MS),
  };
  await db.codigoPublicacion.upsert({ where: { email }, create: { email, ...datos }, update: datos });

  try {
    const resultado = await sendEmail({
      to: email,
      subject: `${codigo} es tu código de ClickCargo`,
      html: plantilla(
        "Tu código para publicar",
        `<p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">Ingresalo en ClickCargo para publicar tu carga. Vence en <strong style="color:#fff;">15 minutos</strong>.</p>
         <p style="margin:0 0 28px;font-size:32px;font-weight:800;letter-spacing:8px;color:#2DD4BF;">${codigo}</p>
         <p style="margin:0;font-size:12px;color:#4B5563;line-height:1.5;">Si no fuiste vos, ignorá este email.</p>`,
      ),
    });
    if (resultado.error) throw new Error(resultado.error.message);
  } catch (err) {
    console.error("[publicar-chat] No se pudo enviar el código:", err);
    return { ok: false, status: 502, error: "No pudimos enviar el código. Probá de nuevo." };
  }
  return { ok: true };
}

/** Valida el código y lo consume: sirve una sola vez, aunque lleguen dos pedidos juntos. */
async function verificarCodigo(email: string, codigo: string): Promise<string | null> {
  const registro = await db.codigoPublicacion.findUnique({ where: { email } });
  if (!registro || registro.expiraEn < new Date()) return "El código expiró. Pedí uno nuevo.";

  const { count } = await db.codigoPublicacion.updateMany({
    where: { id: registro.id, intentos: { lt: MAX_INTENTOS } },
    data: { intentos: { increment: 1 } },
  });
  if (count === 0) {
    await db.codigoPublicacion.deleteMany({ where: { id: registro.id } });
    return "Demasiados intentos. Pedí un código nuevo.";
  }

  const esperado = Buffer.from(registro.codigoHash, "hex");
  if (!timingSafeEqual(esperado, hashCodigo(email, codigo))) return "Código incorrecto.";

  const consumido = await db.codigoPublicacion.deleteMany({ where: { id: registro.id } });
  return consumido.count === 1 ? null : "El código ya fue usado.";
}

/** Entra a la cuenta del email o crea una nueva. */
async function ingresarOCrear(datos: { email: string; nombre: string; telefono: string }) {
  const existente = await db.user.findUnique({ where: { email: datos.email } });

  if (existente) {
    // ADMIN y transportistas no entran por acá: este código solo habilita a publicar.
    if (!isEmpresa(existente.role)) {
      return {
        ok: false as const,
        status: 403,
        error: "Ese email ya está registrado en una cuenta que no publica cargas. Usá otro.",
      };
    }
    await db.user.update({ where: { id: existente.id }, data: { emailVerified: true } });
    await createSession(existente.id, existente.role, existente.esFlota);
    return { ok: true as const, userId: existente.id, nueva: false, nombre: existente.name };
  }

  const cuenta = await crearCuenta({
    name: datos.nombre,
    email: datos.email,
    // Cuenta sin contraseña elegida: se define con "Olvidé mi contraseña".
    password: randomBytes(32).toString("hex"),
    role: "EMPRESA",
    extra: { emailVerified: true, phone: datos.telefono },
  });
  if (!cuenta.ok) return { ok: false as const, status: 400, error: cuenta.error };
  return { ok: true as const, userId: cuenta.userId, nueva: true, nombre: datos.nombre };
}

async function enviarBienvenida(email: string, origin: string) {
  await sendEmail({
    to: email,
    subject: "Tu carga está publicada — ClickCargo",
    html: plantilla(
      "Ya tenés tu cuenta",
      `<p style="margin:0 0 16px;font-size:14px;color:#9CA3AF;line-height:1.6;">Creamos tu cuenta con este email para que veas quién se postula a tu carga.</p>
       <p style="margin:0;font-size:14px;color:#9CA3AF;line-height:1.6;">Para volver a entrar desde otro dispositivo, <a href="${origin}/recuperar-contrasena" style="color:#2DD4BF;">elegí una contraseña</a>.</p>`,
    ),
  });
}

type Punto = { lat?: unknown; lng?: unknown };

const coordenada = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max ? v : null;

/**
 * Último paso del chat: valida todo, verifica el código, entra o crea la cuenta
 * y publica por el mismo circuito que el formulario (`publicarCarga`). La carga
 * se valida antes de tocar el código para no gastarlo en un pedido inválido.
 */
export async function confirmarPublicacion(body: Record<string, unknown>, origin: string) {
  const email = normalizarEmail(body.email);
  const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.trim().slice(0, 30) : "";
  const nombreIngresado = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 80) : "";
  const nombre = nombreIngresado || email.split("@")[0];
  const borrador = sanitizarBorrador(body.borrador);
  const origen = (body.origenPunto ?? {}) as Punto;
  const destino = (body.destinoPunto ?? {}) as Punto;
  const [origenLat, origenLng] = [coordenada(origen.lat, 90), coordenada(origen.lng, 180)];
  const [destinoLat, destinoLng] = [coordenada(destino.lat, 90), coordenada(destino.lng, 180)];

  if (body.aceptaTerminos !== true) {
    return { ok: false as const, status: 400, error: "Tenés que aceptar los Términos y la Política de Privacidad" };
  }
  if (!/^\d{6}$/.test(codigo)) return { ok: false as const, status: 400, error: "Ingresá los 6 dígitos del código" };
  if (telefono.replace(/\D/g, "").length < 8) return { ok: false as const, status: 400, error: "Revisá el teléfono" };
  if (camposFaltantes(borrador).length > 0) return { ok: false as const, status: 400, error: "Faltan datos de la carga" };
  if (origenLat === null || origenLng === null || destinoLat === null || destinoLng === null) {
    return { ok: false as const, status: 400, error: "Marcá en el mapa los puntos de carga y descarga" };
  }

  const armarInput = (contactoNombre: string) =>
    parseCargaInput({
      ...borrador,
      cantidadCamiones: String(borrador.cantidadCamiones),
      peso: borrador.peso === null ? "" : String(borrador.peso),
      presupuesto: borrador.presupuesto === null ? "" : String(borrador.presupuesto),
      origenLat: String(origenLat),
      origenLng: String(origenLng),
      destinoLat: String(destinoLat),
      destinoLng: String(destinoLng),
      contactoNombre,
      contactoTelefono: telefono,
      contactoEmail: email,
    });

  const previa = armarInput(nombre);
  if (!previa.ok) return { ok: false as const, status: 400, error: previa.error };

  const errorCodigo = await verificarCodigo(email, codigo);
  if (errorCodigo) return { ok: false as const, status: 400, error: errorCodigo };

  const cuenta = await ingresarOCrear({ email, nombre, telefono });
  if (!cuenta.ok) return cuenta;

  // Una cuenta que ya existía publica con su nombre si no escribió otro.
  const input = armarInput(nombreIngresado || cuenta.nombre);
  if (!input.ok) return { ok: false as const, status: 400, error: input.error };

  const publicada = await publicarCarga({ ...input.data, empresaId: cuenta.userId }, origin);
  if (cuenta.nueva) {
    await enviarBienvenida(email, origin).catch((err) => console.error("[publicar-chat] Bienvenida:", err));
  }
  if (!publicada.ok) return { ...publicada, cuentaCreada: true };
  return publicada;
}

export async function limpiarDatosVencidos() {
  const ahora = Date.now();
  const [limites, codigos, conversaciones] = await Promise.all([
    db.limiteUso.deleteMany({ where: { ventana: { lt: new Date(ahora - 2 * 24 * 60 * 60 * 1000) } } }),
    db.codigoPublicacion.deleteMany({ where: { expiraEn: { lt: new Date(ahora) } } }),
    borrarConversacionesViejas(),
  ]);
  return { limites: limites.count, codigos: codigos.count, conversaciones };
}
