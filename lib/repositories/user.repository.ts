import { db } from "@/lib/db";

export async function findUserById(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { id: true } });
}

export async function findUserContacto(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });
}

export async function findUserEmailVerified(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, role: true, esFlota: true, name: true },
  });
}

/** Guarda el teléfono en el perfil solo si todavía no tiene uno cargado. */
export async function linkPhoneSiFalta(userId: string, phone: string) {
  await db.user.updateMany({
    where: { id: userId, phone: null },
    data: { phone },
  });
}
