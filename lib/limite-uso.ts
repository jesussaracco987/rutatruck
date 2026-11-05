import "server-only";
import { createHash } from "crypto";
import { db } from "@/lib/db";

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

/** Inicio de la ventana fija que contiene a `ahora`. */
function inicioVentana(ventanaMs: number, ahora = Date.now()): Date {
  return new Date(Math.floor(ahora / ventanaMs) * ventanaMs);
}

async function sumar(clave: string, ventana: Date, cantidad: number): Promise<number> {
  const fila = await db.limiteUso.upsert({
    where: { clave_ventana: { clave, ventana } },
    create: { clave, ventana, conteo: cantidad },
    update: { conteo: { increment: cantidad } },
  });
  return fila.conteo;
}

/** Suma un uso y dice si sigue dentro del máximo de la ventana. */
export async function consumirLimite(clave: string, max: number, ventanaMs = HORA_MS): Promise<boolean> {
  return (await sumar(clave, inicioVentana(ventanaMs), 1)) <= max;
}

/**
 * Identifica al visitante sin guardar su IP. En Vercel estos headers los pone
 * la plataforma, así que el cliente no puede falsearlos para esquivar el límite.
 */
export function claveVisitante(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocido";
  return createHash("sha256").update(`${process.env.SESSION_SECRET}:${ip}`).digest("hex").slice(0, 32);
}

const CLAVE_TOKENS = "openai:tokens";

/** Tope diario de tokens de OpenAI para toda la app: acota el gasto máximo por día. */
const topeTokensDiario = () => Number(process.env.OPENAI_TOPE_TOKENS_DIARIO) || 500_000;

export async function hayCupoIA(): Promise<boolean> {
  const fila = await db.limiteUso.findUnique({
    where: { clave_ventana: { clave: CLAVE_TOKENS, ventana: inicioVentana(DIA_MS) } },
  });
  return (fila?.conteo ?? 0) < topeTokensDiario();
}

export async function registrarTokensIA(tokens: number): Promise<void> {
  await sumar(CLAVE_TOKENS, inicioVentana(DIA_MS), tokens);
}
