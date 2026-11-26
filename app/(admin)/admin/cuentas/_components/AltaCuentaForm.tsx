"use client";

import { useActionState, useState } from "react";
import { crearCuentaAdminAction, type AltaState } from "../actions";

const inputClass = "w-full rounded-lg border px-3 py-2 text-sm text-white";
const inputStyle = { backgroundColor: "#0C1E1E", borderColor: "#1E3838", colorScheme: "dark" as const };
const botonStyle = { backgroundColor: "#4ADE80", color: "#060F0F" };

export default function AltaCuentaForm({ tipos }: { tipos: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<AltaState, FormData>(crearCuentaAdminAction, undefined);
  // Cambia la key del form para vaciarlo y crear otra cuenta.
  const [formKey, setFormKey] = useState(0);
  const [mostrarResultado, setMostrarResultado] = useState(true);

  if (state?.ok && mostrarResultado) {
    return (
      <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--primary-20)", backgroundColor: "#0C1E1E" }}>
        <p className="text-sm font-semibold text-white">
          Cuenta creada: entra con {state.acceso} después de elegir la contraseña.
          {state.emailEnviado && " Le llegó el link por email."}
        </p>
        <div className="flex flex-wrap gap-2">
          {state.whatsappUrl && (
            <a
              href={state.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg px-3 py-2 text-sm font-bold"
              style={botonStyle}
            >
              Mandarle el link por WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setMostrarResultado(false);
              setFormKey((k) => k + 1);
            }}
            className="rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer"
            style={{ borderColor: "#1E3838", color: "#A8C5C5" }}
          >
            Crear otra
          </button>
        </div>
        <p className="text-xs break-all" style={{ color: "#A8C5C5" }}>
          Link de activación (vence en 7 días): {state.url}
        </p>
      </div>
    );
  }

  return (
    <form key={formKey} action={(fd) => { setMostrarResultado(true); return action(fd); }} className="space-y-3">
      <input name="nombre" required maxLength={80} placeholder="Nombre o razón social" className={inputClass} style={inputStyle} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="email" type="email" placeholder="Email (opcional)" className={inputClass} style={inputStyle} />
        <input name="telefono" type="tel" placeholder="Teléfono (opcional)" className={inputClass} style={inputStyle} />
      </div>
      <select name="tipo" required defaultValue="" className={inputClass} style={inputStyle}>
        <option value="" disabled>
          Tipo de cuenta
        </option>
        {tipos.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="text-xs" style={{ color: "#6B7280" }}>
        Hace falta email o teléfono. Con teléfono, entra con ese número; con email, también le llega el link.
      </p>
      {state && !state.ok && <p className="text-sm text-red-300">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 cursor-pointer"
        style={botonStyle}
      >
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
