"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession, type Role } from "@/lib/session";
import { crearCuenta } from "@/lib/services/cuenta.service";
import { isEmpresa, isTransportista } from "@/lib/roles";
import { normalizarTelefono, pareceTelefono } from "@/lib/telefono";

export type FormState = { error?: string } | undefined;

const dashboardByRole: Record<Role, string> = {
  EMPRESA: "/empresa/dashboard",
  TRANSPORTISTA: "/transportista/cargas",
  TRANSPORTISTA_FLOTA: "/transportista/cargas",
  EMPRESA_TRANSPORTISTA: "/empresa/dashboard",
  ADMIN: "/admin/dashboard",
};

export async function signup(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const esEmpresa = formData.get("esEmpresa") === "on";
  const esTransportista = formData.get("esTransportista") === "on";
  const esFlota = formData.get("tipoTransportista") === "flota";
  const notifZonaLatRaw = formData.get("notifZonaLat") as string | null;
  const notifZonaLngRaw = formData.get("notifZonaLng") as string | null;
  const notifRadioKmRaw = formData.get("notifRadioKm") as string | null;
  const notifZonaLat = notifZonaLatRaw ? parseFloat(notifZonaLatRaw) : null;
  const notifZonaLng = notifZonaLngRaw ? parseFloat(notifZonaLngRaw) : null;
  const notifRadioKm = notifRadioKmRaw && notifRadioKmRaw !== "" ? parseInt(notifRadioKmRaw) : null;

  if (!name || !email || !password) {
    return { error: "Todos los campos son requeridos" };
  }
  if (!esEmpresa && !esTransportista) {
    return { error: "Seleccioná al menos un tipo de cuenta" };
  }
  if (formData.get("aceptaTerminos") !== "on") {
    return { error: "Tenés que aceptar los Términos y la Política de Privacidad" };
  }

  let role: Role;
  if (esEmpresa && esTransportista) {
    role = "EMPRESA_TRANSPORTISTA";
  } else if (esEmpresa) {
    role = "EMPRESA";
  } else {
    role = esFlota ? "TRANSPORTISTA_FLOTA" : "TRANSPORTISTA";
  }

  const result = await crearCuenta({
    name,
    email,
    password,
    role,
    esFlota: esFlota && esTransportista,
    extra:
      esTransportista && notifZonaLat !== null && notifZonaLng !== null
        ? { notifZonaLat, notifZonaLng, notifRadioKm }
        : undefined,
  });
  if (!result.ok) return { error: result.error };

  redirect(dashboardByRole[role]);
}

export async function login(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  // El campo acepta email o teléfono: las cuentas creadas por WhatsApp o por
  // el alta asistida pueden no tener email (ver telefonoLogin).
  const identificador = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!identificador || !password) {
    return { error: "Email o teléfono y contraseña requeridos" };
  }

  const telefono = pareceTelefono(identificador) ? normalizarTelefono(identificador) : null;
  const user = telefono
    ? await usuarioPorTelefono(telefono, password)
    : await usuarioPorEmail(identificador, password);
  if (user === "varias") {
    return { error: "Ese teléfono está en más de una cuenta. Entrá con tu email." };
  }
  if (!user) return { error: "Credenciales inválidas" };

  await createSession(user.id, user.role as Role, user.esFlota);
  redirect(destinoTrasLogin(formData.get("volver"), user.role as Role) ?? dashboardByRole[user.role as Role]);
}

type UsuarioLogin = { id: string; role: string; esFlota: boolean; password: string };

async function usuarioPorEmail(email: string, password: string): Promise<UsuarioLogin | null> {
  const user = await db.user.findUnique({ where: { email } });
  return user && (await bcrypt.compare(password, user.password)) ? user : null;
}

/**
 * Primero por `telefonoLogin` (confirmado, único). Si no hay, por `phone`: el
 * teléfono de contacto que la gente carga en su perfil o al registrarse. Ese
 * campo es texto libre y puede repetirse, así que se comparan las versiones
 * normalizadas y solo entra si la contraseña coincide con una única cuenta.
 * Si coincide con varias devuelve "varias": no hay forma de saber cuál quiere,
 * y como ya probó tener la contraseña, se le puede decir que use el email.
 */
async function usuarioPorTelefono(
  telefono: string,
  password: string
): Promise<UsuarioLogin | "varias" | null> {
  const confirmado = await db.user.findUnique({ where: { telefonoLogin: telefono } });
  if (confirmado) {
    return (await bcrypt.compare(password, confirmado.password)) ? confirmado : null;
  }

  // `phone` se guarda como lo escribió la persona ("0221 15...", "+54 9 221..."):
  // se prefiltra en la base por los últimos 4 dígitos (rara vez llevan
  // separadores en el medio) y se normaliza acá.
  const candidatos = await db.user.findMany({
    where: { phone: { contains: telefono.slice(-4) } },
    select: { id: true, role: true, esFlota: true, password: true, phone: true },
  });
  const coincidentes = candidatos.filter((u) => u.phone && normalizarTelefono(u.phone) === telefono);
  const validos: UsuarioLogin[] = [];
  for (const u of coincidentes) {
    if (await bcrypt.compare(password, u.password)) validos.push(u);
  }
  if (validos.length > 1) return "varias";
  return validos[0] ?? null;
}

/**
 * Ruta a la que vuelve quien ingresó desde un link a una pantalla protegida
 * (`/login?volver=...`, lo arma proxy.ts). Solo se aceptan rutas internas del
 * panel de su rol: una URL externa sería un redirect abierto, y una de otro
 * panel el proxy la rebotaría igual.
 */
function destinoTrasLogin(volver: FormDataEntryValue | null, role: Role): string | null {
  if (typeof volver !== "string" || !volver.startsWith("/") || volver.startsWith("//") || volver.includes("\\")) {
    return null;
  }
  const prefijos =
    role === "ADMIN"
      ? ["/admin", "/empresa", "/transportista"]
      : [...(isEmpresa(role) ? ["/empresa"] : []), ...(isTransportista(role) ? ["/transportista"] : [])];
  return prefijos.some((p) => volver === p || volver.startsWith(`${p}/`) || volver.startsWith(`${p}?`))
    ? volver
    : null;
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
