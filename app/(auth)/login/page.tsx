"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import PurgeAuthedCache from "@/app/_components/PurgeAuthedCache";
import PurgeAuthedPush from "@/app/_components/PurgeAuthedPush";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  const inputClass =
    "w-full rounded-xl border px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-colors";
  const inputStyle = {
    backgroundColor: "#0C1A1A",
    borderColor: "#1C3030",
    colorScheme: "dark" as const,
  };
  const focusRing = { "--tw-ring-color": "#4ADE8055" } as React.CSSProperties;

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

        <h2 className="text-2xl font-black text-white mb-1">Bienvenido</h2>
        <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
          Ingresá a tu cuenta para continuar
        </p>

        <form action={action} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#9CA3AF" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              style={{ ...inputStyle, ...focusRing }}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#9CA3AF" }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className={`${inputClass} pr-11`}
                style={{ ...inputStyle, ...focusRing }}
                placeholder="••••••••"
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
            {pending ? "Ingresando..." : "INGRESAR"}
          </button>
        </form>

        <div className="mt-5 text-center space-y-3">
          <Link
            href="/recuperar-contrasena"
            className="block text-sm transition-colors hover:opacity-80"
            style={{ color: "#4ADE80" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>

          <p className="text-sm" style={{ color: "#6B7280" }}>
            ¿No tenés cuenta?{" "}
            <Link
              href="/registro"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: "#4ADE80" }}
            >
              Registrate
            </Link>
          </p>

          <p className="text-xs pt-3" style={{ color: "#4B5563" }}>
            <Link href="/terminos" className="hover:opacity-80">
              Términos
            </Link>
            {" · "}
            <Link href="/politica-de-privacidad" className="hover:opacity-80">
              Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
