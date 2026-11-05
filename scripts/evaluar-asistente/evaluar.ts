/**
 * Evalúa el asistente de publicación contra pedidos de ejemplo (casos.json).
 * Llama a OpenAI de verdad con la key de .env.local: usarla con la key de dev.
 *
 *   npm run evaluar-asistente                       todos los casos, una vez
 *   npm run evaluar-asistente -- --veces 3          cada caso 3 veces (el modelo varía)
 *   npm run evaluar-asistente -- --caso mudanza     solo los casos cuyo nombre contiene "mudanza"
 *
 * Correrlo antes y después de tocar lib/asistente-carga.ts o de cambiar OPENAI_MODEL.
 * Sale con código 1 si algún caso falla.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

type Esperado = string | number | null | (string | number)[];
type Caso = {
  nombre: string;
  /** Mensajes de la persona. Si el asistente pregunta, se le contesta con el siguiente. */
  turnos: string[];
  espera: Record<string, Esperado>;
  /** Si en la primera respuesta tiene que preguntar algo (o pasar directo al resumen). */
  debePreguntar?: boolean;
  maxPreguntas?: number;
  /** Textos que no pueden aparecer en ningún campo (teléfonos, emails). */
  noContiene?: string[];
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "hoy+N", "dia:jueves" (de hoy a 7 días), "cualquiera" o una fecha exacta. */
function fechaValida(esperado: string, obtenido: string | null, hoy: string): boolean {
  if (esperado === "cualquiera") return obtenido !== null;
  if (!obtenido) return false;
  const suma = /^hoy\+(\d+)$/.exec(esperado);
  if (suma) return obtenido === sumarDias(hoy, Number(suma[1]));
  if (esperado.startsWith("dia:")) {
    const dia = DIAS.findIndex((d) => sinAcentos(d) === sinAcentos(esperado.slice(4)));
    return [...Array(8).keys()].some((n) => {
      const f = sumarDias(hoy, n);
      return f === obtenido && new Date(`${f}T12:00:00Z`).getUTCDay() === dia;
    });
  }
  return obtenido === esperado;
}

const CAMPOS_TEXTO = ["origen", "destino", "tipoCargaDetalle", "preferenciaCamion", "descripcion"];

/** Texto: contiene (sin acentos ni mayúsculas). Resto: igual. Una lista acepta cualquiera. */
function campoValido(campo: string, esperado: Esperado, obtenido: unknown, hoy: string): boolean {
  if (Array.isArray(esperado)) return esperado.some((e) => campoValido(campo, e, obtenido, hoy));
  if (esperado === null) return obtenido === null;
  if (campo === "fechaCarga") return fechaValida(String(esperado), obtenido as string | null, hoy);
  if (CAMPOS_TEXTO.includes(campo)) {
    return typeof obtenido === "string" && sinAcentos(obtenido).includes(sinAcentos(String(esperado)));
  }
  return obtenido === esperado;
}

async function main() {
  const args = process.argv.slice(2);
  const veces = Number(args[args.indexOf("--veces") + 1]) || 1;
  const filtro = args.includes("--caso") ? args[args.indexOf("--caso") + 1] : null;

  if (!process.env.OPENAI_API_KEY) {
    console.error("Falta OPENAI_API_KEY en .env.local");
    process.exit(2);
  }
  // Import dinámico: tiene que leer las variables de entorno ya cargadas.
  const { interpretarPedido } = await import("../../lib/asistente-carga");
  const { BORRADOR_VACIO, MAX_PREGUNTAS, camposFaltantes, hoyArgentina } = await import("../../lib/chat-carga");
  type MensajeChat = import("../../lib/chat-carga").MensajeChat;

  const casos: Caso[] = JSON.parse(fs.readFileSync(path.join("scripts", "evaluar-asistente", "casos.json"), "utf8"));
  const elegidos = casos.filter((c) => !filtro || c.nombre.includes(filtro));
  const hoy = hoyArgentina();
  let tokens = 0;
  let fallidos = 0;

  console.log(`Modelo: ${process.env.OPENAI_MODEL ?? "gpt-4o-mini"} · hoy ${hoy} · ${elegidos.length} casos × ${veces}\n`);

  for (const caso of elegidos) {
    const errores = new Map<string, number>();
    for (let v = 0; v < veces; v++) {
      const mensajes: MensajeChat[] = [];
      let borrador = BORRADOR_VACIO;
      let preguntoAlPrincipio: boolean | null = null;
      const problemas: string[] = [];

      try {
        for (let t = 0; t < caso.turnos.length; t++) {
          mensajes.push({ rol: "usuario", texto: caso.turnos[t] });
          const r = await interpretarPedido(mensajes, borrador);
          tokens += r.tokens;
          borrador = r.borrador;
          const preguntas = mensajes.filter((m) => m.rol === "asistente").length;
          // Igual que la ruta del chat: con los obligatorios completos o 3 preguntas, va al resumen.
          const listo = camposFaltantes(borrador).length === 0 || preguntas >= MAX_PREGUNTAS;
          if (preguntoAlPrincipio === null) preguntoAlPrincipio = !listo;
          if (listo || t === caso.turnos.length - 1) break;
          mensajes.push({ rol: "asistente", texto: r.pregunta ?? "¿Me pasás lo que falta?" });
        }
      } catch (err) {
        problemas.push(`error: ${err instanceof Error ? err.message : err}`);
      }

      const preguntas = mensajes.filter((m) => m.rol === "asistente").length;
      for (const [campo, esperado] of Object.entries(caso.espera)) {
        const obtenido = borrador[campo as keyof typeof borrador];
        if (!campoValido(campo, esperado, obtenido, hoy)) {
          problemas.push(`${campo}: esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(obtenido)}`);
        }
      }
      if (caso.debePreguntar !== undefined && preguntoAlPrincipio !== caso.debePreguntar) {
        problemas.push(caso.debePreguntar ? "no preguntó y faltaban datos" : "preguntó sin necesidad");
      }
      if (preguntas > (caso.maxPreguntas ?? MAX_PREGUNTAS)) {
        problemas.push(`hizo ${preguntas} preguntas (máximo ${caso.maxPreguntas ?? MAX_PREGUNTAS})`);
      }
      const todo = sinAcentos(JSON.stringify(borrador));
      for (const prohibido of caso.noContiene ?? []) {
        if (todo.includes(sinAcentos(prohibido))) problemas.push(`copió "${prohibido}" en el borrador`);
      }
      for (const p of problemas) errores.set(p, (errores.get(p) ?? 0) + 1);
      if (problemas.length) errores.set("__fallos", (errores.get("__fallos") ?? 0) + 1);
    }

    const fallas = errores.get("__fallos") ?? 0;
    errores.delete("__fallos");
    if (fallas) fallidos++;
    console.log(`${fallas ? "FALLA" : "OK   "} ${caso.nombre}${veces > 1 ? ` (${veces - fallas}/${veces})` : ""}`);
    for (const [p, n] of errores) console.log(`        ${p}${veces > 1 ? ` ×${n}` : ""}`);
  }

  console.log(`\n${elegidos.length - fallidos}/${elegidos.length} casos OK · ${tokens.toLocaleString("es-AR")} tokens usados`);
  process.exit(fallidos ? 1 : 0);
}

main();
