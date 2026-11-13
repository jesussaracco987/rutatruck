"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import LogoClickCargo from "@/app/_components/LogoClickCargo";

function NuevaContrasenaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  // Cuenta creada por el equipo (alta asistida): es la primera contraseña.
  const activar = searchParams.get("activar") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("El enlace no es válido.");
  }, [token]);

  const inputClass =
    "w-full rounded-xl border px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-colors";
  const inputStyle = {
    backgroundColor: "#0C1A1A",
    borderColor: "#1C3030",
    colorScheme: "dark" as const,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/auth/nueva-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error inesperado");
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: "var(--primary-13)" }}
        >
          <svg className="w-7 h-7" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-white">
          {activar ? "¡Tu cuenta está activa!" : "¡Contraseña actualizada!"}
        </h2>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-black text-white mb-1">
        {activar ? "Activá tu cuenta" : "Nueva contraseña"}
      </h2>
      <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
        {activar
          ? "Ya creamos tu cuenta de transportista. Elegí una contraseña para entrar."
          : "Ingresá tu nueva contraseña."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#9CA3AF" }}
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-11`}
              style={inputStyle}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 transition-colors hover:text-white"
              style={{ color: "#4B5563" }}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#9CA3AF" }}
          >
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type={showPassword ? "text" : "password"}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !token}
          className="w-full font-bold rounded-xl py-3.5 transition-opacity cursor-pointer disabled:opacity-50 text-sm tracking-wide active:opacity-80 mt-2"
          style={{ backgroundColor: "rgba(255,255,255,0.93)", color: "#060F0F" }}
        >
          {pending ? "Guardando..." : activar ? "ACTIVAR CUENTA" : "GUARDAR CONTRASEÑA"}
        </button>
        {activar && (
          <p className="text-xs text-center" style={{ color: "#6B7280" }}>
            Al activar tu cuenta aceptás los{" "}
            <Link href="/terminos" className="underline">Términos</Link> y la{" "}
            <Link href="/politica-de-privacidad" className="underline">Política de Privacidad</Link>.
          </p>
        )}
      </form>
    </>
  );
}

export default function NuevaContrasenaPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ backgroundColor: "#060F0F" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <Link href="/">
            <LogoClickCargo size={48} />
          </Link>
        </div>
        <Suspense fallback={<p className="text-center text-sm" style={{ color: "#6B7280" }}>Cargando...</p>}>
          <NuevaContrasenaForm />
        </Suspense>
      </div>
    </div>
  );
}
