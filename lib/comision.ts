import { db } from "./db";

export async function getComisionConfig() {
  return db.configApp.upsert({
    where: { id: 1 },
    create: { id: 1, comisionTipo: "FIJO", comisionValor: 100, precioPublicacion: 500 },
    update: {},
  });
}

export async function getPrecioPublicacion(): Promise<number> {
  const config = await db.configApp.upsert({
    where: { id: 1 },
    create: { id: 1, comisionTipo: "FIJO", comisionValor: 100, precioPublicacion: 500 },
    update: {},
    select: { precioPublicacion: true },
  });
  return config.precioPublicacion;
}

type ComisionConfig = {
  comisionTipo: string;
  comisionValor: number;
  comisionSinPresupuesto: number;
};

/**
 * Comisión por camión. En PORCENTAJE, `comisionValor` es una fracción (0.08 =
 * 8%) y sin presupuesto no hay sobre qué aplicarla: ahí se cobra el monto fijo
 * `comisionSinPresupuesto`. Antes se devolvía `comisionValor` tal cual, o sea
 * $0,08.
 */
export function calcularComision(config: ComisionConfig, presupuesto: number | null): number {
  if (config.comisionTipo === "PORCENTAJE") {
    return presupuesto !== null
      ? Math.round(presupuesto * config.comisionValor * 100) / 100
      : config.comisionSinPresupuesto;
  }
  return config.comisionValor;
}

/**
 * Lo que paga un transportista por su postulación: la comisión es por camión,
 * así que el que cubre varios camiones de la convocatoria paga una por cada uno.
 */
export function calcularComisionPostulacion(
  config: ComisionConfig,
  presupuesto: number | null,
  camionesCubiertos: number,
): number {
  return Math.round(calcularComision(config, presupuesto) * camionesCubiertos * 100) / 100;
}

export function DEADLINE_HORAS() {
  return 2;
}
