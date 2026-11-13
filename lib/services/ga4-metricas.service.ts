import { ga4Configurado, runReport } from "@/lib/ga4";

/** Eventos propios (ver app/_components/Analytics.tsx) que se muestran por canal. */
export const EVENTOS_GA4 = [
  "registro_iniciado",
  "sign_up",
  "publicacion_iniciada",
  "descarga_app",
  "contacto_whatsapp",
] as const;
export type EventoGa4 = (typeof EVENTOS_GA4)[number];

export type ResumenGa4 = {
  usuarios: number;
  usuariosNuevos: number;
  sesiones: number;
  tasaInteraccion: number;
};

export type CanalGa4 = {
  fuente: string;
  medio: string;
  campania: string;
  sesiones: number;
  usuariosNuevos: number;
  eventos: Record<EventoGa4, number>;
};

export type MetricasGa4 =
  | { estado: "sin-configurar" }
  | { estado: "error"; mensaje: string }
  | { estado: "ok"; resumen: ResumenGa4; resumenAnterior: ResumenGa4; canales: CanalGa4[] };

const DIMENSIONES_CANAL = [
  { name: "sessionSource" },
  { name: "sessionMedium" },
  { name: "sessionCampaignName" },
];

async function resumen(desde: string, hasta: string): Promise<ResumenGa4> {
  const [fila] = await runReport({
    dateRanges: [{ startDate: desde, endDate: hasta }],
    metrics: [{ name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" }, { name: "engagementRate" }],
  });
  return {
    usuarios: Number(fila?.activeUsers ?? 0),
    usuariosNuevos: Number(fila?.newUsers ?? 0),
    sesiones: Number(fila?.sessions ?? 0),
    tasaInteraccion: Number(fila?.engagementRate ?? 0),
  };
}

/**
 * Datos de GA4 entre dos días (YYYY-MM-DD, ambos incluidos, en la zona horaria
 * de la propiedad) y el período anterior de igual duración. Nunca tira: si GA4
 * falla, la página de métricas muestra el error y sigue con los datos de la base.
 */
export async function obtenerMetricasGa4(
  desde: string,
  hasta: string,
  desdeAnterior: string,
  hastaAnterior: string,
): Promise<MetricasGa4> {
  if (!ga4Configurado()) return { estado: "sin-configurar" };

  try {
    const rango = [{ startDate: desde, endDate: hasta }];
    const [actual, anterior, sesionesPorCanal, eventosPorCanal] = await Promise.all([
      resumen(desde, hasta),
      resumen(desdeAnterior, hastaAnterior),
      runReport({
        dateRanges: rango,
        dimensions: DIMENSIONES_CANAL,
        metrics: [{ name: "sessions" }, { name: "newUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
      }),
      runReport({
        dateRanges: rango,
        dimensions: [...DIMENSIONES_CANAL, { name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", inListFilter: { values: [...EVENTOS_GA4] } },
        },
        limit: 500,
      }),
    ]);

    const clave = (f: Record<string, string | number>) =>
      `${f.sessionSource}|${f.sessionMedium}|${f.sessionCampaignName}`;
    const vacio = () => Object.fromEntries(EVENTOS_GA4.map((e) => [e, 0])) as Record<EventoGa4, number>;

    const canales = new Map<string, CanalGa4>();
    for (const f of sesionesPorCanal) {
      canales.set(clave(f), {
        fuente: String(f.sessionSource),
        medio: String(f.sessionMedium),
        campania: String(f.sessionCampaignName),
        sesiones: Number(f.sessions),
        usuariosNuevos: Number(f.newUsers),
        eventos: vacio(),
      });
    }
    for (const f of eventosPorCanal) {
      let canal = canales.get(clave(f));
      if (!canal) {
        // Canal fuera del top de sesiones pero con eventos: se agrega igual.
        canal = {
          fuente: String(f.sessionSource),
          medio: String(f.sessionMedium),
          campania: String(f.sessionCampaignName),
          sesiones: 0,
          usuariosNuevos: 0,
          eventos: vacio(),
        };
        canales.set(clave(f), canal);
      }
      canal.eventos[f.eventName as EventoGa4] += Number(f.eventCount);
    }

    return { estado: "ok", resumen: actual, resumenAnterior: anterior, canales: [...canales.values()] };
  } catch (e) {
    console.error("[metricas] GA4", e);
    return { estado: "error", mensaje: e instanceof Error ? e.message.slice(0, 300) : "Error desconocido" };
  }
}
