"use client";

import { useState } from "react";
import { enviarEvento } from "@/app/_components/Analytics";

function IconoWhatsapp() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 01-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.39 9.39 0 01-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 012.76 6.67c0 5.2-4.23 9.42-9.44 9.42zm8.02-17.44A11.27 11.27 0 0012.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 005.77 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.31-8.01z" />
    </svg>
  );
}

/**
 * "Quiero sumarme": alta asistida para transportistas que no quieren pasar
 * por el registro. Deja nombre y WhatsApp, se guarda como solicitud y se abre
 * WhatsApp con sus datos escritos. La cuenta la crea un admin desde
 * /admin/solicitudes.
 */
export default function SumarmeTransportista({ variante = "boton" }: { variante?: "boton" | "link" }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listoSinWhatsapp, setListoSinWhatsapp] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPendiente(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/solicitud-transportista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      // Un error del servidor puede venir sin cuerpo: sin el catch, el usuario
      // veía "Unexpected end of JSON input" en vez de un mensaje entendible.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos enviar tus datos. Probá de nuevo en un rato.");
      // Se manda desde acá: la persona sale del sitio hacia WhatsApp en el
      // mismo instante, así que un evento anotado en el servidor no saldría.
      enviarEvento("lead_transportista");
      if (data.whatsapp) {
        window.location.href = data.whatsapp;
      } else {
        setListoSinWhatsapp(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tus datos");
    } finally {
      setPendiente(false);
    }
  }

  if (!abierto) {
    return variante === "link" ? (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-center text-xs font-semibold underline underline-offset-2 cursor-pointer"
        style={{ color: "#4ADE80" }}
      >
        ¿Preferís que te creemos la cuenta? Escribinos
      </button>
    ) : (
      // Con el verde y el ícono de WhatsApp se reconoce de un vistazo que
      // termina en una charla, que es lo que busca quien llega de un anuncio.
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm tracking-wide transition-opacity hover:opacity-90 active:opacity-80 cursor-pointer"
        style={{ backgroundColor: "#25D366", color: "#062E16" }}
      >
        <IconoWhatsapp />
        <span className="flex flex-col items-start leading-tight">
          Sumarme por WhatsApp
          <span className="text-xs font-medium" style={{ opacity: 0.8 }}>
            Te creamos la cuenta
          </span>
        </span>
      </button>
    );
  }

  if (listoSinWhatsapp) {
    return (
      <div className="rounded-2xl border p-5 text-sm" style={{ backgroundColor: "#0C1A1A", borderColor: "#1C3030", color: "#D1D5DB" }}>
        ¡Listo! Te escribimos por WhatsApp para crear tu cuenta.
      </div>
    );
  }

  const input = "w-full rounded-xl border px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]";
  const inputStyle = { backgroundColor: "#060F0F", borderColor: "#1C3030" };

  return (
    <form
      onSubmit={enviar}
      className="w-full rounded-2xl border p-5 flex flex-col gap-3 text-left"
      style={{ backgroundColor: "#0C1A1A", borderColor: "#1C3030" }}
    >
      <p className="font-bold text-white">Te creamos la cuenta</p>
      <p className="text-sm -mt-1" style={{ color: "#9CA3AF" }}>
        Dejanos tus datos y seguimos por WhatsApp. No hace falta completar nada más.
      </p>
      <input name="nombre" required maxLength={80} placeholder="Nombre y apellido" autoComplete="name" className={input} style={inputStyle} />
      <input name="telefono" required type="tel" maxLength={30} placeholder="WhatsApp (ej: 351 555-1234)" autoComplete="tel" className={input} style={inputStyle} />
      <input name="email" type="email" maxLength={120} placeholder="Email (opcional)" autoComplete="email" className={input} style={inputStyle} />
      <input name="localidad" maxLength={80} placeholder="Localidad donde trabajás (opcional)" className={input} style={inputStyle} />
      <input name="vehiculo" maxLength={60} placeholder="Vehículo: utilitario, chasis, semi… (opcional)" className={input} style={inputStyle} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-sm tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        style={{ backgroundColor: "#25D366", color: "#062E16" }}
      >
        <IconoWhatsapp />
        {pendiente ? "Enviando…" : "Seguir por WhatsApp"}
      </button>
    </form>
  );
}
