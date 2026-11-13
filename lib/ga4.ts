import crypto from "crypto";

/**
 * Cliente mínimo de la Google Analytics Data API (GA4) con una cuenta de
 * servicio de solo lectura. Usa la API REST directamente para no sumar
 * dependencias: firma el JWT de la cuenta de servicio, lo cambia por un access
 * token y llama a runReport.
 *
 * Variables: GA4_PROPERTY_ID (el número de la propiedad, no el G-…),
 * GA4_CLIENT_EMAIL y GA4_PRIVATE_KEY (los campos client_email y private_key del
 * JSON de la cuenta de servicio). La clave puede venir con saltos reales o con
 * "\n" escritos, según se cargue en .env o en Vercel.
 */

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let tokenCache: { token: string; venceEn: number } | null = null;

function credenciales() {
  const propiedad = process.env.GA4_PROPERTY_ID;
  const email = process.env.GA4_CLIENT_EMAIL;
  const clave = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!propiedad || !email || !clave) return null;
  return { propiedad, email, clave };
}

export function ga4Configurado(): boolean {
  return credenciales() !== null;
}

const base64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

async function accessToken(email: string, clave: string): Promise<string> {
  if (tokenCache && tokenCache.venceEn > Date.now() + 60_000) return tokenCache.token;

  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: ahora, exp: ahora + 3600 }),
  );
  const firma = crypto.createSign("RSA-SHA256").update(`${cabecera}.${cuerpo}`).sign(clave);
  const jwt = `${cabecera}.${cuerpo}.${base64url(firma)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GA4: no se pudo obtener el token (${res.status}) ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, venceEn: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export type ReporteGa4 = {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
};

/** Fila de un reporte como objeto: dimensiones como string, métricas como número. */
export type FilaGa4 = Record<string, string | number>;

/** Llama a runReport y devuelve las filas ya planas. `body` sigue el formato de la API. */
export async function runReport(body: Record<string, unknown>): Promise<FilaGa4[]> {
  const cred = credenciales();
  if (!cred) throw new Error("GA4 no está configurado");
  const token = await accessToken(cred.email, cred.clave);

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cred.propiedad}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GA4: runReport falló (${res.status}) ${await res.text()}`);
  const data = (await res.json()) as ReporteGa4;

  const dims = data.dimensionHeaders?.map((h) => h.name) ?? [];
  const mets = data.metricHeaders?.map((h) => h.name) ?? [];
  return (data.rows ?? []).map((r) => {
    const fila: FilaGa4 = {};
    dims.forEach((d, i) => (fila[d] = r.dimensionValues?.[i]?.value ?? ""));
    mets.forEach((m, i) => (fila[m] = Number(r.metricValues?.[i]?.value ?? 0)));
    return fila;
  });
}
