"use client";

import { useActionState } from "react";
import { crearCuentaAction, descartarAction, linkAccesoAction, type LinkState } from "../actions";

const inputStyle = { backgroundColor: "#0C1E1E", borderColor: "#1E3838" };
const botonStyle = { backgroundColor: "#4ADE80", color: "#060F0F" };

function LinkListo({ state, titulo }: { state: Extract<LinkState, { ok: true }>; titulo: string }) {
  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--primary-20)", backgroundColor: "#0C1E1E" }}>
      <p className="text-sm font-semibold text-white">
        {titulo}
        {state.emailEnviado && " También le llegó por email."}
      </p>
      <a
        href={state.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg px-3 py-2 text-sm font-bold"
        style={botonStyle}
      >
        Mandarle el link por WhatsApp
      </a>
      <p className="text-xs break-all" style={{ color: "#A8C5C5" }}>
        {state.url}
      </p>
    </div>
  );
}

export default function CrearCuentaForm({ id, email }: { id: string; email: string | null }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(crearCuentaAction, undefined);

  if (state?.ok) return <LinkListo state={state} titulo="Cuenta creada: entra con su teléfono." />;

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-col sm:flex-row gap-2">
        <input type="hidden" name="id" value={id} />
        <input
          name="email"
          type="email"
          defaultValue={email ?? ""}
          placeholder="Email (opcional)"
          className="flex-1 rounded-lg border px-3 py-2 text-sm text-white"
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 cursor-pointer"
          style={botonStyle}
        >
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      {state && !state.ok && <p className="text-sm text-red-300">{state.error}</p>}
      <form action={descartarAction}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="text-xs underline cursor-pointer" style={{ color: "#6B7280" }}>
          Descartar
        </button>
      </form>
    </div>
  );
}

/** Para quien entra con el teléfono y no recuerda la contraseña: no hay email al que mandarle el link. */
export function LinkAccesoForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(linkAccesoAction, undefined);
  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-col sm:flex-row gap-2">
        <input
          name="telefono"
          type="tel"
          required
          placeholder="Teléfono de la cuenta"
          className="flex-1 rounded-lg border px-3 py-2 text-sm text-white"
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 cursor-pointer"
          style={botonStyle}
        >
          {pending ? "Generando…" : "Generar link"}
        </button>
      </form>
      {state?.ok && <LinkListo state={state} titulo="Link generado (vence en 7 días)." />}
      {state && !state.ok && <p className="text-sm text-red-300">{state.error}</p>}
    </div>
  );
}
