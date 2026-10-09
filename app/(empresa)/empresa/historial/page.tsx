import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBellEmpresa from "../_components/NotificacionBellEmpresa";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import { TIPO_CARGA_LABELS as TIPO_LABELS } from "@/lib/tipos-carga";

export default async function EmpresaHistorialPage() {
  const session = await verifySession();

  // Las CANCELADA reactivables siguen en "Mis cargas" hasta que el cron las
  // purga; acá solo entran las que quedan de forma definitiva, que son las que
  // pasaron por una disputa (las únicas que la purga preserva).
  const cargas = await db.carga.findMany({
    where: {
      empresaId: session.userId,
      OR: [
        { estado: "FINALIZADA" },
        { estado: "CANCELADA", disputaAbiertaPor: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      transportistaAsignado: { select: { name: true } },
    },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}
      >
        <Link href="/empresa/dashboard">
          <LogoClickCargo />
        </Link>
        <div className="flex items-center gap-2">
          <NotificacionBellEmpresa />
          <HamburgerMenu role="empresa" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/empresa/dashboard"
            className="inline-flex items-center gap-2 mb-4 font-semibold text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2" style={{ borderColor: "var(--primary)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            Volver al panel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Historial de cargas</h1>
          <p className="mt-1.5 text-base" style={{ color: "#374151" }}>
            {cargas.length} carga{cargas.length !== 1 ? "s" : ""} en historial
          </p>
        </div>

        {cargas.length === 0 ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--primary-10)" }}>
              <svg className="w-6 h-6" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p style={{ color: "#374151" }}>Todavía no tenés cargas finalizadas ni canceladas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cargas.map((carga: any) => (
              <Link
                key={carga.id}
                href={`/empresa/cargas/${carga.id}`}
                className="rounded-xl border block overflow-hidden hover:border-[var(--primary-27)] transition-all"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${carga.estado === "CANCELADA" ? "bg-red-400" : "bg-gray-500"}`} />
                        <h3 className="font-semibold text-gray-900 truncate">{carga.titulo}</h3>
                      </div>
                      <p className="text-sm ml-4" style={{ color: "#374151" }}>
                        {carga.origen} <span style={{ color: "var(--primary)" }}>→</span> {carga.destino}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${carga.estado === "CANCELADA" ? "bg-red-500/20 text-red-300" : "bg-white/10 text-gray-400"}`}>
                      {carga.estado === "CANCELADA" ? "Cancelada" : "Finalizada"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 ml-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Tipo</p>
                      <p className="text-sm font-bold text-gray-900">{TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Fecha carga</p>
                      <p className="text-sm font-bold text-gray-900">{carga.fechaCarga.toLocaleDateString("es-AR")}</p>
                    </div>
                    {carga.presupuesto !== null && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Presupuesto</p>
                        <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                          ${carga.presupuesto.toLocaleString("es-AR")}
                        </p>
                      </div>
                    )}
                    {carga.transportistaAsignado && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Transportista</p>
                        <p className="text-sm font-bold text-gray-900">{carga.transportistaAsignado.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="px-5 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ backgroundColor: "var(--primary-10)", color: "var(--primary)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver detalle
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
