"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/dal";
import { SITE_URL } from "@/lib/site";
import { crearCuentaAdmin, esTipoCuenta } from "@/lib/services/alta-admin.service";

export type AltaState =
  | { ok: true; url: string; whatsappUrl: string | null; emailEnviado: boolean; acceso: string }
  | { ok: false; error: string }
  | undefined;

export async function crearCuentaAdminAction(_prev: AltaState, form: FormData): Promise<AltaState> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "No autorizado" };

  const tipo = String(form.get("tipo") ?? "");
  if (!esTipoCuenta(tipo)) return { ok: false, error: "Elegí el tipo de cuenta" };

  const nombre = String(form.get("nombre") ?? "");
  const email = String(form.get("email") ?? "") || null;
  const telefono = String(form.get("telefono") ?? "") || null;

  const resultado = await crearCuentaAdmin({ nombre, email, telefono, tipo }, SITE_URL ?? "https://clickcargo.com.ar");
  if (!resultado.ok) return resultado;

  const acceso = [resultado.telefono && "su teléfono", email && "su email"].filter(Boolean).join(" o ");
  const mensaje =
    `¡Hola ${nombre.trim().split(" ")[0]}! Ya te creamos la cuenta en ClickCargo. ` +
    `Entrá a este link para elegir tu contraseña:\n${resultado.activacionUrl}\n\n` +
    `Después ingresás con tu ${resultado.telefono ? "número de teléfono" : "email"} y esa contraseña.`;

  revalidatePath("/admin/cuentas");
  return {
    ok: true,
    url: resultado.activacionUrl,
    whatsappUrl: resultado.telefono
      ? `https://wa.me/${resultado.telefono}?text=${encodeURIComponent(mensaje)}`
      : null,
    emailEnviado: resultado.emailEnviado,
    acceso,
  };
}
