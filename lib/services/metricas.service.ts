import { db } from "@/lib/db";
import {
  SQL_EMBUDO_CANAL,
  SQL_LANDINGS,
  SQL_REGISTROS_DIA,
  SQL_TOTALES,
  type FilaEmbudo,
  type FilaLanding,
  type FilaRegistroDia,
  type Totales,
} from "@/lib/metricas-sql";

export type Metricas = {
  desde: Date;
  hasta: Date;
  totales: Totales;
  totalesAnterior: Totales;
  embudo: FilaEmbudo[];
  landings: FilaLanding[];
  registrosPorDia: FilaRegistroDia[];
};

/**
 * Embudo de adquisición entre `desde` y `hasta` (excluido), comparado con el
 * período anterior de igual duración. Las consultas son strings fijos de
 * lib/metricas-sql.ts y las fechas van como parámetros: no hay interpolación de
 * datos del usuario.
 */
export async function obtenerMetricas(desde: Date, hasta: Date): Promise<Metricas> {
  const desdeAnterior = new Date(desde.getTime() - (hasta.getTime() - desde.getTime()));

  const [totales, totalesAnterior, embudo, landings, registrosPorDia] = await Promise.all([
    db.$queryRawUnsafe<Totales[]>(SQL_TOTALES, desde, hasta),
    db.$queryRawUnsafe<Totales[]>(SQL_TOTALES, desdeAnterior, desde),
    db.$queryRawUnsafe<FilaEmbudo[]>(SQL_EMBUDO_CANAL, desde, hasta),
    db.$queryRawUnsafe<FilaLanding[]>(SQL_LANDINGS, desde, hasta),
    db.$queryRawUnsafe<FilaRegistroDia[]>(SQL_REGISTROS_DIA, desde, hasta),
  ]);

  return {
    desde,
    hasta,
    totales: totales[0],
    totalesAnterior: totalesAnterior[0],
    embudo,
    landings,
    registrosPorDia,
  };
}
