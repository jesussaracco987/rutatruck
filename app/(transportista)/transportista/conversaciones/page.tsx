import Link from "next/link";
import { verifySession } from "@/lib/dal";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBell from "../_components/NotificacionBell";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import RefreshOnVisible from "@/app/_components/RefreshOnVisible";
import { findConversaciones } from "@/lib/repositories/mensaje.repository";

export default async function TransportistaConversacionesPage() {
  const session = await verifySession();
  const conversaciones = await findConversaciones(session.userId, "transportista");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <RefreshOnVisible />
      <header
        className="sticky top-0 z-30 border-b px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <LogoClickCargo />
        <div className="flex items-center gap-2">
          <NotificacionBell />
          <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">Conversaciones</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Coordiná con los clientes de tus cargas asignadas
          </p>
        </div>

        {conversaciones.length === 0 ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--primary-10)" }}>
              <svg className="w-6 h-6" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p style={{ color: "#374151" }}>
              Todavía no tenés conversaciones. Cuando te acepten en una carga, vas a poder chatear con el cliente acá.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversaciones.map((c) => (
              <Link
                key={c.postulacionId}
                href={`/transportista/conversaciones/${c.postulacionId}`}
                className="block rounded-xl border p-4 transition-colors hover:border-[var(--primary-27)]"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{c.contraparteNombre}</p>
                      {c.noLeidos > 0 && (
                        <span
                          className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: "#EF4444" }}
                        >
                          {c.noLeidos}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                      {c.origen} <span style={{ color: "var(--primary)" }}>→</span> {c.destino}
                    </p>
                    <p
                      className="text-sm mt-1.5 truncate"
                      style={{ color: c.noLeidos > 0 ? "#111827" : "#9CA3AF", fontWeight: c.noLeidos > 0 ? 600 : 400 }}
                    >
                      {c.ultimoMensaje ?? "Sin mensajes todavía — iniciá la conversación"}
                    </p>
                    {c.avisoVencimiento && (
                      <span
                        className="inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "#FFEDD5", color: "#9A3412" }}
                      >
                        {c.avisoVencimiento}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: "#9CA3AF" }}>
                    {c.ultimoMensajeEn.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
