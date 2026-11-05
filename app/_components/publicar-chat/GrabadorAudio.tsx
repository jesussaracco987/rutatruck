"use client";

import { useEffect, useRef, useState } from "react";

/** Corta solo: un pedido de flete se cuenta en menos de un minuto y el archivo queda chico. */
const MAX_SEGUNDOS = 60;

/** El primero que soporte el navegador. Chrome graba webm; Safari (iPhone), mp4. */
const FORMATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

type Estado = "inactivo" | "grabando" | "transcribiendo";

function MicIcono() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/**
 * Botón de micrófono del chat. Graba, manda el audio a transcribir y entrega el
 * texto para que la persona lo revise antes de enviarlo: un nombre de ciudad mal
 * entendido se corrige ahí y no llega al asistente.
 */
export default function GrabadorAudio({
  deshabilitado,
  onTexto,
  onError,
  onEstado,
}: {
  deshabilitado: boolean;
  onTexto: (texto: string) => void;
  onError: (mensaje: string | null) => void;
  onEstado?: (ocupado: boolean) => void;
}) {
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [segundos, setSegundos] = useState(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const cancelado = useRef(false);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  const cambiarEstado = (nuevo: Estado) => {
    setEstado(nuevo);
    onEstado?.(nuevo !== "inactivo");
  };

  function liberar() {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    // Apaga el micrófono: sin esto el indicador de grabación del celular queda prendido.
    grabador.current?.stream.getTracks().forEach((t) => t.stop());
    grabador.current = null;
  }

  // Si se sale del chat grabando, el micrófono no queda abierto.
  useEffect(() => () => {
    cancelado.current = true;
    if (grabador.current?.state === "recording") grabador.current.stop();
    liberar();
  }, []);

  async function transcribir(audio: Blob) {
    cambiarEstado("transcribiendo");
    try {
      const datos = new FormData();
      datos.append("audio", audio);
      const res = await fetch("/api/publicar-chat/transcribir", { method: "POST", body: datos });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos pasar el audio a texto");
      onTexto(data.texto);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No pudimos pasar el audio a texto");
    } finally {
      cambiarEstado("inactivo");
    }
  }

  async function empezar() {
    onError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Tu navegador no permite grabar audio. Escribí el pedido.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Sin permiso para usar el micrófono. Habilitalo en tu navegador o escribí el pedido.");
      return;
    }

    const mimeType = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
    const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    grabador.current = rec;
    partes.current = [];
    cancelado.current = false;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) partes.current.push(e.data);
    };
    rec.onstop = () => {
      const tipo = rec.mimeType || mimeType || "audio/webm";
      liberar();
      if (cancelado.current) {
        cambiarEstado("inactivo");
        return;
      }
      void transcribir(new Blob(partes.current, { type: tipo }));
    };

    rec.start();
    const inicio = Date.now();
    setSegundos(0);
    cambiarEstado("grabando");
    reloj.current = setInterval(() => {
      const transcurridos = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(Math.min(transcurridos, MAX_SEGUNDOS));
      if (transcurridos >= MAX_SEGUNDOS && rec.state === "recording") rec.stop();
    }, 250);
  }

  function terminar(cancelar: boolean) {
    cancelado.current = cancelar;
    if (grabador.current?.state === "recording") grabador.current.stop();
  }

  if (estado === "grabando") {
    const tiempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
    return (
      <div className="flex flex-1 items-center gap-2" role="status">
        <span className="h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
        <span className="flex-1 whitespace-nowrap text-sm font-semibold text-gray-700">
          Grabando {tiempo}
          <span className="font-normal text-gray-400"> / 1:00</span>
        </span>
        <button
          type="button"
          onClick={() => terminar(true)}
          className="rounded-xl px-3 py-3 text-sm font-semibold text-gray-600 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => terminar(false)}
          className="rounded-xl px-5 py-3 text-sm font-bold text-white cursor-pointer"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Listo
        </button>
      </div>
    );
  }

  if (estado === "transcribiendo") {
    return (
      <p className="flex flex-1 items-center py-3 text-sm text-gray-500" role="status">
        Pasando el audio a texto…
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={empezar}
      disabled={deshabilitado}
      aria-label="Grabar un audio"
      title="Grabar un audio"
      className="flex flex-shrink-0 items-center justify-center rounded-xl border px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      style={{ borderColor: "#D1D5DB" }}
    >
      <MicIcono />
    </button>
  );
}
