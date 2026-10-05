/**
 * Cookie puente entre el servidor y el navegador para los eventos de medición.
 * Separada de lib/analytics.ts porque también la importa un Client Component,
 * y ese archivo usa next/headers.
 */

export const EVENTOS_COOKIE = "cc_eventos";

export type EventoAnalytics = {
  nombre: string;
  params?: Record<string, string | number>;
};
