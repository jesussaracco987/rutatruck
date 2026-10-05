"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import LocationAutocomplete, {
  type LocationSelection,
} from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationAutocomplete";
import VerificarEmailBanner from "@/app/_components/VerificarEmailBanner";

const RADIOS = [
  { value: 20, label: "20 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: null, label: "Sin límite" },
];

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
  email: string;
  emailVerified: boolean;
  phone: string | null;
  notifZonaLat: number | null;
  notifZonaLng: number | null;
  notifRadioKm: number | null;
  showNotificaciones?: boolean;
};

export default function CuentaForm({
  email,
  emailVerified,
  phone: initialPhone,
  notifZonaLat,
  notifZonaLng,
  notifRadioKm,
  showNotificaciones = true,
}: Props) {
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
          <span className="text-sm font-semibold text-gray-900 truncate">{email}</span>
          {emailVerified && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#DCFCE7", color: "#166534" }}
            >
              ✓ Verificado
            </span>
          )}
        </div>
        {!emailVerified && (
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
        <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
          Sin verificar por ahora
        </p>
      </div>

      {/* Notificaciones */}
      {showNotificaciones && (
      <div>
        <span style={labelStyle}>Notificaciones de cargas nuevas</span>
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
            Todas las cargas
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
                {RADIOS.map((r) => (
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
          {hasZona
            ? "Vas a recibir avisos solo de cargas dentro del radio elegido desde tu zona."
            : "Vas a recibir avisos de todas las cargas nuevas, sin importar la distancia."}
        </p>
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
