import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { Origen } from "@/lib/origen";
import { sendEmail } from "@/lib/resend";
import { plantilla } from "@/lib/notifications/emails";
import { isValidEmail } from "@/lib/validate-email";
import { normalizarTelefono } from "@/lib/telefono";

/**
 * Alta asistida de transportistas. Desde la landing, quien no quiere pasar por
 * el registro deja nombre y WhatsApp; la charla sigue por WhatsApp y un admin
 * le crea la cuenta. Entra con su teléfono (`telefonoLogin`) o con su email si
 * lo dio, y elige la contraseña con un link de acceso que también registra la
 * aceptación de los términos (ver app/api/auth/nueva-contrasena).
 */

/** Cuánto dura un link de acceso: llega por WhatsApp y se abre cuando se puede. */
const LINK_ACCESO_MS = 7 * 24 * 60 * 60 * 1000;

const texto = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) || null : null;

/** Número para wa.me. Si no se pudo normalizar, los dígitos tal cual (el admin lo ve y lo corrige). */
export function telefonoWhatsapp(telefono: string): string {
  return normalizarTelefono(telefono) ?? telefono.replace(/\D/g, "");
}

export type DatosSolicitud = {
  nombre: string;
  telefono: string;
  email: string | null;
  localidad: string | null;
  vehiculo: string | null;
};

export function validarSolicitud(body: Record<string, unknown>): DatosSolicitud | { error: string } {
  const nombre = texto(body.nombre, 80);
  const telefono = texto(body.telefono, 30);
  const email = texto(body.email, 120)?.toLowerCase() ?? null;
  if (!nombre) return { error: "Contanos tu nombre" };
  if (!telefono || !normalizarTelefono(telefono)) {
    return { error: "Revisá el número de WhatsApp: código de área y número, ej. 351 555-1234" };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisá el email" };
  return { nombre, telefono, email, localidad: texto(body.localidad, 80), vehiculo: texto(body.vehiculo, 60) };
}

export async function crearSolicitud(datos: DatosSolicitud, origen: Origen | null) {
  return db.solicitudTransportista.create({
    data: {
      ...datos,
      origenFuente: origen?.fuente,
      origenMedio: origen?.medio,
      origenCampania: origen?.campania,
      origenContenido: origen?.contenido,
      origenLanding: origen?.landing,
      origenReferrer: origen?.referrer,
    },
  });
}

/**
 * Link para elegir contraseña, atado al usuario y no al email: sirve igual
 * para cuentas sin email. Invalida los links anteriores del mismo usuario.
 */
export async function generarLinkAcceso(userId: string, baseUrl: string, activar: boolean): Promise<string> {
  await db.passwordResetToken.deleteMany({ where: { userId } });
  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: { userId, token, expiresAt: new Date(Date.now() + LINK_ACCESO_MS) },
  });
  return `${baseUrl}/nueva-contrasena?token=${token}${activar ? "&activar=1" : ""}`;
}

export type CrearCuentaSolicitudResult =
  | { ok: true; activacionUrl: string; emailEnviado: boolean; telefono: string }
  | { ok: false; error: string };

/**
 * Crea la cuenta de transportista de una solicitud. El email es opcional: sin
 * él, entra con el teléfono. La contraseña es al azar hasta que la elige con
 * el link de activación.
 *
 * `emailVerified` queda en true: el equipo confirmó el contacto hablando por
 * WhatsApp antes de crearla, que es lo que ese campo habilita (postularse,
 * sello de verificado).
 */
export async function crearCuentaDesdeSolicitud(
  solicitudId: string,
  emailIngresado: string | null,
  baseUrl: string,
): Promise<CrearCuentaSolicitudResult> {
  const solicitud = await db.solicitudTransportista.findUnique({ where: { id: solicitudId } });
  if (!solicitud) return { ok: false, error: "La solicitud no existe" };
  if (solicitud.estado !== "PENDIENTE") return { ok: false, error: "La solicitud ya fue atendida" };

  const telefono = normalizarTelefono(solicitud.telefono);
  if (!telefono) return { ok: false, error: "El teléfono no es válido: corregilo hablando con la persona" };
  if (await db.user.findUnique({ where: { telefonoLogin: telefono } })) {
    return { ok: false, error: "Ya hay una cuenta con ese teléfono. Mandale un link de acceso desde abajo." };
  }

  const email = (emailIngresado?.trim() || solicitud.email || "").toLowerCase() || null;
  if (email) {
    if (!(await isValidEmail(email))) return { ok: false, error: "El email no existe o no es válido" };
    if (await db.user.findUnique({ where: { email } })) {
      return { ok: false, error: "Ya hay una cuenta con ese email. Que entre con \"Olvidé mi contraseña\"." };
    }
  }

  const user = await db.user.create({
    data: {
      name: solicitud.nombre,
      email,
      telefonoLogin: telefono,
      phone: solicitud.telefono,
      emailVerified: true,
      password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      role: "TRANSPORTISTA",
      // Los términos se registran cuando activa la cuenta.
      origenFuente: solicitud.origenFuente,
      origenMedio: solicitud.origenMedio,
      origenCampania: solicitud.origenCampania,
      origenContenido: solicitud.origenContenido,
      origenLanding: solicitud.origenLanding,
      origenReferrer: solicitud.origenReferrer,
    },
  });

  const activacionUrl = await generarLinkAcceso(user.id, baseUrl, true);
  await db.solicitudTransportista.update({
    where: { id: solicitudId },
    data: { estado: "CUENTA_CREADA", userId: user.id, email, atendidaEn: new Date() },
  });

  let emailEnviado = false;
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: "Tu cuenta de transportista está lista — ClickCargo",
        html: plantilla({
          titulo: "Ya tenés tu cuenta",
          parrafos: [
            "Te creamos la cuenta de transportista en ClickCargo.",
            "Elegí tu contraseña para entrar, ver las cargas de tu zona y anunciar tus viajes. Después podés ingresar con este email o con tu teléfono.",
          ],
          boton: { texto: "Elegir contraseña", url: activacionUrl },
          pie: "El enlace vence en 7 días. Si no pediste esta cuenta, ignorá este email.",
        }),
      });
      emailEnviado = true;
    } catch (err) {
      console.error("[solicitud-transportista] no se pudo mandar el email de activación:", err);
    }
  }

  return { ok: true, activacionUrl, emailEnviado, telefono };
}

/**
 * Link de acceso para quien entra con el teléfono y olvidó la contraseña: no
 * hay email al que mandárselo, así que lo pide por WhatsApp y el admin lo genera.
 */
export async function linkAccesoPorTelefono(
  telefonoIngresado: string,
  baseUrl: string,
): Promise<{ ok: true; url: string; nombre: string; telefono: string } | { ok: false; error: string }> {
  const telefono = normalizarTelefono(telefonoIngresado);
  if (!telefono) return { ok: false, error: "Teléfono no válido" };
  const user = await db.user.findUnique({ where: { telefonoLogin: telefono }, select: { id: true, name: true } });
  if (!user) return { ok: false, error: "No hay ninguna cuenta que entre con ese teléfono" };
  return { ok: true, url: await generarLinkAcceso(user.id, baseUrl, false), nombre: user.name, telefono };
}

export async function descartarSolicitud(solicitudId: string) {
  await db.solicitudTransportista.updateMany({
    where: { id: solicitudId, estado: "PENDIENTE" },
    data: { estado: "DESCARTADA", atendidaEn: new Date() },
  });
}
