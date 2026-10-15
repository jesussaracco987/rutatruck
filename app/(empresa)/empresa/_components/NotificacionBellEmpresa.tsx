"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifCount, useAccionesPendientes } from "@/app/_components/EventsProvider";

type Notif = {
  tipo: "confirmacion" | "postulacion" | "disponibilidad";
  href: string;
  titulo: string;
  origen: string;
  destino: string | null;
  extra: string | null;
  vista: boolean;
};

export default function NotificacionBellEmpresa() {
  const count = useNotifCount();
  const accionesPendientes = useAccionesPendientes();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 8 });
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function fetchNotifs() {
    try {
      const data = await fetch("/api/notificaciones/empresa/list").then((r) => r.json());
      setNotifs(data.notificaciones ?? []);
    } catch {
      setNotifs([]);
    }
  }

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 8, right: 8 });
    }
    setOpen(true);
    setLoading(true);
    await fetchNotifs();
    setLoading(false);
  }

  async function handleItemClick(href: string) {
    setOpen(false);
    await fetch("/api/notificaciones/empresa/mark-seen", { method: "POST" });
    router.push(href);
  }

  async function handleMarkAll() {
    await fetch("/api/notificaciones/empresa/mark-seen", { method: "POST" });
    await fetchNotifs();
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative inline-flex items-center p-1 transition-opacity hover:opacity-80"
        style={{ color: "#C4DCDC" }}
        aria-label="Notificaciones"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-gray-900 leading-none">
            {count > 9 ? "9+" : count}
          </span>
        ) : (
          // Punto y no número: una carga esperando confirmación no es algo "sin
          // leer" que se pueda bajar a cero mirando la campana, así que un
          // contador ahí se lee como un badge que no anda.
          accionesPendientes > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500"
              aria-label="Tenés acciones pendientes"
            />
          )
        )}
      </button>

      {open && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-16px)] rounded-xl border shadow-xl z-50 overflow-hidden"
          style={{ backgroundColor: "#112424", borderColor: "#1E3838", top: popupPos.top }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "#1E3838" }}
          >
            <span className="text-sm font-semibold" style={{ color: "#C4DCDC" }}>
              Notificaciones
            </span>
            {notifs.some((n) => n.tipo !== "confirmacion" && !n.vista) && (
              <button
                onClick={handleMarkAll}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: "#6B7280" }}
              >
                Marcar todas como vistas
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "#6B7280" }}>
              Cargando...
            </div>
          ) : notifs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "#6B7280" }}>
              Sin notificaciones
            </div>
          ) : (
            <ul>
              {notifs.map((n, i) => (
                <li key={i}>
                  {n.vista && (i === 0 || !notifs[i - 1].vista) && (
                    <p
                      className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: "#4B5563" }}
                    >
                      Anteriores
                    </p>
                  )}
                  <div className="border-b last:border-b-0" style={{ borderColor: "#1E3838" }}>
                    <button
                      onClick={() => handleItemClick(n.href)}
                      className="w-full text-left px-4 py-3 transition-colors hover:bg-white/5"
                      style={{ opacity: n.vista ? 0.55 : 1 }}
                    >
                      <p className="text-sm font-medium" style={{ color: "#E5E7EB" }}>
                        {n.tipo === "confirmacion"
                          ? "Viaje completado — confirmá o disputá"
                          : n.tipo === "disponibilidad"
                            ? `Transportista disponible${n.extra ? ` · ${n.extra}` : ""}`
                            : `Nueva postulación${n.extra ? ` de ${n.extra}` : ""}`}
                      </p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: "#C4DCDC" }}>
                        {n.titulo}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                        {n.destino ? `${n.origen} → ${n.destino}` : n.origen}
                      </p>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t" style={{ borderColor: "#1E3838" }}>
            <Link
              href="/empresa/cargas"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-xs text-center transition-opacity hover:opacity-70"
              style={{ color: "#6B7280" }}
            >
              Ver todas las cargas →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
