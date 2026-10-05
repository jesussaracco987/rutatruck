"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { EVENTOS_COOKIE, type EventoAnalytics } from "@/lib/analytics-cookie";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

// gtag.js espera el objeto `arguments` tal cual en dataLayer, no un array.
// Definida acá y no en un <script> inline para que los eventos se puedan
// encolar aunque la librería de Google todavía no haya terminado de cargar.
/* eslint-disable prefer-rest-params, @typescript-eslint/no-unused-vars */
function gtag(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}
/* eslint-enable prefer-rest-params, @typescript-eslint/no-unused-vars */

// Meta optimiza los anuncios contra sus eventos estándar, así que se usan donde
// hay uno que corresponde; el resto va como evento personalizado.
const EVENTOS_META: Record<string, { nombre: string; estandar: boolean }> = {
  sign_up: { nombre: "CompleteRegistration", estandar: true },
  postulacion_enviada: { nombre: "SubmitApplication", estandar: true },
  carga_publicada: { nombre: "CargaPublicada", estandar: false },
  viaje_concretado: { nombre: "ViajeConcretado", estandar: false },
};

let iniciado = false;

/** Envía los eventos que el servidor dejó anotados (ver lib/analytics.ts). */
function despacharEventos() {
  // El snippet del píxel se ejecuta después de hidratar: hasta que defina fbq
  // no se toca la cookie, para no perder los eventos de Meta.
  if (PIXEL_ID && !window.fbq) return;

  const prefijo = `${EVENTOS_COOKIE}=`;
  const cookie = document.cookie.split("; ").find((c) => c.startsWith(prefijo));
  if (!cookie) return;

  document.cookie = `${EVENTOS_COOKIE}=; Max-Age=0; path=/`;

  try {
    const eventos: EventoAnalytics[] = JSON.parse(decodeURIComponent(cookie.slice(prefijo.length)));
    for (const evento of eventos) {
      const params = evento.params ?? {};
      if (GA_ID) gtag("event", evento.nombre, params);

      const meta = EVENTOS_META[evento.nombre];
      if (PIXEL_ID && meta) {
        window.fbq?.(meta.estandar ? "track" : "trackCustom", meta.nombre, params);
      }
    }
  } catch {}
}

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_ID && !PIXEL_ID) return;

    if (GA_ID && !iniciado) {
      iniciado = true;
      gtag("js", new Date());
      gtag("config", GA_ID);
    }

    despacharEventos();
    // Varias acciones (postularse, confirmar un viaje) responden por fetch sin
    // cambiar de página, así que el cambio de ruta solo no alcanza.
    const id = setInterval(despacharEventos, 3000);
    return () => clearInterval(id);
  }, [pathname]);

  return (
    <>
      {GA_ID && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
      )}
      {PIXEL_ID && (
        // Código base del píxel tal como lo entrega Meta. Las vistas de página
        // al navegar dentro de la app las registra solo.
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
