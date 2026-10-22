import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ORIGEN_COOKIE, parseOrigen } from "@/lib/origen";
import { registrarEvento } from "@/lib/analytics";
import { createSession, type Role } from "@/lib/session";
import { isValidEmail } from "@/lib/validate-email";

type DatosCuenta = {
  name: string;
  email: string;
  password: string;
  role: Role;
  esFlota?: boolean;
  /** Datos propios del rol (zona de avisos, teléfono) que se guardan al crearla. */
  extra?: Omit<Prisma.UserCreateInput, "name" | "email" | "password" | "role" | "esFlota">;
};

export type CrearCuentaResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; emailExistente?: boolean };

/**
 * Crea la cuenta, le adjudica el canal por el que llegó, registra el evento
 * `sign_up` y deja la sesión iniciada. La usan el formulario de registro y la
 * publicación de una carga sin cuenta (`/publicar`).
 */
export async function crearCuenta(datos: DatosCuenta): Promise<CrearCuentaResult> {
  const name = datos.name.trim();
  const email = datos.email.trim().toLowerCase();
  const { password, role } = datos;
  const esFlota = datos.esFlota ?? false;

  if (!name || !email || !password) {
    return { ok: false, error: "Todos los campos son requeridos" };
  }
  if (password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }
  if (!(await isValidEmail(email))) {
    return { ok: false, error: "El email ingresado no existe o no es válido" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Ya existe una cuenta con ese email", emailExistente: true };
  }

  const cookieStore = await cookies();
  const origen = parseOrigen(cookieStore.get(ORIGEN_COOKIE)?.value);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      ...datos.extra,
      name,
      email,
      password: hashedPassword,
      role,
      esFlota,
      terminosAceptadosEn: new Date(),
      origenFuente: origen?.fuente,
      origenMedio: origen?.medio,
      origenCampania: origen?.campania,
      origenContenido: origen?.contenido,
      origenLanding: origen?.landing,
      origenReferrer: origen?.referrer,
    },
  });

  cookieStore.delete(ORIGEN_COOKIE);
  await registrarEvento("sign_up", { rol: role });
  await createSession(user.id, role, esFlota);
  return { ok: true, userId: user.id };
}
