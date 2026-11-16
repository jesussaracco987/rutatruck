"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import LocationAutocomplete, {
  type LocationSelection,
} from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationAutocomplete";
import VerificarEmailBanner from "@/app/_components/VerificarEmailBanner";
import { radiosConActual } from "@/lib/radios";
import { VERIFICACION_TELEFONO_HABILITADA } from "@/lib/verificacion-telefono";

/** Cada cuánto y hasta cuándo se consulta si llegó el WhatsApp de confirmación. */
const CONSULTA_CADA_MS = 4000;
const CONSULTA_HASTA_MS = 10 * 60 * 1000;

/** "5492215475754" → "+54 9 221 547-5754" (área de 3 dígitos, la más común; es solo para mostrar). */
function mostrarTelefono(tel: string): string {
  const m = tel.match(/^549(\d{3})(\d{3})(\d{4})$/);
  return m ? `+54 9 ${m[1]} ${m[2]}-${m[3]}` : `+${tel}`;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1.5px solid #E2E8E8",
  fontSize: "15px",
  outline: "none",
  backgroundColor: "#FFFFFF",
  color: "#111827",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#6B7280",
  display: "block",
  marginBottom: "6px",
};

type Props = {
  /** null en cuentas que entran con el teléfono (ver telefonoLogin). */
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  /** Teléfono confirmado por WhatsApp, con el que también puede entrar. */
  telefonoLogin: string | null;
  notifZonaLat: number | null;
  notifZonaLng: number | null;
  notifRadioKm: number | null;
  showNotificaciones?: boolean;
  /** Qué se notifica según la zona: cargas (lado transportista) o transportistas disponibles (lado empresa). */
  avisosDe?: "cargas" | "transportistas";
  /** Cuenta EMPRESA_TRANSPORTISTA: la zona es una sola para los dos lados. */
  zonaCompartida?: boolean;
};

const TEXTOS = {
  cargas: {
    titulo: "Notificaciones de cargas nuevas",
    todas: "Todas las cargas",
    conZona: "Vas a recibir avisos solo de cargas dentro del radio elegido desde tu zona.",
    sinZona: "Vas a recibir avisos de todas las cargas nuevas, sin importar la distancia.",
  },
  transportistas: {
    titulo: "Notificaciones de transportistas disponibles",
    todas: "Todos",
    conZona: "Vas a recibir avisos solo de transportistas disponibles dentro del radio elegido desde tu zona.",
    sinZona: "Vas a recibir avisos de todos los transportistas que se marquen disponibles, sin importar la distancia.",
  },
};

export default function CuentaForm({
  email,
  emailVerified,
  phone: initialPhone,
  telefonoLogin: initialTelefonoLogin,
  notifZonaLat,
  notifZonaLng,
  notifRadioKm,
  showNotificaciones = true,
  avisosDe = "cargas",
  zonaCompartida = false,
}: Props) {
  const textos = TEXTOS[avisosDe];
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [zona, setZona] = useState("");
  const [loc, setLoc] = useState<LocationSelection | null>(
    notifZonaLat != null && notifZonaLng != null
      ? { label: "", lat: notifZonaLat, lng: notifZonaLng }
      : null
  );
  const [radioKm, setRadioKm] = useState<number | null>(notifRadioKm);
  const [hasZona, setHasZona] = useState(notifZonaLat != null && notifZonaLng != null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [telefonoLogin, setTelefonoLogin] = useState(initialTelefonoLogin);
  const [esperandoWhatsapp, setEsperandoWhatsapp] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState("");
  const consulta = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (consulta.current) clearInterval(consulta.current);
  }, []);

  async function handleConfirmarTelefono() {
    setErrorConfirmacion("");
    // La pestaña se abre antes del fetch: si se abre después, el navegador
    // (sobre todo en el celular) la toma como popup y la bloquea.
    const ventana = window.open("", "_blank");
    const res = await fetch("/api/perfil/telefono", { method: "POST" });
    const data = res.ok ? ((await res.json()) as { url: string }) : null;
    if (!data) {
      ventana?.close();
      setErrorConfirmacion("No pudimos abrir WhatsApp. Intentá de nuevo en un rato.");
      return;
    }
    if (ventana) ventana.location.href = data.url;
    else window.location.href = data.url;

    // Cuando llega el mensaje, el webhook guarda el teléfono: se consulta hasta verlo.
    setEsperandoWhatsapp(true);
    if (consulta.current) clearInterval(consulta.current);
    const inicio = Date.now();
    consulta.current = setInterval(async () => {
      const r = await fetch("/api/perfil").catch(() => null);
      const confirmado = r?.ok ? ((await r.json()) as { user: { telefonoLogin: string | null } }).user.telefonoLogin : null;
      if (confirmado || Date.now() - inicio > CONSULTA_HASTA_MS) {
        if (confirmado) setTelefonoLogin(confirmado);
        setEsperandoWhatsapp(false);
        if (consulta.current) clearInterval(consulta.current);
      }
    }, CONSULTA_CADA_MS);
  }

  function handleGuardar() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || null,
          ...(showNotificaciones
            ? {
                notifZonaLat: hasZona ? loc?.lat ?? notifZonaLat : null,
                notifZonaLng: hasZona ? loc?.lng ?? notifZonaLng : null,
                notifRadioKm: hasZona ? radioKm : null,
              }
            : {}),
        }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        setError("Error al guardar. Intentá de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <span style={labelStyle}>Email</span>
        <div
          className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <span className="text-sm font-semibold text-gray-900 truncate">
            {email ?? "Sin email: entrás con tu teléfono"}
          </span>
          {email && emailVerified && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#DCFCE7", color: "#166534" }}
            >
              ✓ Verificado
            </span>
          )}
        </div>
        {email && !emailVerified && (
          <div className="mt-3">
            <VerificarEmailBanner emailVerified={false} />
          </div>
        )}
      </div>

      {/* Teléfono */}
      <div>
        <label style={labelStyle} htmlFor="telefono-input">
          Teléfono
        </label>
        <input
          id="telefono-input"
          type="tel"
          placeholder="Ej: 341 555 1234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />
        {telefonoLogin ? (
          <p className="text-xs mt-1.5 font-semibold" style={{ color: "#166534" }}>
            ✓ Confirmado por WhatsApp: {mostrarTelefono(telefonoLogin)}. Podés entrar con este número.
          </p>
        ) : VERIFICACION_TELEFONO_HABILITADA ? (
          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={handleConfirmarTelefono}
              className="w-full py-2.5 rounded-xl border text-sm font-semibold"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#25D366", color: "#128C7E" }}
            >
              Confirmar por WhatsApp
            </button>
            <p className="text-xs" style={{ color: errorConfirmacion ? "#DC2626" : "#9CA3AF" }}>
              {errorConfirmacion ||
                (esperandoWhatsapp
                  ? "Enviá el mensaje que se abrió en WhatsApp sin cambiarlo. Esta pantalla se actualiza sola."
                  : "Se abre WhatsApp con un mensaje listo para enviar. Así confirmás que el número es tuyo y podés entrar con él.")}
            </p>
          </div>
        ) : (
          <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
            Sin verificar por ahora
          </p>
        )}
      </div>

      {/* Notificaciones */}
      {showNotificaciones && (
      <div>
        <span style={labelStyle}>{textos.titulo}</span>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setHasZona(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all"
            style={{
              backgroundColor: !hasZona ? "var(--primary)" : "#FFFFFF",
              borderColor: !hasZona ? "var(--primary)" : "#E2E8E8",
              color: !hasZona ? "#FFFFFF" : "#374151",
            }}
          >
            {textos.todas}
          </button>
          <button
            type="button"
            onClick={() => setHasZona(true)}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all"
            style={{
              backgroundColor: hasZona ? "var(--primary)" : "#FFFFFF",
              borderColor: hasZona ? "var(--primary)" : "#E2E8E8",
              color: hasZona ? "#FFFFFF" : "#374151",
            }}
          >
            Solo cerca mío
          </button>
        </div>

        {hasZona && (
          <div className="space-y-3">
            <div>
              <label style={labelStyle} htmlFor="zona-input">
                Tu zona
              </label>
              <LocationAutocomplete
                id="zona-input"
                name="zona"
                placeholder="Ej: Rosario, Santa Fe"
                inputClass=""
                inputStyle={inputStyle}
                initialValue={zona}
                onValueChange={(v) => {
                  setZona(v);
                  if (!v) setLoc(null);
                }}
                onLocationSelect={(l) => setLoc(l)}
              />
              {notifZonaLat != null && !loc && (
                <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
                  Ya tenés una zona guardada — buscá y elegí una localidad de la lista para cambiarla.
                </p>
              )}
            </div>
            <div>
              <span style={labelStyle}>Radio</span>
              <div className="flex gap-2 flex-wrap">
                {radiosConActual(notifRadioKm).map((r) => (
                  <button
                    key={String(r.value)}
                    type="button"
                    onClick={() => setRadioKm(r.value)}
                    className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: radioKm === r.value ? "var(--primary)" : "#FFFFFF",
                      borderColor: radioKm === r.value ? "var(--primary)" : "#E2E8E8",
                      color: radioKm === r.value ? "#FFFFFF" : "#374151",
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs mt-3" style={{ color: "#6B7280" }}>
          {hasZona ? textos.conZona : textos.sinZona}
        </p>
        {zonaCompartida && (
          <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
            La zona es la misma para tu perfil de cliente y de transportista: aplica tanto a avisos de cargas como de transportistas.
          </p>
        )}
      </div>
      )}

      {error && (
        <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGuardar}
        disabled={pending || (showNotificaciones && hasZona && !loc && notifZonaLat == null)}
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-opacity"
        style={{
          backgroundColor: "var(--primary)",
          color: "#FFFFFF",
          opacity: pending || (hasZona && !loc && notifZonaLat == null) ? 0.6 : 1,
        }}
      >
        {pending ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
      </button>

      <p className="text-xs text-center" style={{ color: "#6B7280" }}>
        <Link href="/terminos" className="underline">
          Términos
        </Link>
        {" · "}
        <Link href="/politica-de-privacidad" className="underline">
          Privacidad
        </Link>
        {" · "}
        <Link href="/eliminar-cuenta" className="underline">
          Eliminar cuenta
        </Link>
      </p>
    </div>
  );
}
