import "server-only";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { consumirLimite, hayCupoIA, registrarTokensIA, sumarUso } from "@/lib/limite-uso";
import { AsistenteNoDisponible, interpretarPedido } from "@/lib/asistente-carga";
import { normalizarTelefono } from "@/lib/telefono";
import { SITE_URL } from "@/lib/site";
import { TIPO_CARGA_LABELS } from "@/lib/tipos-carga";
import { isEmpresa } from "@/lib/roles";
import { parseCargaInput } from "@/lib/carga-input";
import { centroDeLocalidad, dentroDeArgentina } from "@/lib/georef";
import type { RespuestaWhatsapp } from "@/lib/whatsapp";
import {
  BORRADOR_VACIO,
  MAX_LARGO_MENSAJE,
  MAX_PREGUNTAS,
  PREGUNTA_POR_CAMPO,
  camposFaltantes,
  sanitizarBorrador,
  type BorradorCarga,
  type MensajeChat,
} from "@/lib/chat-carga";
import {
  registrarFallo,
  registrarPaso,
  registrarPublicada,
  registrarTurno,
} from "@/lib/services/conversacion-chat.service";
import { enviarCodigoPublicacion, normalizarEmail, verificarCodigo } from "@/lib/services/publicar-chat.service";
import { publicarCarga } from "@/lib/services/carga.service";
import { generarLinkAcceso } from "@/lib/services/solicitud-transportista.service";

/**
 * Publicar una carga solo chateando por WhatsApp. Es el mismo asistente del
 * chat de la home; WhatsApp manda los mensajes de a uno, así que la
 * conversación se guarda en ConversacionChat (origen "whatsapp") y se busca
 * por el número. Pasos:
 *
 * 1. chat: el asistente junta origen, destino, tipo y fecha (hasta 3 preguntas).
 * 2. origen / destino: la persona manda la ubicación con el botón de WhatsApp,
 *    o escribe "ciudad" y se usa el centro de la ciudad.
 * 3. confirmar: resumen con botones "Publicar" y "Corregir". Tocar Publicar es
 *    aceptar Términos y Política (van linkeados en el mensaje). Corregir manda
 *    al link de la web (/publicar/whatsapp/<token>), que permite editar todo.
 * 4. Cuenta: el número ya viene probado por WhatsApp. Si tiene cuenta con
 *    email, publica directo. Si no, pide email y un código que llega a ese
 *    email (así nadie usa un email ajeno), y entra o crea la cuenta.
 * 5. Publica por el mismo circuito que la web (publicarCarga) y, si la cuenta
 *    es nueva, manda el link para elegir contraseña.
 */

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

/** Pasado este tiempo sin terminar, un mensaje nuevo arranca otra conversación. */
const VENTANA_CONVERSACION_MS = DIA_MS;
const VIGENCIA_LINK_MS = 7 * DIA_MS;

/**
 * Topes por número. Cada carga usa como mucho 4 mensajes con OpenAI, así que
 * 60 mensajes por día sobran para uso real, y evitan que un solo número se
 * coma el tope diario global de tokens (hayCupoIA) y deje al bot sin
 * respuestas para todos. Las ventanas son fijas (la del día empieza a las
 * 21 h de Argentina).
 */
const MENSAJES_POR_HORA = 30;
const MENSAJES_POR_DIA = 60;
const CARGAS_NUEVAS_POR_DIA = 5;
const PUBLICADAS_POR_DIA = 3;
const CODIGOS_POR_HORA = 5;

const REINICIO = /^\s*(nueva|nueva carga|otra|otra carga|empezar de nuevo|reiniciar|cancelar)\s*[.!]*\s*$/i;
const SI_PUBLICAR = /^\s*(publicar|publicala|publicalo|s[ií]|dale|ok|okey|confirmo|confirmar|listo)\b/i;
const CORREGIR = /^\s*(corregir|cambiar|editar|modificar|no)\b/i;
const USAR_CIUDAD = /\b(ciudad|centro)\b/i;
const EMAIL_EN_TEXTO = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>().,;:]+/;

const BOTON_PUBLICAR = "publicar";
const BOTON_CORREGIR = "corregir";

const sitio = () => SITE_URL ?? "https://clickcargo.com.ar";

/** Como claveVisitante, pero del número: las métricas no guardan el teléfono en claro. */
const visitanteDe = (telefono: string) =>
  createHash("sha256").update(`${process.env.SESSION_SECRET}:wa:${telefono}`).digest("hex").slice(0, 32);

/** Número en formato 549… (el de NumeroBloqueado, ConversacionChat y telefonoLogin). */
export const telefonoDeWhatsapp = (from: string) => normalizarTelefono(from) ?? from.replace(/\D/g, "");

// --- Lo que llega del webhook ---------------------------------------------

export type EntradaWhatsapp =
  | { tipo: "texto"; texto: string }
  | { tipo: "ubicacion"; lat: number; lng: number }
  | { tipo: "boton"; id: string }
  | { tipo: "otro" };

/** Paso después del chat, guardado en ConversacionChat.whatsapp. */
type Punto = { lat: number; lng: number };
type EstadoWhatsapp = {
  paso: "origen" | "destino" | "confirmar" | "email" | "codigo";
  /** Nombre del perfil de WhatsApp: es el nombre de contacto y el de la cuenta nueva. */
  nombre?: string;
  origenPunto?: Punto;
  destinoPunto?: Punto;
  email?: string;
};

// --- Link de confirmación en la web ---------------------------------------

function firmar(id: string, vence: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "")
    .update(`wa-carga:${id}:${vence}`)
    .digest("base64url")
    .slice(0, 22);
}

export function linkConfirmacion(conversacionId: string): string {
  const vence = (Date.now() + VIGENCIA_LINK_MS).toString(36);
  return `${sitio()}/publicar/whatsapp/${conversacionId}.${vence}.${firmar(conversacionId, vence)}`;
}

/** Id de la conversación si el token es auténtico y no venció. */
function leerToken(token: string): string | null {
  const match = token.match(/^([0-9a-f-]{36})\.([a-z0-9]{6,12})\.([A-Za-z0-9_-]{22})$/i);
  if (!match) return null;
  const [, id, vence, firma] = match;
  const esperada = Buffer.from(firmar(id, vence));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  return parseInt(vence, 36) >= Date.now() ? id : null;
}

export type ConversacionAConfirmar =
  | { estado: "invalida" }
  | { estado: "publicada" }
  | {
      estado: "pendiente";
      id: string;
      mensajes: MensajeChat[];
      borrador: BorradorCarga;
      telefono: string;
    };

/** Lo que necesita la página del link para abrir el resumen. */
export async function conversacionAConfirmar(token: string): Promise<ConversacionAConfirmar> {
  const id = leerToken(token);
  if (!id) return { estado: "invalida" };

  const conv = await db.conversacionChat.findUnique({
    where: { id },
    select: { origen: true, pasoMaximo: true, mensajes: true, borradorAsistente: true, telefono: true },
  });
  if (!conv || conv.origen !== "whatsapp" || !conv.borradorAsistente) return { estado: "invalida" };
  if (conv.pasoMaximo === "publicada") return { estado: "publicada" };

  return {
    estado: "pendiente",
    id,
    mensajes: (conv.mensajes ?? []) as MensajeChat[],
    borrador: sanitizarBorrador(conv.borradorAsistente),
    // Si la persona empezó otra conversación, el número se soltó: se completa a mano.
    telefono: conv.telefono ?? "",
  };
}

// --- Textos ---------------------------------------------------------------

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d, 12));
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "numeric", timeZone: "UTC" }).format(fecha);
}

const UNIDADES: Record<NonNullable<BorradorCarga["pesoUnidad"]>, string> = { tonelada: "t", kg: "kg", bulto: "bultos" };

function lineasCarga(b: BorradorCarga): string[] {
  const tipo = b.tipoCarga ? TIPO_CARGA_LABELS[b.tipoCarga] : null;
  const lineas = [
    `*Recorrido:* ${b.origen ?? "a completar"} → ${b.destino ?? "a completar"}`,
    `*Carga:* ${tipo ? (b.tipoCargaDetalle ? `${tipo} (${b.tipoCargaDetalle})` : tipo) : "a completar"}`,
    `*Fecha:* ${b.fechaCarga ? fechaLegible(b.fechaCarga) : "a completar"}`,
  ];
  if (b.peso) lineas.push(`*Peso:* ${b.peso.toLocaleString("es-AR")} ${UNIDADES[b.pesoUnidad ?? "tonelada"]}`);
  if (b.cantidadCamiones > 1) lineas.push(`*Camiones:* ${b.cantidadCamiones}`);
  lineas.push(`*Presupuesto:* ${b.presupuesto ? `$${b.presupuesto.toLocaleString("es-AR")}` : "a acordar"}`);
  return lineas;
}

/** Con datos sin completar (se agotaron las preguntas) se termina en la web, que deja editar todo. */
function resumenParaLaWeb(b: BorradorCarga, link: string): string {
  return [
    "Así quedó tu carga:",
    "",
    ...lineasCarga(b),
    "",
    "Faltan algunos datos. Completalos y publicala desde este link:",
    link,
    "",
    "Si querés armar otra, escribí *nueva*.",
  ].join("\n");
}

const pedirUbicacion = (b: BorradorCarga, cual: "origen" | "destino"): RespuestaWhatsapp => ({
  texto:
    cual === "origen"
      ? `Ahora mandame la ubicación exacta donde se *carga* en ${b.origen}: tocá el botón de abajo, o el clip 📎 y "Ubicación". Si todavía no la sabés, escribí *ciudad* y uso el centro de ${b.origen}.`
      : `Ahora la ubicación donde se *descarga* en ${b.destino}. Si no la sabés, escribí *ciudad*.`,
  pedirUbicacion: true,
});

const confirmacion = (b: BorradorCarga): RespuestaWhatsapp => ({
  texto: [
    "Así se va a publicar tu carga:",
    "",
    ...lineasCarga(b),
    "",
    `Al tocar *Publicar* aceptás los Términos (${sitio()}/terminos) y la Política de Privacidad (${sitio()}/politica-de-privacidad) de ClickCargo.`,
  ].join("\n"),
  botones: [
    { id: BOTON_PUBLICAR, titulo: "Publicar" },
    { id: BOTON_CORREGIR, titulo: "Corregir" },
  ],
});

const NO_DISPONIBLE = () =>
  `Ahora no puedo leer tu pedido. Podés publicar tu carga desde ${sitio()}/publicar o escribirme de nuevo en un rato.`;

const BIENVENIDA_REINICIO =
  "Dale, empezamos de nuevo. Contame qué necesitás mover, desde dónde, hasta dónde y para cuándo.";

const SOLO_TEXTO =
  "Por ahora solo leo mensajes de texto. Escribime qué necesitás mover, desde dónde, hasta dónde y para cuándo.";

const PEDIR_EMAIL =
  "¿A qué email te avisamos cuando se postule un transportista? Te mando un código ahí para confirmarlo.";

// --- Topes ----------------------------------------------------------------

/**
 * Suma un uso al tope. Pasado el máximo avisa una sola vez (el primer mensaje
 * que se pasa) y después queda en silencio: contestar cada mensaje de un
 * abuso también es gastar.
 */
async function pasarTope(clave: string, max: number, ventanaMs: number, aviso: string) {
  const usos = await sumarUso(clave, ventanaMs);
  if (usos <= max) return { ok: true as const };
  return { ok: false as const, respuesta: usos === max + 1 ? aviso : null };
}

// --- Entrada principal ----------------------------------------------------

/**
 * Procesa un mensaje y devuelve la respuesta, o null si no hay que contestar
 * (número bloqueado o tope ya avisado). `from` es el número tal como lo
 * informa Meta; `perfil` es el nombre que la persona tiene en WhatsApp.
 */
export async function responderMensajeCarga(
  from: string,
  entrada: EntradaWhatsapp,
  perfil?: string,
): Promise<RespuestaWhatsapp | null> {
  const telefono = telefonoDeWhatsapp(from);
  if (await db.numeroBloqueado.findUnique({ where: { telefono }, select: { telefono: true } })) return null;

  // Cuentan todos los mensajes, también audios, ubicaciones y botones.
  const porHora = await pasarTope(
    `wa:${telefono}`,
    MENSAJES_POR_HORA,
    HORA_MS,
    "Recibí muchos mensajes seguidos. Probá de nuevo en un rato.",
  );
  if (!porHora.ok) return porHora.respuesta;
  const porDia = await pasarTope(
    `wa-dia:${telefono}`,
    MENSAJES_POR_DIA,
    DIA_MS,
    `Por hoy llegaste al máximo de mensajes. Probá de nuevo mañana, o publicá tu carga desde ${sitio()}/publicar`,
  );
  if (!porDia.ok) return porDia.respuesta;

  const texto = entrada.tipo === "texto" ? entrada.texto.trim().slice(0, MAX_LARGO_MENSAJE) : "";

  // Soltar el número de la conversación anterior la deja en las métricas tal como quedó.
  if (texto && REINICIO.test(texto)) {
    await db.conversacionChat.updateMany({
      where: { telefono, origen: "whatsapp", pasoMaximo: { not: "publicada" } },
      data: { telefono: null },
    });
    return BIENVENIDA_REINICIO;
  }

  const activa = await db.conversacionChat.findFirst({
    where: {
      telefono,
      origen: "whatsapp",
      pasoMaximo: { not: "publicada" },
      creadaEn: { gte: new Date(Date.now() - VENTANA_CONVERSACION_MS) },
    },
    orderBy: { creadaEn: "desc" },
    select: { id: true, mensajes: true, borradorAsistente: true, pasoMaximo: true, whatsapp: true },
  });

  const estado = (activa?.whatsapp ?? null) as EstadoWhatsapp | null;
  if (activa && estado) {
    const borrador = sanitizarBorrador(activa.borradorAsistente);
    return avanzar({ id: activa.id, telefono, borrador, estado: { ...estado, nombre: perfil || estado.nombre }, entrada, texto });
  }
  // Armada pero incompleta: se termina en la web.
  if (activa && activa.pasoMaximo !== "chat") {
    return `Tu carga ya está armada. Para completarla y publicarla, entrá acá:\n${linkConfirmacion(activa.id)}\n\nSi querés armar otra, escribí *nueva*.`;
  }

  if (!texto) return SOLO_TEXTO;

  // Cada carga nueva puede costar hasta 4 llamadas a OpenAI: "nueva" repetido no puede ser gratis.
  if (!activa) {
    const nueva = await pasarTope(
      `wa-cargas:${telefono}`,
      CARGAS_NUEVAS_POR_DIA,
      DIA_MS,
      `Por hoy ya armaste varias cargas por acá. Probá de nuevo mañana, o publicá desde ${sitio()}/publicar`,
    );
    if (!nueva.ok) return nueva.respuesta;
  }

  return conversar({
    id: activa?.id ?? randomUUID(),
    telefono,
    previos: (activa?.mensajes ?? []) as MensajeChat[],
    borradorPrevio: activa?.borradorAsistente ? sanitizarBorrador(activa.borradorAsistente) : BORRADOR_VACIO,
    texto,
    perfil,
  });
}

// --- Paso 1: chat con el asistente ----------------------------------------

async function conversar(datos: {
  id: string;
  telefono: string;
  previos: MensajeChat[];
  borradorPrevio: BorradorCarga;
  texto: string;
  perfil?: string;
}): Promise<RespuestaWhatsapp> {
  const { id, telefono } = datos;
  const mensajes: MensajeChat[] = [...datos.previos, { rol: "usuario", texto: datos.texto }];
  const visitante = visitanteDe(telefono);
  const canal = { whatsapp: { telefono } };

  if (!(await hayCupoIA())) {
    await registrarFallo({ id, visitante, userId: null, mensajes, motivo: "tope_diario", ...canal });
    return NO_DISPONIBLE();
  }

  let resultado: Awaited<ReturnType<typeof interpretarPedido>>;
  try {
    resultado = await interpretarPedido(mensajes, datos.borradorPrevio);
  } catch (err) {
    if (!(err instanceof AsistenteNoDisponible)) throw err;
    console.error("[whatsapp-carga] Asistente:", err.message);
    await registrarFallo({ id, visitante, userId: null, mensajes, motivo: "openai", ...canal });
    return NO_DISPONIBLE();
  }
  await registrarTokensIA(resultado.tokens);

  const faltan = camposFaltantes(resultado.borrador);
  const preguntasHechas = mensajes.filter((m) => m.rol === "asistente").length;
  const listo = faltan.length === 0 || preguntasHechas >= MAX_PREGUNTAS;
  const pregunta = listo ? null : (resultado.pregunta ?? PREGUNTA_POR_CAMPO[faltan[0]]);

  await registrarTurno({
    id,
    visitante,
    userId: null,
    mensajes: pregunta ? [...mensajes, { rol: "asistente", texto: pregunta }] : mensajes,
    borrador: resultado.borrador,
    tokens: resultado.tokens,
    listo,
    ...canal,
  });

  if (pregunta) return pregunta;
  // Sin preguntas disponibles y con datos faltantes: se completa en la web.
  if (faltan.length > 0) return resumenParaLaWeb(resultado.borrador, linkConfirmacion(id));

  await guardarEstado(id, { paso: "origen", nombre: datos.perfil });
  await registrarPaso(id, "mapa", resultado.borrador);
  return pedirUbicacion(resultado.borrador, "origen");
}

// --- Pasos 2 a 5 ----------------------------------------------------------

function guardarEstado(id: string, estado: EstadoWhatsapp) {
  return db.conversacionChat.update({
    where: { id },
    data: { whatsapp: estado as unknown as Prisma.InputJsonValue },
  });
}

type Contexto = {
  id: string;
  telefono: string;
  borrador: BorradorCarga;
  estado: EstadoWhatsapp;
  entrada: EntradaWhatsapp;
  texto: string;
};

async function avanzar(c: Contexto): Promise<RespuestaWhatsapp | null> {
  switch (c.estado.paso) {
    case "origen":
    case "destino":
      return recibirUbicacion(c, c.estado.paso);
    case "confirmar":
      return confirmar(c);
    case "email":
      return recibirEmail(c);
    case "codigo":
      return recibirCodigo(c);
  }
}

async function recibirUbicacion(c: Contexto, cual: "origen" | "destino"): Promise<RespuestaWhatsapp> {
  let punto: Punto | null = null;
  if (c.entrada.tipo === "ubicacion") {
    if (!dentroDeArgentina(c.entrada.lat, c.entrada.lng)) {
      return { texto: "Esa ubicación no está en Argentina. Mandame la del lugar donde se carga o se descarga.", pedirUbicacion: true };
    }
    punto = { lat: c.entrada.lat, lng: c.entrada.lng };
  } else if (USAR_CIUDAD.test(c.texto)) {
    const centro = await centroDeLocalidad(cual === "origen" ? c.borrador.origen : c.borrador.destino);
    if (!centro) {
      return {
        texto: `No encontré ${cual === "origen" ? c.borrador.origen : c.borrador.destino} en el mapa. Mandame la ubicación con el botón de abajo.`,
        pedirUbicacion: true,
      };
    }
    punto = { lat: centro.lat, lng: centro.lng };
  }
  if (!punto) return pedirUbicacion(c.borrador, cual);

  if (cual === "origen") {
    await guardarEstado(c.id, { ...c.estado, paso: "destino", origenPunto: punto });
    return pedirUbicacion(c.borrador, "destino");
  }
  await guardarEstado(c.id, { ...c.estado, paso: "confirmar", destinoPunto: punto });
  return confirmacion(c.borrador);
}

async function confirmar(c: Contexto): Promise<RespuestaWhatsapp | null> {
  const boton = c.entrada.tipo === "boton" ? c.entrada.id : null;
  if (boton === BOTON_CORREGIR || (!boton && CORREGIR.test(c.texto))) {
    return `Corregí lo que necesites y publicala desde este link:\n${linkConfirmacion(c.id)}\n\nSi preferís empezar de cero por acá, escribí *nueva*.`;
  }
  if (boton !== BOTON_PUBLICAR && !SI_PUBLICAR.test(c.texto)) return confirmacion(c.borrador);

  // El número ya está probado: si tiene cuenta con email, no hace falta nada más.
  const cuenta = await db.user.findUnique({
    where: { telefonoLogin: c.telefono },
    select: { id: true, role: true, email: true, name: true },
  });
  if (cuenta && !isEmpresa(cuenta.role)) return CUENTA_TRANSPORTISTA;
  if (cuenta?.email) return publicar(c, { userId: cuenta.id, email: cuenta.email, nombre: cuenta.name, nueva: false });

  await guardarEstado(c.id, { ...c.estado, paso: "email" });
  await registrarPaso(c.id, "contacto");
  return PEDIR_EMAIL;
}

const CUENTA_TRANSPORTISTA =
  "Este número es de una cuenta de transportista, y esas cuentas no publican cargas. Si necesitás publicar, escribinos desde otro número o publicá desde la web con otra cuenta.";

async function recibirEmail(c: Contexto): Promise<RespuestaWhatsapp> {
  const email = normalizarEmail(c.texto.match(EMAIL_EN_TEXTO)?.[0] ?? "");
  if (!email) return `No encontré un email en tu mensaje. ${PEDIR_EMAIL}`;
  return mandarCodigo(c, email);
}

async function mandarCodigo(c: Contexto, email: string): Promise<RespuestaWhatsapp> {
  // Por número y por casilla: frena tanto el abuso como el bombardeo a un tercero.
  const permitido =
    (await consumirLimite(`codigo-wa:${c.telefono}`, CODIGOS_POR_HORA)) &&
    (await consumirLimite(`codigo-email:${email}`, CODIGOS_POR_HORA));
  if (!permitido) return "Pediste demasiados códigos. Probá de nuevo en un rato.";

  const envio = await enviarCodigoPublicacion(email, "whatsapp");
  if (!envio.ok) return `${envio.error} ${PEDIR_EMAIL}`;

  await guardarEstado(c.id, { ...c.estado, paso: "codigo", email });
  return `Te mandé un código de 6 dígitos a ${email}. Respondeme con el código.\n\nSi no te llega, revisá spam, escribí *reenviar* o mandame otro email.`;
}

async function recibirCodigo(c: Contexto): Promise<RespuestaWhatsapp | null> {
  const email = c.estado.email;
  if (!email) {
    await guardarEstado(c.id, { ...c.estado, paso: "email" });
    return PEDIR_EMAIL;
  }

  const otroEmail = c.texto.match(EMAIL_EN_TEXTO)?.[0];
  if (otroEmail) return mandarCodigo(c, normalizarEmail(otroEmail));
  if (/\breenvi/i.test(c.texto)) return mandarCodigo(c, email);

  const codigo = c.texto.replace(/\s/g, "");
  if (!/^\d{6}$/.test(codigo)) return `Respondeme con los 6 dígitos que te llegaron a ${email}, o escribí *reenviar*.`;

  const error = await verificarCodigo(email, codigo);
  if (error) return error;

  const cuenta = await cuentaParaPublicar(c, email);
  if ("respuesta" in cuenta) return cuenta.respuesta;
  return publicar(c, cuenta);
}

type Cuenta = { userId: string; email: string; nombre: string; nueva: boolean };

/**
 * Con el email ya probado por el código y el número probado por WhatsApp:
 * entra a la cuenta de cualquiera de los dos, o crea una nueva con ambos.
 */
async function cuentaParaPublicar(c: Contexto, email: string): Promise<Cuenta | { respuesta: string }> {
  const [porEmail, porTelefono] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true, role: true, name: true, telefonoLogin: true } }),
    db.user.findUnique({ where: { telefonoLogin: c.telefono }, select: { id: true, role: true, name: true } }),
  ]);

  if (porEmail) {
    if (!isEmpresa(porEmail.role)) {
      return { respuesta: "Ese email es de una cuenta de transportista, que no publica cargas. Mandame otro email." };
    }
    // Una cuenta sin teléfono de ingreso se queda con este, que WhatsApp ya probó.
    if (!porEmail.telefonoLogin && !porTelefono) {
      await db.user.update({ where: { id: porEmail.id }, data: { telefonoLogin: c.telefono, emailVerified: true } });
    }
    return { userId: porEmail.id, email, nombre: porEmail.name, nueva: false };
  }

  // Cuenta del número sin email (alta asistida): se completa con este.
  if (porTelefono) {
    await db.user.update({ where: { id: porTelefono.id }, data: { email, emailVerified: true } });
    return { userId: porTelefono.id, email, nombre: porTelefono.name, nueva: false };
  }

  const nombre = c.estado.nombre?.trim().slice(0, 80) || email.split("@")[0];
  const user = await db.user.create({
    data: {
      name: nombre,
      email,
      // Sin contraseña elegida: la elige con el link que se manda al publicar.
      password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      role: "EMPRESA",
      phone: c.telefono,
      telefonoLogin: c.telefono,
      emailVerified: true,
      terminosAceptadosEn: new Date(),
      origenFuente: "whatsapp",
      origenMedio: "bot",
    },
  });
  return { userId: user.id, email, nombre, nueva: true };
}

async function publicar(c: Contexto, cuenta: Cuenta): Promise<RespuestaWhatsapp | null> {
  const { origenPunto, destinoPunto } = c.estado;
  if (!origenPunto || !destinoPunto) {
    await guardarEstado(c.id, { ...c.estado, paso: "origen" });
    return pedirUbicacion(c.borrador, "origen");
  }

  const tope = await pasarTope(
    `wa-publicadas:${c.telefono}`,
    PUBLICADAS_POR_DIA,
    DIA_MS,
    `Por hoy ya publicaste varias cargas por acá. Si necesitás publicar más, hacelo desde ${sitio()}/empresa/cargas/nueva`,
  );
  if (!tope.ok) return tope.respuesta;

  const b = c.borrador;
  const input = parseCargaInput({
    ...b,
    cantidadCamiones: String(b.cantidadCamiones),
    peso: b.peso === null ? "" : String(b.peso),
    presupuesto: b.presupuesto === null ? "" : String(b.presupuesto),
    origenLat: String(origenPunto.lat),
    origenLng: String(origenPunto.lng),
    destinoLat: String(destinoPunto.lat),
    destinoLng: String(destinoPunto.lng),
    contactoNombre: c.estado.nombre?.trim() || cuenta.nombre,
    contactoTelefono: c.telefono,
    contactoEmail: cuenta.email,
  });
  if (!input.ok) {
    return `No pude publicarla: ${input.error}. Corregila desde este link:\n${linkConfirmacion(c.id)}`;
  }

  const publicada = await publicarCarga({ ...input.data, empresaId: cuenta.userId }, sitio());
  if (!publicada.ok) {
    return `No pude publicarla (${publicada.error}). Probá desde este link:\n${linkConfirmacion(c.id)}`;
  }

  const cargaId = "cargaId" in publicada ? publicada.cargaId : undefined;
  await registrarPublicada(c.id, cargaId);
  await db.conversacionChat.update({ where: { id: c.id }, data: { userId: cuenta.userId } });

  const acceso = cuenta.nueva
    ? `\n\nTe creamos la cuenta. Elegí tu contraseña en este link para ver quién se postula (después entrás con tu teléfono o tu email):\n${await generarLinkAcceso(cuenta.userId, sitio(), true)}`
    : `\n\nVas a ver quién se postula en ${sitio()}/empresa/cargas${cargaId ? `/${cargaId}` : ""}`;

  if (!cargaId && "url" in publicada) {
    return `¡Casi listo! Para que se publique, aboná la publicación acá:\n${publicada.url}${acceso}`;
  }
  return `¡Listo, tu carga está publicada! Te avisamos por email a ${cuenta.email} cuando se postule un transportista.${acceso}\n\nSi querés armar otra, escribí *nueva*.`;
}
