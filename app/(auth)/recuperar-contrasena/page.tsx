"use client";

import { useState } from "react";
import Link from "next/link";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import { whatsappUrl } from "@/lib/site";

const whatsappRecuperar = whatsappUrl("Hola, entro a ClickCargo con mi teléfono y necesito un link para cambiar la contraseña.");

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setPending(true);
    try {
      const res = await fetch("/api/auth/recuperar-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error inesperado");
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setPending(false);
    }
  }

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

        {sent ? (
          <div className="text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "var(--primary-13)" }}
            >
              <svg className="w-7 h-7" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white">Revisá tu email</h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Si existe una cuenta con ese email, vas a recibir un enlace para restablecer tu contraseña. Vence en 1 hora.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: "#4ADE80" }}
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-white mb-1">Recuperar contraseña</h2>
            <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
              Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={inputClass}
                  style={inputStyle}
                  placeholder="tu@email.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full font-bold rounded-xl py-3.5 transition-opacity cursor-pointer disabled:opacity-50 text-sm tracking-wide active:opacity-80 mt-2"
                style={{ backgroundColor: "rgba(255,255,255,0.93)", color: "#060F0F" }}
              >
                {pending ? "Enviando..." : "ENVIAR ENLACE"}
              </button>
            </form>

            {/* Las cuentas que entran con el teléfono no tienen email: el link
                lo genera el equipo desde /admin/solicitudes. */}
            {whatsappRecuperar && (
              <p className="mt-5 text-center text-sm" style={{ color: "#9CA3AF" }}>
                ¿Entrás con tu teléfono?{" "}
                <a
                  href={whatsappRecuperar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                  style={{ color: "#4ADE80" }}
                >
                  Pedinos el link por WhatsApp
                </a>
              </p>
            )}

            <p className="mt-5 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: "#4ADE80" }}
              >
                ← Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
