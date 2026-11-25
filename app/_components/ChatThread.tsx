"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveStream } from "./useLiveStream";

export type Mensaje = {
  id: number;
  autorId: string;
  cuerpo: string;
  creadoEn: string;
  leidoEn: string | null;
};

interface Props {
  postulacionId: number;
  currentUserId: string;
  initialMensajes: Mensaje[];
  /**
   * Chat grupal (postulación grupal): nombre de cada participante por id, para
   * mostrar quién escribió cada mensaje. En un hilo de a dos no hace falta.
   */
  nombres?: Record<string, string>;
}

export default function ChatThread({ postulacionId, currentUserId, initialMensajes, nombres }: Props) {
  const esGrupal = nombres !== undefined && Object.keys(nombres).length > 2;
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMensajes);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  // Si el usuario subió a leer historia, un mensaje entrante no debe arrastrarlo
  // al fondo. Se mide antes de que el DOM crezca, de ahí el ref y no un cálculo
  // dentro del efecto.
  const cercaDelFinalRef = useRef(true);
  const forzarScrollRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastIdRef = useRef(
    initialMensajes.length > 0 ? initialMensajes[initialMensajes.length - 1].id : 0,
  );
  const escribiendoTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ultimoTypingEnviadoRef = useRef(0);

  // `initialMensajes` cambia de referencia cada vez que el Server Component
  // vuelve a correr (p.ej. por el router.refresh() de abajo). Se sincroniza
  // acá, en el cuerpo del render, en vez de en un efecto, siguiendo el patrón
  // de React para "ajustar estado cuando cambia una prop".
  const [syncedInitialMensajes, setSyncedInitialMensajes] = useState(initialMensajes);
  if (initialMensajes !== syncedInitialMensajes) {
    setSyncedInitialMensajes(initialMensajes);
    const ids = new Set(mensajes.map((m) => m.id));
    const nuevos = initialMensajes.filter((m) => !ids.has(m.id));
    if (nuevos.length > 0) {
      setMensajes([...mensajes, ...nuevos].sort((a, b) => a.id - b.id));
    }
  }

  function mergeMensajes(nuevos: Mensaje[]) {
    if (nuevos.length === 0) return;
    setMensajes((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...nuevos.filter((m) => !ids.has(m.id))];
      merged.sort((a, b) => a.id - b.id);
      return merged;
    });
  }

  // `mensajes` se mantiene ordenado ascendente por id, así que el último
  // elemento siempre es el más nuevo — se usa como cursor de "after" al
  // (re)conectar el EventSource, se actualiza acá (no durante el render).
  useEffect(() => {
    if (mensajes.length === 0) return;
    const maxId = mensajes[mensajes.length - 1].id;
    if (maxId > lastIdRef.current) lastIdRef.current = maxId;
  }, [mensajes]);

  // Next reusa el RSC payload cacheado en navegación back/forward sin volver
  // a correr el Server Component — por eso el último mensaje enviado podía
  // no aparecer al volver del listado. Forzamos un refresh al entrar para
  // que `initialMensajes`/`marcarLeidos` se recalculen siempre con datos frescos.
  useEffect(() => {
    router.refresh();
  }, [postulacionId, router]);

  useLiveStream(
    postulacionId,
    // Se reevalúa en cada reconexión: al volver del segundo plano pide solo lo
    // posterior al último mensaje que ya tiene.
    () => `/api/conversaciones/${postulacionId}/stream?after=${lastIdRef.current}`,
    (es) => {
      es.addEventListener("mensajes", (e: MessageEvent) => {
        mergeMensajes(JSON.parse(e.data) as Mensaje[]);
      });

      es.addEventListener("typing", (e: MessageEvent) => {
        const { autorId } = JSON.parse(e.data) as { autorId: string };
        if (autorId === currentUserId) return;
        setOtroEscribiendo(true);
        clearTimeout(escribiendoTimeoutRef.current);
        escribiendoTimeoutRef.current = setTimeout(() => setOtroEscribiendo(false), 3500);
      });

      es.addEventListener("leido", (e: MessageEvent) => {
        const { lectorId, en } = JSON.parse(e.data) as { lectorId: string; en: string };
        if (lectorId === currentUserId) return;
        setMensajes((prev) =>
          prev.map((m) => (m.autorId === currentUserId && !m.leidoEn ? { ...m, leidoEn: en } : m)),
        );
      });
    },
  );

  useEffect(() => {
    return () => clearTimeout(escribiendoTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!cercaDelFinalRef.current && !forzarScrollRef.current) return;
    forzarScrollRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  function handleScrollLista(e: React.UIEvent<HTMLDivElement>) {
    const c = e.currentTarget;
    cercaDelFinalRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
  }

  // El textarea arranca en una línea y crece con el contenido hasta un tope,
  // en vez del <input> de una sola línea que tenía antes: coordinar un viaje
  // suele necesitar más de un renglón.
  function ajustarAlto() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function handleTextoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value);
    ajustarAlto();
    const ahora = Date.now();
    if (ahora - ultimoTypingEnviadoRef.current < 2000) return;
    ultimoTypingEnviadoRef.current = ahora;
    fetch(`/api/conversaciones/${postulacionId}/typing`, { method: "POST" }).catch(() => {});
  }

  // Enter manda, Shift+Enter hace salto de línea.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(e);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (!cuerpo) return;
    // Mandar siempre baja al final, aunque estuvieras leyendo más arriba.
    forzarScrollRef.current = true;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/conversaciones/${postulacionId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuerpo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      mergeMensajes([data.mensaje as Mensaje]);
      setTexto("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={listaRef} onScroll={handleScrollLista} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {mensajes.length === 0 && (
          <p className="text-center text-sm py-10" style={{ color: "#9CA3AF" }}>
            Todavía no hay mensajes. Escribí el primero para coordinar el viaje.
          </p>
        )}
        {mensajes.map((m) => {
          const esMio = m.autorId === currentUserId;
          return (
            <div key={m.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                style={
                  esMio
                    ? { backgroundColor: "var(--primary)", color: "#FFFFFF" }
                    : { backgroundColor: "#FFFFFF", color: "#111827", border: "1px solid #E2E8E8" }
                }
              >
                {esGrupal && !esMio && (
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--primary)" }}>
                    {nombres[m.autorId] ?? "Ex participante"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.cuerpo}</p>
                <p className="text-[10px] mt-1 flex items-center justify-end gap-1" style={{ opacity: 0.7 }}>
                  {new Date(m.creadoEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  {esMio && (
                    <span style={{ color: m.leidoEn ? "#7DD3FC" : "inherit" }}>
                      {m.leidoEn ? "✓✓" : "✓"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        {otroEscribiendo && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-2.5 text-sm italic"
              style={{ backgroundColor: "#FFFFFF", color: "#6B7280", border: "1px solid #E2E8E8" }}
            >
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-1 text-xs flex-shrink-0" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className="flex-shrink-0 border-t px-4 py-3 flex items-end gap-2"
        style={{ borderColor: "#E2E8E8", backgroundColor: "#FFFFFF" }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={texto}
          onChange={handleTextoChange}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje..."
          maxLength={2000}
          className="flex-1 resize-none rounded-2xl border px-4 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2"
          style={{ borderColor: "#E2E8E8", color: "#111827", maxHeight: 120 }}
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "#FFFFFF" }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
