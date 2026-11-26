import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { Role } from "@/lib/session";
import { sendEmail } from "@/lib/resend";
import { plantilla } from "@/lib/notifications/emails";
import { isValidEmail } from "@/lib/validate-email";
import { normalizarTelefono } from "@/lib/telefono";
import { generarLinkAcceso } from "@/lib/services/solicitud-transportista.service";

/**
 * Alta de cuentas por un admin, para cualquier rol: clientes que se dan de
 * alta hablando con el equipo y no pasan por el registro. Igual que el alta
 * asistida de transportistas (solicitud-transportista.service), la contraseña
 * es al azar hasta que la elige con el link de activación, que también
 * registra la aceptación de los términos.
 */

export const TIPOS_CUENTA = {
  EMPRESA: { label: "Publica cargas", role: "EMPRESA", esFlota: false },
  TRANSPORTISTA: { label: "Transportista", role: "TRANSPORTISTA", esFlota: false },
  TRANSPORTISTA_FLOTA: { label: "Transportista con flota", role: "TRANSPORTISTA_FLOTA", esFlota: true },
  EMPRESA_TRANSPORTISTA: { label: "Publica cargas y transporta", role: "EMPRESA_TRANSPORTISTA", esFlota: false },
  EMPRESA_TRANSPORTISTA_FLOTA: {
    label: "Publica cargas y transporta (con flota)",
    role: "EMPRESA_TRANSPORTISTA",
    esFlota: true,
  },
  ADMIN: { label: "Administrador", role: "ADMIN", esFlota: false },
} as const satisfies Record<string, { label: string; role: Role; esFlota: boolean }>;

export type TipoCuenta = keyof typeof TIPOS_CUENTA;

export const esTipoCuenta = (v: string): v is TipoCuenta => v in TIPOS_CUENTA;

export type CrearCuentaAdminResult =
  | {
      ok: true;
      activacionUrl: string;
      emailEnviado: boolean;
      /** Formato wa.me; null si se creó solo con email. */
      telefono: string | null;
    }
  | { ok: false; error: string };

/**
 * Hace falta email o teléfono para poder entrar. El teléfono se guarda como
 * `telefonoLogin` (confirmado: el admin habló con la persona), y por eso
 * también `emailVerified` queda en true.
 */
export async function crearCuentaAdmin(
  datos: { nombre: string; email: string | null; telefono: string | null; tipo: TipoCuenta },
  baseUrl: string,
): Promise<CrearCuentaAdminResult> {
  const nombre = datos.nombre.trim().slice(0, 80);
  const email = datos.email?.trim().toLowerCase() || null;
  const telefonoIngresado = datos.telefono?.trim() || null;
  const { role, esFlota } = TIPOS_CUENTA[datos.tipo];

  if (!nombre) return { ok: false, error: "Falta el nombre" };
  if (!email && !telefonoIngresado) return { ok: false, error: "Poné un email o un teléfono para que pueda entrar" };

  let telefono: string | null = null;
  if (telefonoIngresado) {
    telefono = normalizarTelefono(telefonoIngresado);
    if (!telefono) return { ok: false, error: "El teléfono no es válido: código de área y número, ej. 351 555-1234" };
    if (await db.user.findUnique({ where: { telefonoLogin: telefono } })) {
      return { ok: false, error: "Ya hay una cuenta con ese teléfono. Generá un link de acceso en Solicitudes." };
    }
  }

  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !(await isValidEmail(email))) {
      return { ok: false, error: "El email no existe o no es válido" };
    }
    if (await db.user.findUnique({ where: { email } })) {
      return { ok: false, error: "Ya hay una cuenta con ese email. Que entre con \"Olvidé mi contraseña\"." };
    }
  }

  const user = await db.user.create({
    data: {
      name: nombre,
      email,
      telefonoLogin: telefono,
      phone: telefonoIngresado,
      emailVerified: true,
      password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      role,
      esFlota,
      origenFuente: "alta_admin",
      // Los términos se registran cuando activa la cuenta.
    },
  });

  const activacionUrl = await generarLinkAcceso(user.id, baseUrl, true);

  let emailEnviado = false;
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: "Tu cuenta está lista — ClickCargo",
        html: plantilla({
          titulo: "Ya tenés tu cuenta",
          parrafos: [
            "Te creamos la cuenta en ClickCargo.",
            telefono
              ? "Elegí tu contraseña para entrar. Después podés ingresar con este email o con tu teléfono."
              : "Elegí tu contraseña para entrar. Después ingresás con este email y esa contraseña.",
          ],
          boton: { texto: "Elegir contraseña", url: activacionUrl },
          pie: "El enlace vence en 7 días. Si no pediste esta cuenta, ignorá este email.",
        }),
      });
      emailEnviado = true;
    } catch (err) {
      console.error("[alta-admin] no se pudo mandar el email de activación:", err);
    }
  }

  return { ok: true, activacionUrl, emailEnviado, telefono };
}
