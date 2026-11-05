import "server-only";
import { AsistenteNoDisponible } from "@/lib/asistente-carga";
import { MAX_LARGO_MENSAJE } from "@/lib/chat-carga";

/** Vercel corta los pedidos en 4,5 MB; un minuto de voz comprimida pesa bastante menos. */
export const MAX_BYTES_AUDIO = 4 * 1024 * 1024;

/** Formatos que acepta OpenAI y que graban los navegadores (Chrome: webm, Safari: mp4). */
const EXTENSIONES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
};

export const extensionAudio = (tipo: string) => EXTENSIONES[tipo.split(";")[0].trim().toLowerCase()] ?? null;

/** Le sugiere al modelo cómo se escriben las palabras del rubro y los lugares. */
const CONTEXTO =
  "Pedido de flete en Argentina. Pallets, mudanza, semi, chasis, acoplado, sider, playo, chata, utilitario, big bags, bolsones, toneladas. Rosario, Córdoba, CABA, Mendoza, Tucumán, Neuquén.";

/** Pasa el audio a texto. El audio no se guarda: vive solo durante este pedido. */
export async function transcribirAudio(audio: Blob, extension: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AsistenteNoDisponible("OPENAI_API_KEY no configurada");

  const form = new FormData();
  form.append("file", audio, `pedido.${extension}`);
  form.append("model", process.env.OPENAI_MODEL_TRANSCRIPCION ?? "gpt-4o-mini-transcribe");
  form.append("language", "es");
  form.append("prompt", CONTEXTO);
  form.append("response_format", "json");

  const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  let res: Response;
  try {
    res = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new AsistenteNoDisponible(`Sin respuesta de OpenAI: ${err}`);
  }
  if (!res.ok) {
    throw new AsistenteNoDisponible(`OpenAI respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json().catch(() => null);
  const texto = typeof data?.text === "string" ? data.text.trim().slice(0, MAX_LARGO_MENSAJE) : "";
  return {
    texto,
    // Los modelos gpt-4o informan tokens; whisper-1 informa segundos. Sin dato, se cuenta como un minuto.
    tokens: Number(data?.usage?.total_tokens) || 1500,
  };
}
