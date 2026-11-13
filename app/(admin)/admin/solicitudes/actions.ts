"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import {
  crearCuentaDesdeSolicitud,
  descartarSolicitud,
  linkAccesoPorTelefono,
} from "@/lib/services/solicitud-transportista.service";

export type LinkState =
  | { ok: true; url: string; whatsappUrl: string; emailEnviado?: boolean }
  | { ok: false; error: string }
  | undefined;

const baseUrl = () => SITE_URL ?? "https://clickcargo.com.ar";

async function soloAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("No autorizado");
}

const wa = (telefono: string, texto: string) => `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
const primerNombre = (nombre: string | undefined) => nombre?.split(" ")[0] ?? "";

export async function crearCuentaAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  await soloAdmin();
  const id = String(form.get("id") ?? "");
  const email = String(form.get("email") ?? "").trim() || null;

  const resultado = await crearCuentaDesdeSolicitud(id, email, baseUrl());
  if (!resultado.ok) return resultado;

  const solicitud = await db.solicitudTransportista.findUnique({ where: { id }, select: { nombre: true } });
  const mensaje =
    `¡Hola ${primerNombre(solicitud?.nombre)}! Ya te creamos la cuenta de transportista en ClickCargo. ` +
    `Entrá a este link para elegir tu contraseña:\n${resultado.activacionUrl}\n\n` +
    `Después ingresás con tu número de teléfono y esa contraseña.`;

  revalidatePath("/admin/solicitudes");
  return {
    ok: true,
    url: resultado.activacionUrl,
    whatsappUrl: wa(resultado.telefono, mensaje),
    emailEnviado: resultado.emailEnviado,
  };
}

export async function linkAccesoAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  await soloAdmin();
  const resultado = await linkAccesoPorTelefono(String(form.get("telefono") ?? ""), baseUrl());
  if (!resultado.ok) return resultado;
  const mensaje =
    `¡Hola ${primerNombre(resultado.nombre)}! Este es tu link para elegir una contraseña nueva en ClickCargo:\n` +
    `${resultado.url}\n\nVence en 7 días.`;
  return { ok: true, url: resultado.url, whatsappUrl: wa(resultado.telefono, mensaje) };
}

export async function descartarAction(form: FormData) {
  await soloAdmin();
  await descartarSolicitud(String(form.get("id") ?? ""));
  revalidatePath("/admin/solicitudes");
}
