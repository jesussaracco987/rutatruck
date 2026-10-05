import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBell from "../_components/NotificacionBell";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import MarkNotificacionesVistas from "../_components/MarkNotificacionesVistas";
import { AutoRefresh } from "@/app/_components/AutoRefresh";
import FiltroEstado from "@/app/_components/FiltroEstado";

type EstadoConfig = {
  label: string;
  bg: string;
  text: string;
  dot: string;
  cardBg: string;
  cardBorder: string;
};

const ESTADO_CONFIG: Record<string, EstadoConfig> = {
  PENDIENTE_PAGO_TRANSPORTISTA: {
    label: "Pagar comisión",
    bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B",
    cardBg: "#FFFBEB", cardBorder: "#FDE68A",
  },
  ASIGNADA: {
    label: "En viaje",
    bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6",
    cardBg: "#EFF6FF", cardBorder: "#BFDBFE",
  },
  EN_CONFIRMACION: {
    label: "Esperando confirmación",
    bg: "#FFEDD5", text: "#9A3412", dot: "#F97316",
    cardBg: "#FFF7ED", cardBorder: "#FED7AA",
  },
  FINALIZADA: {
    label: "Viaje completado",
    bg: "#DCFCE7", text: "#166534", dot: "#22C55E",
    cardBg: "#F0FDF4", cardBorder: "#BBF7D0",
  },
  DISPUTA: {
    label: "En disputa",
    bg: "#F3E8FF", text: "#6B21A8", dot: "#A855F7",
    cardBg: "#FAF5FF", cardBorder: "#E9D5FF",
  },
};

const SORT_ORDER: Record<string, number> = {
  EN_CONFIRMACION: 0,
  DISPUTA: 1,
  ASIGNADA: 2,
  ACTIVA: 3,
  PENDIENTE_PAGO: 4,
  FINALIZADA: 5,
  CANCELADA: 6,
};

const FILTER_OPCIONES = [
  { value: "", label: "Todas", color: undefined },
  { value: "PAGAR", label: "Pagar comisión", color: "#F59E0B" },
  { value: "ASIGNADA", label: "En viaje", color: "#3B82F6" },
  { value: "EN_CONFIRMACION", label: "Aguardando conf.", color: "#F97316" },
  { value: "FINALIZADA", label: "Completadas", color: "#22C55E" },
  { value: "DISPUTA", label: "En disputa", color: "#A855F7" },
  { value: "PENDIENTE", label: "Sin respuesta", color: "#9CA3AF" },
  { value: "RECHAZADA", label: "No seleccionado", color: "#6B7280" },
];

function filtrarPostulaciones(postulaciones: any[], estado: string) {
  if (!estado) return postulaciones;
  if (estado === "PENDIENTE") return postulaciones.filter((p) => p.estado === "PENDIENTE");
  if (estado === "RECHAZADA") return postulaciones.filter((p) => p.estado === "RECHAZADA");
  if (estado === "PAGAR") return postulaciones.filter((p) => p.estado === "ACEPTADA" && p.matchConfirmadoEn === null && p.carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA");
  return postulaciones.filter((p) => p.estado === "ACEPTADA" && p.carga.estado === estado);
}

export default async function MisPostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await verifySession();
  const { estado: estadoFiltro = "" } = await searchParams;

  const postulaciones = await db.postulacion.findMany({
    where: { transportistaId: session.userId },
    include: {
      carga: {
        select: {
          id: true,
          titulo: true,
          origen: true,
          destino: true,
          fechaCarga: true,
          tipoCarga: true,
          presupuesto: true,
          estado: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const sorted = [...postulaciones].sort((a: any, b: any) => {
    if (a.estado === "RECHAZADA" && b.estado !== "RECHAZADA") return 1;
    if (a.estado !== "RECHAZADA" && b.estado === "RECHAZADA") return -1;
    const orderA = SORT_ORDER[a.carga.estado] ?? 9;
    const orderB = SORT_ORDER[b.carga.estado] ?? 9;
    return orderA - orderB;
  });

  const opcionesConCount = FILTER_OPCIONES.map((op) => ({
    ...op,
    count: op.value === "" ? postulaciones.length : filtrarPostulaciones(sorted, op.value).length,
  })).filter((op) => op.value === "" || op.count > 0);

  const visible = filtrarPostulaciones(sorted, estadoFiltro);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <AutoRefresh url="/api/postulaciones/hash" />
      <MarkNotificacionesVistas />
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <Link href="/transportista/dashboard">
          <LogoClickCargo />
        </Link>
        <div className="flex items-center gap-2">
          <NotificacionBell />
          <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-6">
          <Link
            href="/transportista/dashboard"
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
          <h1 className="text-3xl font-bold text-gray-900">Mis postulaciones</h1>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            {postulaciones.length} postulación{postulaciones.length !== 1 ? "es" : ""}
          </p>
        </div>

        {postulaciones.length > 0 && (
          <div className="mb-5">
            <FiltroEstado opciones={opcionesConCount} current={estadoFiltro} />
          </div>
        )}

        {postulaciones.length === 0 ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <p className="mb-4" style={{ color: "#374151" }}>Todavía no te postulaste a ninguna carga</p>
            <Link
              href="/transportista/cargas"
              className="font-medium rounded-lg px-6 py-2.5 transition-colors inline-block text-sm"
              style={{ backgroundColor: "var(--primary)", color: "#FFFFFF" }}
            >
              Ver cargas disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.length === 0 && (
              <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}>
                <p className="text-sm" style={{ color: "#6B7280" }}>No hay postulaciones con ese estado.</p>
              </div>
            )}
            {visible.map((p: any) => {
              const esAceptada = p.estado === "ACEPTADA";
              const esRechazada = p.estado === "RECHAZADA";
              const esPendiente = p.estado === "PENDIENTE";
              const esNueva = esAceptada && !p.vistaTransportista;
              // En la ronda de cobro, el que ya pagó su comisión espera a los demás.
              const cfg =
                p.carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA" && p.matchConfirmadoEn !== null
                  ? { ...ESTADO_CONFIG.PENDIENTE_PAGO_TRANSPORTISTA, label: "Comisión pagada" }
                  : ESTADO_CONFIG[p.carga.estado];

              const cardBg = esAceptada && cfg ? cfg.cardBg : "#FFFFFF";
              const cardBorder = esAceptada && cfg ? cfg.cardBorder : "#E2E8E8";

              return (
                <Link
                  key={p.id}
                  href={`/transportista/cargas/${p.carga.id}`}
                  className={`rounded-xl border block overflow-hidden transition-all hover:shadow-sm ${esRechazada ? "opacity-60" : ""}`}
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  {/* Franja superior de color para cargas aceptadas */}
                  {esAceptada && cfg && (
                    <div className="h-1" style={{ backgroundColor: cfg.dot }} />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Estado badge + nuevo */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {esNueva && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--primary-10)", color: "var(--primary)" }}>
                              ¡Nuevo!
                            </span>
                          )}
                          {esAceptada && cfg ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                              {cfg.label}
                            </span>
                          ) : esPendiente ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                              Pendiente de respuesta
                            </span>
                          ) : esRechazada ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                              No seleccionado
                            </span>
                          ) : null}
                        </div>

                        {/* Título */}
                        <p className="font-bold text-gray-900 leading-tight">{p.carga.titulo}</p>

                        {/* Ruta */}
                        <p className="text-sm mt-0.5" style={{ color: "#374151" }}>
                          {p.carga.origen}{" "}
                          <span style={{ color: "var(--primary)" }}>→</span>{" "}
                          {p.carga.destino}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>
                            {p.carga.fechaCarga.toLocaleDateString("es-AR")}
                          </span>
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>·</span>
                          <span className="text-xs capitalize" style={{ color: "#9CA3AF" }}>
                            {p.carga.tipoCarga}
                          </span>
                          {p.carga.presupuesto !== null && (
                            <>
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>·</span>
                              <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                                ${p.carga.presupuesto.toLocaleString("es-AR")}
                              </span>
                            </>
                          )}
                          {p.precioOfrecido != null && (
                            <>
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>·</span>
                              <span className="text-xs font-semibold" style={{ color: "#0369A1" }}>
                                Mi oferta: ${p.precioOfrecido.toLocaleString("es-AR")}/tn
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Flecha */}
                      <svg className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: "#9CA3AF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
