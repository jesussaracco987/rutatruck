"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { enviarEvento } from "@/app/_components/Analytics";
import LocationPicker, { type Location } from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationPicker";
import { buscarLocalidadExacta } from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationAutocomplete";
import {
  BORRADOR_VACIO,
  DRAFT_FORMULARIO_KEY,
  MAX_LARGO_MENSAJE,
  borradorAFormulario,
  camposFaltantes,
  hoyArgentina,
  type BorradorCarga,
  type MensajeChat,
} from "@/lib/chat-carga";
import ResumenCarga from "./ResumenCarga";
import GrabadorAudio from "./GrabadorAudio";

const ESTADO_KEY_BASE = "clickcargo-chat-carga";

const ATAJOS = [
  { label: "Pallets", texto: "Necesito mover pallets de " },
  { label: "Mudanza", texto: "Necesito hacer una mudanza de " },
  { label: "Materiales de obra", texto: "Necesito mover materiales de obra de " },
  { label: "Maquinaria", texto: "Necesito trasladar una máquina de " },
  { label: "Cereal", texto: "Necesito mover cereal de " },
];

type Paso = "chat" | "resumen" | "origen" | "destino" | "contacto" | "codigo";

const inputClass =
  "w-full rounded-xl border px-3.5 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent";
const inputStyle = { backgroundColor: "#F9FAFB", borderColor: "#E2E8E8" };
const botonPrimario =
  "flex-1 rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer";
const botonSecundario = "rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 cursor-pointer";

/** Centro de la ciudad escrita en el chat, para abrir el mapa ahí y no en todo el país. */
async function centroDe(lugar: string | null): Promise<Location | null> {
  if (!lugar) return null;
  // Georef la tiene como provincia, no como localidad, y es de los destinos más pedidos.
  if (/^(caba|capital federal|ciudad de buenos aires|ciudad aut[oó]noma|buenos aires)\b/i.test(lugar.trim())) {
    return { lat: -34.6037, lng: -58.3816, name: lugar };
  }
  const consulta = buscarLocalidadExacta(lugar).catch(() => null);
  const sinRespuesta = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
  const localidad = await Promise.race([consulta, sinRespuesta]);
  return localidad ? { lat: localidad.lat, lng: localidad.lng, name: localidad.label } : null;
}

/** UUID v4. `crypto.randomUUID` solo existe con https o localhost; probando por IP local no. */
function nuevoId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** El nombre de un punto marcado reemplaza al del chat, salvo que la dirección no se haya resuelto. */
function nombreDe(punto: Location | null, escrito: string | null): string | null {
  if (!punto || /^-?\d/.test(punto.name)) return escrito;
  // "Rosario, Provincia de Santa Fe, Argentina" queda como en el resto de la app: "Rosario, Santa Fe".
  return punto.name.replace(/, Argentina$/, "").replace(/\bProvincia de /g, "");
}

export default function ChatPublicar({
  freeTier,
  precioPublicacion,
  cuenta,
  hrefFormulario = "/publicar",
}: {
  freeTier: boolean;
  precioPublicacion: number;
  /**
   * Empresa con sesión iniciada: el contacto sale del perfil y publica directo,
   * sin código por mail. Sin esto es el chat de la home, que crea la cuenta.
   */
  cuenta?: { nombre: string; telefono: string; email: string };
  hrefFormulario?: string;
}) {
  const ESTADO_KEY = cuenta ? `${ESTADO_KEY_BASE}-panel` : ESTADO_KEY_BASE;
  const [paso, setPaso] = useState<Paso>("chat");
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [borrador, setBorrador] = useState<BorradorCarga>(BORRADOR_VACIO);
  const [texto, setTexto] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinAsistente, setSinAsistente] = useState(false);

  const [origenPunto, setOrigenPunto] = useState<Location | null>(null);
  const [destinoPunto, setDestinoPunto] = useState<Location | null>(null);
  const [centroMapa, setCentroMapa] = useState<Location | null>(null);

  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [telefono, setTelefono] = useState(cuenta?.telefono ?? "");
  const [email, setEmail] = useState(cuenta?.email ?? "");
  const [grabando, setGrabando] = useState(false);
  /** Texto tal como quedó después del último audio: si se envía distinto, la persona lo corrigió. */
  const [dictado, setDictado] = useState<string | null>(null);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [codigo, setCodigo] = useState("");

  const entradaRef = useRef<HTMLTextAreaElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const restaurado = useRef(false);
  const iniciado = useRef(false);

  // Un refresh o volver de otra pestaña (términos, mail del código) no pierde lo conversado.
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(ESTADO_KEY) ?? "null");
      if (guardado?.mensajes?.length) {
        // localStorage no existe en el servidor: leerlo al inicializar el estado rompería la hidratación.
        /* eslint-disable react-hooks/set-state-in-effect */
        setMensajes(guardado.mensajes);
        setBorrador({ ...BORRADOR_VACIO, ...guardado.borrador });
        setPaso(guardado.resumen ? "resumen" : "chat");
        setConversacionId(typeof guardado.conversacionId === "string" ? guardado.conversacionId : null);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {}
  }, [ESTADO_KEY]);

  useEffect(() => {
    if (!restaurado.current) return;
    try {
      if (mensajes.length === 0) localStorage.removeItem(ESTADO_KEY);
      else localStorage.setItem(ESTADO_KEY, JSON.stringify({ mensajes, borrador, resumen: paso !== "chat", conversacionId }));
    } catch {}
  }, [mensajes, borrador, paso, conversacionId, ESTADO_KEY]);

  /** Métrica de avance: no frena el flujo ni muestra errores. */
  function seguimiento(pasoAlcanzado: "mapa" | "contacto", conBorrador?: BorradorCarga) {
    if (!conversacionId) return;
    void fetch("/api/publicar-chat/seguimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversacionId, paso: pasoAlcanzado, borrador: conBorrador }),
      keepalive: true,
    }).catch(() => {});
  }

  // Después de los dos anteriores: en el primer render no hay nada que guardar.
  useEffect(() => {
    restaurado.current = true;
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mensajes, pendiente]);

  /** Lleva lo conversado al formulario de `/publicar`, que restaura su borrador solo. */
  function guardarParaFormulario() {
    const puntos = { origenPunto, destinoPunto };
    try {
      localStorage.setItem(
        DRAFT_FORMULARIO_KEY,
        JSON.stringify(borradorAFormulario(borrador, puntos, { nombre, telefono, email })),
      );
    } catch {}
  }

  function usarAtajo(textoAtajo: string) {
    setTexto(textoAtajo);
    entradaRef.current?.focus();
  }

  async function enviarMensaje(e?: React.FormEvent) {
    e?.preventDefault();
    const contenido = texto.trim();
    if (!contenido || pendiente) return;

    if (!iniciado.current) {
      iniciado.current = true;
      enviarEvento("publicacion_iniciada", { via: "chat" });
    }
    const id = conversacionId ?? nuevoId();
    if (!conversacionId) setConversacionId(id);

    const enviado: MensajeChat = { rol: "usuario", texto: contenido, ...(dictado ? { dictado } : {}) };
    const conversacion: MensajeChat[] = [...mensajes, enviado];
    setMensajes(conversacion);
    setTexto("");
    setDictado(null);
    setError(null);
    setPendiente(true);

    try {
      const res = await fetch("/api/publicar-chat/mensaje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: conversacion, borrador, conversacionId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSinAsistente(!!data.fallback);
        throw new Error(data.error ?? "No pudimos procesar el mensaje");
      }
      setBorrador(data.borrador);
      if (data.listo) setPaso("resumen");
      else setMensajes([...conversacion, { rol: "asistente", texto: data.pregunta }]);
    } catch (err) {
      // El mensaje vuelve a la caja para reintentar sin escribirlo de nuevo.
      setMensajes(mensajes);
      setTexto(contenido);
      setDictado(enviado.dictado ?? null);
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setPendiente(false);
    }
  }

  async function irAlMapa(destino: "origen" | "destino") {
    setPendiente(true);
    setCentroMapa(await centroDe(destino === "origen" ? borrador.origen : borrador.destino));
    setPendiente(false);
    setPaso(destino);
  }

  async function pedirCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setPendiente(true);
    try {
      const res = await fetch("/api/publicar-chat/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos enviar el código");
      setCodigo("");
      setPaso("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setPendiente(false);
    }
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendiente(true);
    try {
      const res = await fetch("/api/publicar-chat/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrador: {
            ...borrador,
            origen: nombreDe(origenPunto, borrador.origen),
            destino: nombreDe(destinoPunto, borrador.destino),
          },
          origenPunto,
          destinoPunto,
          nombre,
          telefono,
          email,
          codigo,
          aceptaTerminos,
          conversacionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // La cuenta quedó creada y con sesión: se reintenta desde el panel con lo ya cargado.
        if (data.cuentaCreada) {
          guardarParaFormulario();
          window.location.href = "/empresa/cargas/nueva?modo=formulario";
          return;
        }
        throw new Error(data.error ?? "No pudimos publicar la carga");
      }
      terminar(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPendiente(false);
    }
  }

  /** Carga completa: la sesión (nueva o no) tiene que llegar a todo el layout. */
  function terminar(data: { cargaId?: string; url?: string }) {
    try {
      localStorage.removeItem(ESTADO_KEY);
    } catch {}
    window.location.href = data.cargaId ? `/empresa/cargas/${data.cargaId}` : (data.url ?? "/empresa/cargas");
  }

  /** Empresa con sesión: publica por el mismo endpoint que el formulario del panel. */
  async function publicarConCuenta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendiente(true);
    try {
      const datos = borradorAFormulario(
        {
          ...borrador,
          origen: nombreDe(origenPunto, borrador.origen),
          destino: nombreDe(destinoPunto, borrador.destino),
        },
        { origenPunto, destinoPunto },
        { nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() },
      );
      const res = await fetch("/api/cargas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, conversacionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos publicar la carga");
      terminar(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPendiente(false);
    }
  }

  const errorVisible = error && (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {error}
    </p>
  );

  const paraFormulario = (
    <Link href={hrefFormulario} onClick={guardarParaFormulario} className="font-semibold underline underline-offset-2">
      completá el formulario
    </Link>
  );

  return (
    <section aria-label="Publicar una carga" className="w-full rounded-2xl bg-white p-4 text-gray-900 shadow-xl sm:p-5">
      {paso === "chat" && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-black leading-tight">¿Qué necesitás mover?</h2>
            <p className="mt-1 text-sm text-gray-500">Contalo con tus palabras y armamos la carga por vos.</p>
          </div>

          {mensajes.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {ATAJOS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => usarAtajo(a.texto)}
                  className="rounded-full border px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: "#D1D5DB" }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto" aria-live="polite">
              {mensajes.map((m, i) => (
                <p
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.rol === "usuario" ? "self-end text-white" : "self-start bg-gray-100 text-gray-800"
                  }`}
                  style={m.rol === "usuario" ? { backgroundColor: "var(--primary)" } : undefined}
                >
                  {m.texto}
                </p>
              ))}
              {pendiente && <p className="self-start rounded-2xl bg-gray-100 px-3.5 py-2 text-sm text-gray-500">Escribiendo…</p>}
              <div ref={finRef} />
            </div>
          )}

          {errorVisible}
          {sinAsistente ? (
            <p className="text-sm text-gray-600">
              Mientras tanto, {paraFormulario} y publicá igual.
            </p>
          ) : (
            <form onSubmit={enviarMensaje} className="flex flex-col gap-2">
              <label htmlFor="pedido-carga" className="sr-only">
                Tu pedido
              </label>
              <textarea
                id="pedido-carga"
                ref={entradaRef}
                rows={2}
                value={texto}
                maxLength={MAX_LARGO_MENSAJE}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviarMensaje();
                  }
                }}
                className={`${inputClass} resize-none`}
                style={inputStyle}
                placeholder="Ej: 20 pallets de Rosario a Córdoba el jueves"
              />
              <div className="flex gap-2">
                <GrabadorAudio
                  deshabilitado={pendiente}
                  onEstado={setGrabando}
                  onError={setError}
                  onTexto={(transcripto) => {
                    // Se suma a lo ya escrito y queda en la caja para revisarlo antes de enviar.
                    const nuevo = `${texto.trim()} ${transcripto}`.trim().slice(0, MAX_LARGO_MENSAJE);
                    setTexto(nuevo);
                    setDictado(nuevo);
                    entradaRef.current?.focus();
                  }}
                />
                {!grabando && (
                  <button
                    type="submit"
                    disabled={pendiente || !texto.trim()}
                    className={botonPrimario}
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {pendiente ? "Leyendo…" : "Enviar"}
                  </button>
                )}
              </div>
            </form>
          )}
          {!sinAsistente && (
            <p className="text-center text-xs text-gray-500">
              Un asistente con IA lee lo que escribís o grabás. ¿Preferís el{" "}
              <Link href={hrefFormulario} onClick={guardarParaFormulario} className="font-semibold underline underline-offset-2">
                formulario
              </Link>
              ?
            </p>
          )}
        </div>
      )}

      {paso === "resumen" && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-black">Así verá tu carga el transportista</h2>
            <p className="mt-1 text-sm text-gray-500">Tocá cualquier dato para corregirlo.</p>
          </div>
          <ResumenCarga borrador={borrador} onChange={setBorrador} hoy={hoyArgentina()} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMensajes([]);
                setBorrador(BORRADOR_VACIO);
                setConversacionId(null);
                setPaso("chat");
              }}
              className={botonSecundario}
            >
              Empezar de nuevo
            </button>
            <button
              type="button"
              disabled={pendiente || camposFaltantes(borrador).length > 0}
              onClick={() => {
                seguimiento("mapa", borrador);
                void irAlMapa("origen");
              }}
              className={botonPrimario}
              style={{ backgroundColor: "var(--primary)" }}
            >
              Marcar en el mapa
            </button>
          </div>
        </div>
      )}

      {(paso === "origen" || paso === "destino") && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-black">{paso === "origen" ? "¿Dónde se carga?" : "¿Dónde se descarga?"}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Marcá el punto exacto en {paso === "origen" ? borrador.origen : borrador.destino}.
            </p>
          </div>
          <LocationPicker
            key={paso}
            value={paso === "origen" ? origenPunto : destinoPunto}
            onChange={paso === "origen" ? setOrigenPunto : setDestinoPunto}
            centroInicial={centroMapa}
            mapaFijo
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (paso === "origen" ? setPaso("resumen") : irAlMapa("origen"))}
              className={botonSecundario}
            >
              Volver
            </button>
            <button
              type="button"
              disabled={pendiente || !(paso === "origen" ? origenPunto : destinoPunto)}
              onClick={() => {
                if (paso === "origen") return void irAlMapa("destino");
                seguimiento("contacto");
                setPaso("contacto");
              }}
              className={botonPrimario}
              style={{ backgroundColor: "var(--primary)" }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {paso === "contacto" && cuenta && (
        <form onSubmit={publicarConCuenta} className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-black">¿A quién contactan?</h2>
            <p className="mt-1 text-sm text-gray-500">Lo ve el transportista que tome la carga. Sale de tu perfil.</p>
          </div>
          <input
            aria-label="Nombre de contacto"
            type="text"
            required
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Nombre de contacto"
          />
          <input
            aria-label="Teléfono de contacto"
            type="tel"
            required
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Teléfono de contacto"
          />
          <input
            aria-label="Email de contacto"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Email de contacto"
          />
          {!freeTier && (
            <p className="text-sm text-gray-600">
              Después vas a MercadoPago para abonar la publicación de{" "}
              <strong>${precioPublicacion.toLocaleString("es-AR")}</strong>.
            </p>
          )}
          {errorVisible}
          <div className="flex gap-2">
            <button type="button" onClick={() => irAlMapa("destino")} className={botonSecundario}>
              Volver
            </button>
            <button type="submit" disabled={pendiente} className={botonPrimario} style={{ backgroundColor: "var(--primary)" }}>
              {pendiente ? "Publicando…" : freeTier ? "Publicar carga" : "Ir al pago"}
            </button>
          </div>
        </form>
      )}

      {paso === "contacto" && !cuenta && (
        <form onSubmit={pedirCodigo} className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-black">Último paso</h2>
            <p className="mt-1 text-sm text-gray-500">
              Con estos datos creamos tu cuenta o, si ya tenés, entrás a la tuya.
            </p>
          </div>
          <input
            aria-label="Teléfono"
            type="tel"
            required
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Teléfono"
          />
          <input
            aria-label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Email"
          />
          <input
            aria-label="Nombre o empresa (opcional)"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Nombre o empresa (opcional)"
          />
          {/* Links en pestaña nueva: navegar en la misma perdería lo ya cargado. */}
          <label className="flex items-start gap-2.5 text-sm text-gray-600">
            <input
              type="checkbox"
              required
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span>
              Acepto los{" "}
              <Link href="/terminos" target="_blank" className="font-semibold underline">
                Términos
              </Link>{" "}
              y la{" "}
              <Link href="/politica-de-privacidad" target="_blank" className="font-semibold underline">
                Política de Privacidad
              </Link>
            </span>
          </label>
          {!freeTier && (
            <p className="text-sm text-gray-600">
              Después vas a MercadoPago para abonar la publicación de{" "}
              <strong>${precioPublicacion.toLocaleString("es-AR")}</strong>.
            </p>
          )}
          {errorVisible}
          <div className="flex gap-2">
            <button type="button" onClick={() => irAlMapa("destino")} className={botonSecundario}>
              Volver
            </button>
            <button type="submit" disabled={pendiente} className={botonPrimario} style={{ backgroundColor: "var(--primary)" }}>
              {pendiente ? "Enviando…" : "Enviarme el código"}
            </button>
          </div>
        </form>
      )}

      {paso === "codigo" && (
        <form onSubmit={publicar} className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-black">Revisá tu email</h2>
            <p className="mt-1 text-sm text-gray-500">Te mandamos un código de 6 dígitos a {email}.</p>
          </div>
          <input
            aria-label="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} text-center text-2xl font-bold tracking-[0.4em]`}
            style={inputStyle}
          />
          {errorVisible}
          <button
            type="submit"
            disabled={pendiente || codigo.length !== 6}
            className={botonPrimario}
            style={{ backgroundColor: "var(--primary)" }}
          >
            {pendiente ? "Publicando…" : freeTier ? "Publicar carga" : "Ir al pago"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => setPaso("contacto")} className="font-semibold text-gray-600 cursor-pointer">
              Cambiar email
            </button>
            <button type="button" disabled={pendiente} onClick={() => pedirCodigo()} className="font-semibold text-gray-600 cursor-pointer">
              Reenviar código
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
