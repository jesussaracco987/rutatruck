"use client";

import { use, useActionState, useState } from "react";
import Link from "next/link";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import PurgeAuthedCache from "@/app/_components/PurgeAuthedCache";
import PurgeAuthedPush from "@/app/_components/PurgeAuthedPush";
import { signup } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/auth";
import LocationAutocomplete from "@/app/(empresa)/empresa/cargas/nueva/_components/LocationAutocomplete";

export default function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string | string[] }>;
}) {
  // La home y las landings mandan acá con ?rol=empresa o ?rol=transportista.
  const { rol } = use(searchParams);
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [esEmpresa, setEsEmpresa] = useState(rol === "empresa");
  const [esTransportista, setEsTransportista] = useState(rol === "transportista");
  const [notifZonaLat, setNotifZonaLat] = useState("");
  const [notifZonaLng, setNotifZonaLng] = useState("");
  const [notifRadioKm, setNotifRadioKm] = useState("");
  // "Todo el país" usa value="" y ese es además el estado inicial del radio, así
  // que solo avisamos cuando eligió un radio concreto (50/100/200) sin localidad:
  // ahí signup descarta la preferencia entera —exige lat y lng— y el usuario
  // termina recibiendo avisos de todo el país creyendo que los filtró.
  const radioSinZona = notifRadioKm !== "" && !notifZonaLat;

  const inputClass =
    "w-full rounded-xl border px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-colors";
  const inputStyle = {
    backgroundColor: "#0C1A1A",
    borderColor: "#1C3030",
    colorScheme: "dark" as const,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ backgroundColor: "#060F0F" }}
    >
      <PurgeAuthedCache />
      <PurgeAuthedPush />
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/">
            <LogoClickCargo size={48} />
          </Link>
        </div>

        <h2 className="text-2xl font-black text-white mb-1">Crear cuenta</h2>
        <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
          Empezá gratis, sin tarjeta de crédito
        </p>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
              Nombre completo / Empresa
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
              style={inputStyle}
              placeholder="Tu nombre o razón social"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              style={inputStyle}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
                style={inputStyle}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3.5 transition-colors hover:text-white"
                style={{ color: "#4B5563" }}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
              Soy...
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="esEmpresa"
                  value="on"
                  checked={esEmpresa}
                  onChange={(e) => setEsEmpresa(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-400 cursor-pointer"
                />
                <span className="text-sm text-white">Empresa — publico cargas</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="esTransportista"
                  value="on"
                  checked={esTransportista}
                  onChange={(e) => setEsTransportista(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-400 cursor-pointer"
                />
                <span className="text-sm text-white">Transportista — me postulo a cargas</span>
              </label>

              {esTransportista && (
                <div className="ml-7 mt-1 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="tipoTransportista"
                      value="individual"
                      defaultChecked
                      className="w-4 h-4 accent-green-400 cursor-pointer"
                    />
                    <span className="text-sm" style={{ color: "#D1D5DB" }}>Individual — 1 camión</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="tipoTransportista"
                      value="flota"
                      className="w-4 h-4 accent-green-400 cursor-pointer"
                    />
                    <span className="text-sm" style={{ color: "#D1D5DB" }}>Flota — 2 o más camiones</span>
                  </label>

                  <div className="pt-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                      Zona para notificaciones
                    </p>
                    <LocationAutocomplete
                      id="notifZona"
                      name="notifZonaTexto"
                      placeholder="Ej: Río Cuarto, Córdoba"
                      inputClass="w-full rounded-xl border px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-colors"
                      inputStyle={{ backgroundColor: "#0C1A1A", borderColor: "#1C3030", colorScheme: "dark" as const }}
                      onValueChange={(v) => { if (!v) { setNotifZonaLat(""); setNotifZonaLng(""); } }}
                      onLocationSelect={(loc) => { setNotifZonaLat(String(loc.lat)); setNotifZonaLng(String(loc.lng)); }}
                    />
                    <input type="hidden" name="notifZonaLat" value={notifZonaLat} />
                    <input type="hidden" name="notifZonaLng" value={notifZonaLng} />

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "50 km", value: "50" },
                        { label: "100 km", value: "100" },
                        { label: "200 km", value: "200" },
                        { label: "Todo el país", value: "" },
                      ].map(({ label, value }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="notifRadioKm"
                            value={value}
                            checked={notifRadioKm === value}
                            onChange={() => setNotifRadioKm(value)}
                            className="w-4 h-4 accent-green-400 cursor-pointer"
                          />
                          <span className="text-sm" style={{ color: "#D1D5DB" }}>{label}</span>
                        </label>
                      ))}
                    </div>

                    {radioSinZona && (
                      <p
                        className="text-xs rounded-lg px-3 py-2"
                        style={{
                          color: "#FCD34D",
                          backgroundColor: "rgba(252, 211, 77, 0.08)",
                          border: "1px solid rgba(252, 211, 77, 0.25)",
                        }}
                      >
                        Elegí una localidad para que el radio tenga efecto. Sin localidad vas a
                        recibir avisos de cargas de todo el país.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Links en pestaña nueva: navegar en la misma perdería lo ya cargado. */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              name="aceptaTerminos"
              value="on"
              required
              className="w-4 h-4 mt-0.5 rounded accent-green-400 cursor-pointer flex-shrink-0"
            />
            <span className="text-sm" style={{ color: "#D1D5DB" }}>
              Acepto los{" "}
              <Link href="/terminos" target="_blank" className="font-semibold underline" style={{ color: "#4ADE80" }}>
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/politica-de-privacidad" target="_blank" className="font-semibold underline" style={{ color: "#4ADE80" }}>
                Política de Privacidad
              </Link>
            </span>
          </label>

          {state?.error && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full font-bold rounded-xl py-3.5 transition-opacity cursor-pointer disabled:opacity-50 text-sm tracking-wide active:opacity-80 mt-2"
            style={{ backgroundColor: "rgba(255,255,255,0.93)", color: "#060F0F" }}
          >
            {pending ? "Creando cuenta..." : "CREAR CUENTA"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="text-sm" style={{ color: "#9CA3AF" }}>60 días gratis —</span>
          <span className="text-sm font-bold" style={{ color: "#4ADE80" }}>sin tarjeta</span>
        </div>

        <p className="mt-4 text-center text-sm" style={{ color: "#6B7280" }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: "#4ADE80" }}>
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
