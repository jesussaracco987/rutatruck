"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession, type Role } from "@/lib/session";
import { crearCuenta } from "@/lib/services/cuenta.service";
import { isEmpresa, isTransportista } from "@/lib/roles";

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
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña requeridos" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "Credenciales inválidas" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Credenciales inválidas" };

  await createSession(user.id, user.role as Role, user.esFlota);
  redirect(destinoTrasLogin(formData.get("volver"), user.role as Role) ?? dashboardByRole[user.role as Role]);
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
