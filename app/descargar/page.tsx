"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import iconImg from "@/app/assets/icon-bg-transparent.png";

export default function DescargarPage() {
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setAppUrl(window.location.origin + "/descargar");

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setIsIOS(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      (e as any).prompt();
      (e as any).userChoice.then(() => setDeferredPrompt(null));
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
  }

  const qrUrl = appUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&color=060F0F&bgcolor=ffffff&margin=10`
    : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#060F0F" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10">
          <Image src={iconImg} alt="ClickCargo" width={48} height={48} />
          <div className="flex flex-col leading-none">
            <span className="font-bold tracking-wide" style={{ fontSize: "1.05rem", letterSpacing: "0.04em" }}>
              <span style={{ color: "#4ADE80" }}>CLICK</span>
              <span className="text-white">CARGO</span>
            </span>
            <span
              className="uppercase tracking-widest"
              style={{ fontSize: "0.52rem", color: "#4ADE80", opacity: 0.8, marginTop: "2px" }}
            >
              Red integral de cargas
            </span>
          </div>
        </Link>

        <h1 className="text-2xl font-black text-white mb-2">
          Descargá la app
        </h1>
        <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
          Escaneá el código QR con tu celular para abrirla, o instalala directamente desde este dispositivo.
        </p>

        {/* QR */}
        <div
          className="rounded-2xl p-4 mb-8"
          style={{ backgroundColor: "#ffffff" }}
        >
          {qrUrl ? (
            <Image
              src={qrUrl}
              alt="QR para descargar ClickCargo"
              width={220}
              height={220}
              unoptimized
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ width: 220, height: 220 }}
            >
              <svg className="w-8 h-8 animate-spin" style={{ color: "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full mb-8">
          <div className="flex-1 h-px" style={{ backgroundColor: "#1C3030" }} />
          <span className="text-xs font-semibold" style={{ color: "#4B5563" }}>O</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#1C3030" }} />
        </div>

        {/* Install action */}
        {isInstalled ? (
          <div className="w-full rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "#0C1A1A", border: "1px solid #1C3030" }}>
            <p className="text-sm font-semibold" style={{ color: "#4ADE80" }}>
              ✓ Ya está instalada
            </p>
          </div>
        ) : isIOS ? (
          <div className="w-full rounded-xl px-4 py-4 text-left space-y-2" style={{ backgroundColor: "#0C1A1A", border: "1px solid #1C3030" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
              Instalar en iPhone / iPad
            </p>
            <p className="text-sm" style={{ color: "#D1D5DB" }}>
              1. Tocá el botón <strong style={{ color: "#ffffff" }}>Compartir</strong> <span style={{ color: "#4ADE80" }}>⎋</span> en Safari
            </p>
            <p className="text-sm" style={{ color: "#D1D5DB" }}>
              2. Elegí <strong style={{ color: "#ffffff" }}>Agregar a pantalla de inicio</strong>
            </p>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full font-bold rounded-xl py-3.5 transition-opacity cursor-pointer disabled:opacity-50 text-sm tracking-wide active:opacity-80"
            style={{ backgroundColor: "rgba(255,255,255,0.93)", color: "#060F0F" }}
          >
            {installing ? "Instalando..." : "INSTALAR APP"}
          </button>
        ) : (
          <div className="w-full rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "#0C1A1A", border: "1px solid #1C3030" }}>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Abrí esta página desde Chrome o Edge para instalarla
            </p>
          </div>
        )}

        <p className="mt-8 text-xs" style={{ color: "#374151" }}>
          {appUrl ?? ""}
        </p>

      </div>
    </div>
  );
}
