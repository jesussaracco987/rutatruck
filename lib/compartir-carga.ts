import { formatFechaDia } from "@/lib/fechas";
import { TIPO_CARGA_LABELS } from "@/lib/tipos-carga";

/** Texto que acompaña al link cuando se comparte una carga (WhatsApp, grupos). */
export function textoCompartirCarga(carga: {
  origen: string;
  destino: string;
  fechaCarga: Date;
  tipoCarga: string;
  cantidadCamiones: number;
}): string {
  const tipo = TIPO_CARGA_LABELS[carga.tipoCarga] ?? carga.tipoCarga;
  const camiones =
    carga.cantidadCamiones > 1 ? `Se necesitan ${carga.cantidadCamiones} camiones` : "Se necesita un camión";
  return `${camiones}: ${carga.origen} → ${carga.destino}, ${formatFechaDia(carga.fechaCarga)} (${tipo}). Postulate en ClickCargo:`;
}

/** Ruta de la carga del lado transportista: es la que se comparte, aunque la comparta quien publica. */
export const rutaCargaParaTransportistas = (cargaId: number) => `/transportista/cargas/${cargaId}`;
