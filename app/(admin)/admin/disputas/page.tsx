import { formatFechaDia } from "@/lib/fechas";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import Link from "next/link";
import DisputaActions from "./_components/DisputaActions";

export default async function AdminDisputasPage() {
  const session = await verifySession();

  if (session.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const disputas = await db.carga.findMany({
    where: { estado: "DISPUTA" },
    include: {
      empresa: { select: { name: true, email: true } },
      transportistaAsignado: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0C1E1E" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <span className="text-white font-semibold text-lg">ClickCargo</span>
        <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">Admin</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Disputas abiertas</h1>
            {disputas.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                {disputas.length} abierta{disputas.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {disputas.length === 0 ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ backgroundColor: "#112424", borderColor: "#1E3838" }}
          >
            <p className="text-white font-medium mb-1">Sin disputas abiertas</p>
            <p className="text-sm" style={{ color: "#A8C5C5" }}>No hay cargas en estado de disputa.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputas.map((carga) => (
              <div
                key={carga.id}
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: "#112424", borderColor: "#7C3AED44" }}
              >
                <div
                  className="px-5 py-3 flex items-center justify-between border-b"
                  style={{ borderColor: "#7C3AED44", backgroundColor: "#7C3AED10" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Disputa abierta
                    </span>
                    <span className="text-xs" style={{ color: "#A8C5C5" }}>
                      · Carga #{carga.id}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "#A8C5C5" }}>
                    Abierta por: <span className="text-white">{carga.disputaAbiertaPor === "EMPRESA" ? "Empresa" : "Transportista"}</span>
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-base font-bold text-white">{carga.titulo}</p>
                    <p className="text-sm mt-0.5" style={{ color: "#9CA3AF" }}>
                      {carga.origen} → {carga.destino} · {formatFechaDia(carga.fechaCarga)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className="rounded-lg p-3 text-sm space-y-0.5"
                      style={{ backgroundColor: "#0F2020" }}
                    >
                      <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: "#8BBDBD" }}>Empresa</p>
                      <p className="text-white font-medium">{carga.empresa.name}</p>
                      <p style={{ color: "#A8C5C5" }}>{carga.empresa.email}</p>
                    </div>
                    <div
                      className="rounded-lg p-3 text-sm space-y-0.5"
                      style={{ backgroundColor: "#0F2020" }}
                    >
                      <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: "#8BBDBD" }}>Transportista</p>
                      {carga.transportistaAsignado ? (
                        <>
                          <p className="text-white font-medium">{carga.transportistaAsignado.name}</p>
                          <p style={{ color: "#A8C5C5" }}>{carga.transportistaAsignado.email}</p>
                        </>
                      ) : (
                        <p style={{ color: "#A8C5C5" }}>Sin asignar</p>
                      )}
                    </div>
                  </div>

                  {carga.disputaDescripcion && (
                    <div
                      className="rounded-lg p-3 border"
                      style={{ backgroundColor: "#0F2020", borderColor: "#7C3AED33" }}
                    >
                      <p className="text-xs uppercase tracking-wide font-medium mb-1.5" style={{ color: "#8BBDBD" }}>
                        Descripción de la disputa
                      </p>
                      <p className="text-sm" style={{ color: "#E5E7EB" }}>
                        {carga.disputaDescripcion}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={`/empresa/cargas/${carga.id}`}
                      className="text-xs underline"
                      style={{ color: "var(--primary)" }}
                    >
                      Ver carga →
                    </Link>
                    <DisputaActions cargaId={carga.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
