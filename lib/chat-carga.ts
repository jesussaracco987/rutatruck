import { TIPOS_CARGA } from "@/lib/tipos-carga";

/**
 * Borrador de carga que se arma conversando en la home. Lo comparten el chat
 * (navegador), el asistente y la publicación, por eso no importa nada de servidor.
 */
export type BorradorCarga = {
  origen: string | null;
  destino: string | null;
  tipoCarga: string | null;
  tipoCargaDetalle: string | null;
  peso: number | null;
  pesoUnidad: "tonelada" | "kg" | "bulto" | null;
  cantidadCamiones: number;
  presupuesto: number | null;
  fechaCarga: string | null;
  preferenciaCamion: string | null;
  descripcion: string | null;
};

/** `dictado`: lo que transcribió el audio, antes de que la persona lo corrigiera y lo enviara. */
export type MensajeChat = { rol: "usuario" | "asistente"; texto: string; dictado?: string };

export const BORRADOR_VACIO: BorradorCarga = {
  origen: null,
  destino: null,
  tipoCarga: null,
  tipoCargaDetalle: null,
  peso: null,
  pesoUnidad: null,
  cantidadCamiones: 1,
  presupuesto: null,
  fechaCarga: null,
  preferenciaCamion: null,
  descripcion: null,
};

/** localStorage del formulario de carga: el chat le deja ahí lo conversado. */
export const DRAFT_FORMULARIO_KEY = "clickcargo-nueva-carga-draft";

/** Convierte el borrador al formato (todo strings) del formulario de `/publicar`. */
export function borradorAFormulario(
  b: BorradorCarga,
  puntos: {
    origenPunto: { lat: number; lng: number } | null;
    destinoPunto: { lat: number; lng: number } | null;
  },
  contacto: { nombre: string; telefono: string; email: string },
) {
  return {
    origen: b.origen ?? "",
    origenLat: puntos.origenPunto ? String(puntos.origenPunto.lat) : "",
    origenLng: puntos.origenPunto ? String(puntos.origenPunto.lng) : "",
    destino: b.destino ?? "",
    destinoLat: puntos.destinoPunto ? String(puntos.destinoPunto.lat) : "",
    destinoLng: puntos.destinoPunto ? String(puntos.destinoPunto.lng) : "",
    tipoCarga: b.tipoCarga ?? "",
    tipoCargaDetalle: b.tipoCargaDetalle ?? "",
    peso: b.peso === null ? "" : String(b.peso),
    pesoUnidad: b.pesoUnidad ?? "tonelada",
    cantidadCamiones: String(b.cantidadCamiones),
    presupuesto: b.presupuesto === null ? "" : String(b.presupuesto),
    fechaCarga: b.fechaCarga ?? "",
    fechaCupo: "",
    preferenciaCamion: b.preferenciaCamion ?? "",
    descripcion: b.descripcion ?? "",
    contactoNombre: contacto.nombre,
    contactoTelefono: contacto.telefono,
    contactoEmail: contacto.email,
  };
}

/** Tope comprometido con el cliente: el asistente nunca hace más de 3 preguntas. */
export const MAX_PREGUNTAS = 3;
export const MAX_LARGO_MENSAJE = 500;
export const MAX_MENSAJES = MAX_PREGUNTAS * 2 + 1;

const CAMPOS_REQUERIDOS = ["origen", "destino", "tipoCarga", "fechaCarga"] as const;
export type CampoRequerido = (typeof CAMPOS_REQUERIDOS)[number];

export function camposFaltantes(b: BorradorCarga): CampoRequerido[] {
  return CAMPOS_REQUERIDOS.filter((c) => !b[c]);
}

/** Fecha de hoy (YYYY-MM-DD) en Argentina, sin importar la zona del servidor. */
export function hoyArgentina(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(ahora);
}

function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  return valor.trim().slice(0, max) || null;
}

function numero(valor: unknown, max: number): number | null {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return typeof n === "number" && Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

function fecha(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== valor) return null;
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() + 1);
  return valor >= hoyArgentina() && d <= limite ? valor : null;
}

/**
 * Normaliza lo que llega del asistente o del navegador. Ninguno de los dos es
 * confiable: el modelo puede inventar un tipo o una fecha pasada, y el cuerpo
 * del pedido lo puede armar cualquiera. Lo inválido o ausente conserva `previo`.
 */
export function sanitizarBorrador(raw: unknown, previo: BorradorCarga = BORRADOR_VACIO): BorradorCarga {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tipo = TIPOS_CARGA.some((t) => t.value === r.tipoCarga) ? (r.tipoCarga as string) : null;
  const unidad = r.pesoUnidad === "tonelada" || r.pesoUnidad === "kg" || r.pesoUnidad === "bulto" ? r.pesoUnidad : null;
  const camiones = numero(r.cantidadCamiones, 100);

  const tipoCarga = tipo ?? previo.tipoCarga;
  return {
    origen: texto(r.origen, 120) ?? previo.origen,
    destino: texto(r.destino, 120) ?? previo.destino,
    tipoCarga,
    tipoCargaDetalle: texto(r.tipoCargaDetalle, 120) ?? previo.tipoCargaDetalle,
    peso: numero(r.peso, 1_000_000) ?? previo.peso,
    pesoUnidad: unidad ?? previo.pesoUnidad,
    // Un paquete viaja en un solo vehículo, igual que en el formulario.
    cantidadCamiones: tipoCarga === "paqueteria" ? 1 : camiones ? Math.floor(camiones) || 1 : previo.cantidadCamiones,
    presupuesto: numero(r.presupuesto, 1_000_000_000) ?? previo.presupuesto,
    fechaCarga: fecha(r.fechaCarga) ?? previo.fechaCarga,
    preferenciaCamion: texto(r.preferenciaCamion, 120) ?? previo.preferenciaCamion,
    descripcion: texto(r.descripcion, 500) ?? previo.descripcion,
  };
}
