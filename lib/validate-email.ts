import { resolveMx } from "node:dns/promises";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Respuestas del DNS que confirman que el dominio no recibe correo. Cualquier
// otro error (timeout, servidor caído, sin red) es un problema nuestro y no
// del usuario, así que no bloquea el registro.
const DOMINIO_INEXISTENTE = new Set(["ENOTFOUND", "ENODATA"]);

export async function isValidEmail(email: string): Promise<boolean> {
  if (!EMAIL_REGEX.test(email)) return false;

  const domain = email.split("@")[1];
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code && DOMINIO_INEXISTENTE.has(code)) return false;
    console.warn(`[validate-email] no se pudo verificar ${domain}: ${code ?? err}`);
    return true;
  }
}
