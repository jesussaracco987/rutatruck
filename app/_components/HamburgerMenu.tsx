"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import SwitchRoleButton from "./SwitchRoleButton";

const LINKS = {
  empresa: [
    { href: "/empresa/dashboard", label: "Inicio" },
    { href: "/empresa/cargas", label: "Mis cargas" },
    { href: "/empresa/cargas/nueva", label: "Publicar carga" },
    { href: "/empresa/conversaciones", label: "Conversaciones" },
    { href: "/empresa/historial", label: "Historial" },
    { href: "/empresa/cuenta", label: "Mi cuenta" },
  ],
  transportista: [
    { href: "/transportista/dashboard", label: "Inicio" },
    { href: "/transportista/cargas", label: "Ver cargas" },
    { href: "/transportista/postulaciones", label: "Mis postulaciones" },
    { href: "/transportista/conversaciones", label: "Conversaciones" },
    { href: "/transportista/historial", label: "Historial" },
    { href: "/transportista/cuenta", label: "Mi cuenta" },
  ],
};

export function HamburgerMenu({ role, isMultiRole }: { role: "empresa" | "transportista"; isMultiRole?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: "#C4DCDC" }}
        aria-label="Menú"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl border py-1 z-50 shadow-xl"
          style={{ backgroundColor: "#112424", borderColor: "#1E3838" }}
        >
          {LINKS[role].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm transition-colors hover:bg-white/5"
              style={{ color: "#9CA3AF" }}
            >
              {link.label}
            </Link>
          ))}
          {isMultiRole && (
            <>
              <div className="border-t" style={{ borderColor: "#1E3838" }} />
              <SwitchRoleButton
                toRole={role === "empresa" ? "transportista" : "empresa"}
                className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5 cursor-pointer"
                style={{ color: "#4ADE80" }}
              >
                {role === "empresa" ? "↔ Cambiar a transportista" : "↔ Cambiar a cliente"}
              </SwitchRoleButton>
            </>
          )}
          <div className="border-t" style={{ borderColor: "#1E3838" }} />
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5 cursor-pointer"
              style={{ color: "#6B7280" }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
