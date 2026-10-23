import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBell from "../_components/NotificacionBell";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import { logout } from "@/app/actions/auth";
import SwitchRoleButton from "@/app/_components/SwitchRoleButton";
import VerificarEmailBanner from "@/app/_components/VerificarEmailBanner";
import CargasPorCompletarBanner from "../_components/CargasPorCompletarBanner";
import { findCargasAsignadasVencidasDeTransportista } from "@/lib/repositories/carga.repository";

export default async function TransportistaDashboard() {
  const session = await verifySession();

  const [totalCargas, misPostulaciones, viajesCompletados, enViaje, user, cargasVencidas] = await Promise.all([
    db.carga.count({ where: { estado: "ACTIVA" } }),
    db.postulacion.count({ where: { transportistaId: session.userId } }),
    db.postulacion.count({
      where: { transportistaId: session.userId, estado: "ACEPTADA", carga: { estado: "FINALIZADA" } },
    }),
    db.postulacion.count({
      where: { transportistaId: session.userId, estado: "ACEPTADA", carga: { estado: "ASIGNADA" } },
    }),
    db.user.findUnique({ where: { id: session.userId }, select: { name: true, phone: true, emailVerified: true } }),
    findCargasAsignadasVencidasDeTransportista(session.userId),
  ]);

  const acciones = [
    {
      href: "/transportista/cargas",
      label: "Cargas disponibles",
      sublabel: `${totalCargas} activa${totalCargas !== 1 ? "s" : ""} ahora`,
      count: totalCargas,
      primary: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      href: "/transportista/postulaciones",
      label: "Mis postulaciones",
      sublabel: `${misPostulaciones} en total`,
      count: misPostulaciones,
      primary: false,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/transportista/historial",
      label: "Historial",
      sublabel: `${viajesCompletados} viaje${viajesCompletados !== 1 ? "s" : ""} completado${viajesCompletados !== 1 ? "s" : ""}`,
      count: null,
      primary: false,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const perfilIncompleto = !user?.phone || !user?.emailVerified;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <LogoClickCargo />
        <div className="flex items-center gap-2">
          <NotificacionBell />
          <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">¡Hola, {user?.name}!</h1>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            Encontrá cargas y gestioná tus viajes
          </p>
        </div>

        <VerificarEmailBanner emailVerified={user?.emailVerified ?? true} />

        <CargasPorCompletarBanner cargas={cargasVencidas} />

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Disponibles", value: totalCargas, color: "var(--primary)" },
            { label: "En viaje", value: enViaje, color: "#3B82F6" },
            { label: "Completados", value: viajesCompletados, color: "#22C55E" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl border p-4 text-center"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
            >
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs font-medium mt-1" style={{ color: "#6B7280" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Nav cards */}
        <div className="flex flex-col gap-3">
          {acciones.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-opacity active:opacity-80"
              style={
                a.primary
                  ? { backgroundColor: "var(--primary)", color: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", color: "#111827", border: "1px solid #E2E8E8" }
              }
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={
                  a.primary
                    ? { backgroundColor: "rgba(255,255,255,0.15)" }
                    : { backgroundColor: "var(--primary-10)" }
                }
              >
                <span style={{ color: a.primary ? "#FFFFFF" : "var(--primary)" }}>
                  {a.icon}
                </span>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{a.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{a.sublabel}</p>
              </div>
              {a.count != null && a.count > 0 && (
                <span
                  className="text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0"
                  style={
                    a.primary
                      ? { backgroundColor: "rgba(255,255,255,0.2)", color: "#FFFFFF" }
                      : { backgroundColor: "var(--primary-13)", color: "var(--primary)" }
                  }
                >
                  {a.count}
                </span>
              )}
              <svg
                className="w-4 h-4 flex-shrink-0 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Account actions — mobile only */}
        <div className="md:hidden mt-8 flex flex-col gap-3">
          <Link
            href="/transportista/cuenta"
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-left transition-opacity active:opacity-80"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8", color: "#111827" }}
          >
            <span className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--primary-10)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--primary)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {perfilIncompleto && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ backgroundColor: "#F97316", borderColor: "#FFFFFF" }}
                />
              )}
            </span>
            <span className="font-semibold text-sm flex items-center gap-1.5">
              Mi cuenta
              {perfilIncompleto && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#FFEDD5", color: "#9A3412" }}>
                  Completar
                </span>
              )}
            </span>
          </Link>
          {session.role === "EMPRESA_TRANSPORTISTA" && (
            <SwitchRoleButton
              toRole="empresa"
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-left transition-opacity active:opacity-80"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8", color: "#111827" }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#F0FDF4" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#16A34A" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </span>
              <span className="font-semibold text-sm">Cambiar a cliente</span>
            </SwitchRoleButton>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-left transition-opacity active:opacity-80 cursor-pointer"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8", color: "#6B7280" }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#FEF2F2" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#EF4444" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              <span className="font-semibold text-sm">Cerrar sesión</span>
            </button>
          </form>
          {/* <Link
            href="/reporte"
            className="text-xs text-center py-2"
            style={{ color: "#9CA3AF" }}
          >
            Reportar un problema
          </Link> */}
        </div>
      </main>
    </div>
  );
}
