import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Link de invitación a una postulación grupal: `<postulacionId>.<firma>`,
 * firmado con SESSION_SECRET para que no se pueda adivinar el de otro grupo
 * cambiando el número. No vence: vale mientras la postulación del líder siga
 * abierta (eso lo valida crearPostulacion).
 */

function firmar(postulacionId: number): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "")
    .update(`grupo:${postulacionId}`)
    .digest("base64url")
    .slice(0, 16);
}

export function tokenInvitacionGrupo(postulacionId: number): string {
  return `${postulacionId}.${firmar(postulacionId)}`;
}

/** Id de la postulación del líder, o null si el token no es auténtico. */
export function leerInvitacionGrupo(token: unknown): number | null {
  if (typeof token !== "string") return null;
  const match = token.match(/^(\d{1,10})\.([A-Za-z0-9_-]{16})$/);
  if (!match) return null;
  const id = Number(match[1]);
  const esperada = Buffer.from(firmar(id));
  const recibida = Buffer.from(match[2]);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida) ? id : null;
}

export const rutaInvitacionGrupo = (cargaId: number, postulacionId: number) =>
  `/transportista/cargas/${cargaId}?grupo=${tokenInvitacionGrupo(postulacionId)}`;
