"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { normalizarTelefono } from "@/lib/telefono";

async function soloAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("No autorizado");
}

/** El bot de WhatsApp deja de contestarle a ese número (ver whatsapp-carga.service). */
export async function bloquearNumeroAction(form: FormData) {
  await soloAdmin();
  const crudo = String(form.get("telefono") ?? "");
  // Acepta lo que se escriba a mano ("0351 15…") o el número tal como lo guarda el bot.
  const telefono = normalizarTelefono(crudo) ?? crudo.replace(/\D/g, "");
  if (telefono.length < 10) return;
  const motivo = String(form.get("motivo") ?? "").trim().slice(0, 200) || null;

  await db.numeroBloqueado.upsert({ where: { telefono }, create: { telefono, motivo }, update: { motivo } });
  revalidatePath("/admin/asistente");
}

export async function desbloquearNumeroAction(form: FormData) {
  await soloAdmin();
  await db.numeroBloqueado.deleteMany({ where: { telefono: String(form.get("telefono") ?? "") } });
  revalidatePath("/admin/asistente");
}
