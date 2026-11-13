/**
 * Consultas del embudo de adquisición. Las usan la página /admin/metricas
 * (lib/services/metricas.service.ts) y scripts/metricas/embudo.ts. Todas toman
 * $1 = desde y $2 = hasta (excluido) y solo leen.
 *
 * El canal es el que guardó lib/origen.ts al registrarse: utm_source si lo
 * hubo, si no el sitio que lo mandó, si no "(directo)".
 */

const CANAL = `COALESCE(u."origenFuente", 'ref:' || u."origenReferrer", '(directo)')`;
const PUBLICADA = `c.estado <> 'PENDIENTE_PAGO'`;
const EN_PERIODO = `u."createdAt" >= $1 AND u."createdAt" < $2 AND u.role <> 'ADMIN'`;

/**
 * Usuarios registrados en el período, por canal, con lo que hicieron después.
 * La actividad se cuenta hasta hoy, no solo dentro del período: quien se
 * registró el último día y publicó a la semana suma para su canal.
 */
export const SQL_EMBUDO_CANAL = `
WITH cohorte AS (
  SELECT u.id, u.role, ${CANAL} AS canal,
         COALESCE(u."origenMedio", '-') AS medio,
         COALESCE(u."origenCampania", '-') AS campania
  FROM "User" u
  WHERE ${EN_PERIODO}
),
actividad AS (
  SELECT co.*,
    EXISTS (SELECT 1 FROM "Carga" c WHERE c."empresaId" = co.id AND ${PUBLICADA}) AS publico,
    EXISTS (SELECT 1 FROM "Postulacion" p WHERE p."transportistaId" = co.id) AS se_postulo,
    EXISTS (SELECT 1 FROM "Postulacion" p WHERE p."transportistaId" = co.id AND p."matchConfirmadoEn" IS NOT NULL)
      OR EXISTS (SELECT 1 FROM "Postulacion" p JOIN "Carga" c ON c.id = p."cargaId"
                 WHERE c."empresaId" = co.id AND p."matchConfirmadoEn" IS NOT NULL) AS hizo_match,
    EXISTS (SELECT 1 FROM "Carga" c WHERE c."finalizadaEn" IS NOT NULL
            AND (c."empresaId" = co.id OR c."transportistaAsignadoId" = co.id)) AS viaje_finalizado
  FROM cohorte co
)
SELECT canal, medio, campania,
  COUNT(*)::int AS registros,
  COUNT(*) FILTER (WHERE role IN ('EMPRESA', 'EMPRESA_TRANSPORTISTA'))::int AS dadores,
  COUNT(*) FILTER (WHERE role IN ('TRANSPORTISTA', 'TRANSPORTISTA_FLOTA', 'EMPRESA_TRANSPORTISTA'))::int AS transportistas,
  COUNT(*) FILTER (WHERE publico)::int AS publicaron,
  COUNT(*) FILTER (WHERE se_postulo)::int AS se_postularon,
  COUNT(*) FILTER (WHERE hizo_match)::int AS con_match,
  COUNT(*) FILTER (WHERE viaje_finalizado)::int AS con_viaje
FROM actividad
GROUP BY canal, medio, campania
ORDER BY registros DESC`;

export const SQL_LANDINGS = `
SELECT COALESCE(u."origenLanding", '-') AS landing, ${CANAL} AS canal, COUNT(*)::int AS registros
FROM "User" u
WHERE ${EN_PERIODO}
GROUP BY 1, 2 ORDER BY registros DESC LIMIT 15`;

/** Actividad total de la plataforma en el período, sin importar cuándo se registró cada uno. */
export const SQL_TOTALES = `
SELECT
  (SELECT COUNT(*) FROM "User" u WHERE ${EN_PERIODO})::int AS registros,
  (SELECT COUNT(*) FROM "Carga" c WHERE c."createdAt" >= $1 AND c."createdAt" < $2 AND ${PUBLICADA})::int AS cargas_publicadas,
  (SELECT COUNT(*) FROM "Carga" c WHERE c."createdAt" >= $1 AND c."createdAt" < $2 AND c.estado = 'PENDIENTE_PAGO')::int AS cargas_sin_pagar,
  (SELECT COUNT(*) FROM "Postulacion" p WHERE p."createdAt" >= $1 AND p."createdAt" < $2)::int AS postulaciones,
  (SELECT COUNT(*) FROM "Postulacion" p WHERE p."matchConfirmadoEn" >= $1 AND p."matchConfirmadoEn" < $2)::int AS matches,
  (SELECT COUNT(*) FROM "Carga" c WHERE c."finalizadaEn" >= $1 AND c."finalizadaEn" < $2)::int AS viajes_finalizados`;

/** Registros por día (hora argentina) y por canal, para ver la evolución. */
export const SQL_REGISTROS_DIA = `
SELECT to_char(u."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS dia,
       ${CANAL} AS canal, COUNT(*)::int AS registros
FROM "User" u
WHERE ${EN_PERIODO}
GROUP BY 1, 2 ORDER BY 1`;

export type FilaEmbudo = {
  canal: string;
  medio: string;
  campania: string;
  registros: number;
  dadores: number;
  transportistas: number;
  publicaron: number;
  se_postularon: number;
  con_match: number;
  con_viaje: number;
};

export type FilaLanding = { landing: string; canal: string; registros: number };

export type Totales = {
  registros: number;
  cargas_publicadas: number;
  cargas_sin_pagar: number;
  postulaciones: number;
  matches: number;
  viajes_finalizados: number;
};

export type FilaRegistroDia = { dia: string; canal: string; registros: number };
