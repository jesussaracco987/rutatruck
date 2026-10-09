import type { CSSProperties } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBellEmpresa from "../_components/NotificacionBellEmpresa";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import FiltroEstado from "@/app/_components/FiltroEstado";
import FreeTierBanner from "@/app/_components/FreeTierBanner";
import { getIconoCarga } from "@/lib/iconos-carga";
import { FREE_TIER, diasRestantesFreeTier } from "@/lib/free-tier";
import { TIPO_CARGA_LABELS as TIPO_LABELS } from "@/lib/tipos-carga";

type EstadoConfig = {
  label: string;
  badgeStyle: CSSProperties;
  cardBorder: string;
  dot: string;
  hex: string;
};

const ESTADO_CONFIG: Record<string, EstadoConfig> = {
  PENDIENTE_PAGO: {
    label: "Pago pendiente",
    badgeStyle: {
      backgroundColor: "#FEF9C3",
      color: "#A16207",
      border: "1px solid #FEF08A",
    },
    cardBorder: "#FEF08A",
    dot: "bg-yellow-400",
    hex: "#FCD34D",
  },
  ACTIVA: {
    label: "Activa",
    badgeStyle: {
      backgroundColor: "#DCFCE7",
      color: "#15803D",
      border: "1px solid #BBF7D0",
    },
    cardBorder: "#BBF7D0",
    dot: "bg-green-400",
    hex: "#4ADE80",
  },
  PENDIENTE_PAGO_TRANSPORTISTA: {
    label: "Esperando pago",
    badgeStyle: {
      backgroundColor: "#FEF9C3",
      color: "#A16207",
      border: "1px solid #FEF08A",
    },
    cardBorder: "#FEF08A",
    dot: "bg-yellow-400",
    hex: "#FCD34D",
  },
  ASIGNADA: {
    label: "En viaje",
    badgeStyle: {
      backgroundColor: "#DBEAFE",
      color: "#1D4ED8",
      border: "1px solid #BFDBFE",
    },
    cardBorder: "#BFDBFE",
    dot: "bg-blue-400",
    hex: "#60A5FA",
  },
  EN_CONFIRMACION: {
    label: "Confirmar completado",
    badgeStyle: {
      backgroundColor: "#FFEDD5",
      color: "#C2410C",
      border: "1px solid #FED7AA",
    },
    cardBorder: "#FED7AA",
    dot: "bg-orange-400",
    hex: "#FB923C",
  },
  FINALIZADA: {
    label: "Finalizada",
    badgeStyle: {
      backgroundColor: "#F3F4F6",
      color: "#4B5563",
      border: "1px solid #E5E7EB",
    },
    cardBorder: "#E5E7EB",
    dot: "bg-gray-600",
    hex: "#9CA3AF",
  },
  CANCELADA: {
    label: "Cancelada",
    badgeStyle: {
      backgroundColor: "#FEE2E2",
      color: "#B91C1C",
      border: "1px solid #FECACA",
    },
    cardBorder: "#FECACA",
    dot: "bg-red-400",
    hex: "#F87171",
  },
  DISPUTA: {
    label: "En disputa",
    badgeStyle: {
      backgroundColor: "#F3E8FF",
      color: "#7E22CE",
      border: "1px solid #E9D5FF",
    },
    cardBorder: "#E9D5FF",
    dot: "bg-purple-400",
    hex: "#C084FC",
  },
};

export default async function CargasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; estado?: string }>;
}) {
  const session = await verifySession();
  const { success, error, estado: estadoFiltro = "" } = await searchParams;

  // Las CANCELADA se muestran a propósito: el cron las purga a los pocos días,
  // así que las que llegan acá siguen dentro de la ventana de reactivación.
  const cargas = await db.carga.findMany({
    where: {
      empresaId: session.userId,
      estado: { notIn: ["FINALIZADA"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { postulaciones: { where: { estado: "PENDIENTE" } } } },
    },
  });

  const enConfirmacion = cargas.filter((c) => c.estado === "EN_CONFIRMACION");
  const canceladas = cargas.filter((c) => c.estado === "CANCELADA");
  const resto = cargas.filter(
    (c) => c.estado !== "EN_CONFIRMACION" && c.estado !== "CANCELADA",
  );
  const sorted = [...enConfirmacion, ...resto, ...canceladas];

  const estadosCounts = cargas.reduce(
    (acc, c) => {
      acc[c.estado] = (acc[c.estado] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const filterOpciones = [
    { value: "", label: "Todas", count: cargas.length },
    ...Object.entries(estadosCounts).map(([estado, count]) => ({
      value: estado,
      label: ESTADO_CONFIG[estado]?.label ?? estado,
      count,
      activeStyle: ESTADO_CONFIG[estado]?.badgeStyle,
    })),
  ];

  const visible = estadoFiltro
    ? sorted.filter((c) => c.estado === estadoFiltro)
    : sorted;

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
          <HamburgerMenu
            role="empresa"
            isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/empresa/dashboard"
            className="inline-flex items-center gap-2 mb-4 font-semibold text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            <span
              className="flex items-center justify-center w-8 h-8 rounded-full border-2"
              style={{ borderColor: "var(--primary)" }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </span>
            Volver al panel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Mis cargas</h1>
          <p className="text-base mt-1.5" style={{ color: "#374151" }}>
            {cargas.length} carga{cargas.length !== 1 ? "s" : ""} publicada
            {cargas.length !== 1 ? "s" : ""}
          </p>
        </div>

        {FREE_TIER && (
          <FreeTierBanner role="empresa" diasRestantes={diasRestantesFreeTier()} />
        )}

        {cargas.length > 0 && (
          <div className="mb-5">
            <FiltroEstado opciones={filterOpciones} current={estadoFiltro} />
          </div>
        )}

        {success === "1" && (
          <div
            className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3 border"
            style={{
              backgroundColor: "var(--primary-10)",
              borderColor: "var(--primary-20)",
            }}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "var(--primary)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              ¡Carga publicada exitosamente! Los transportistas ya pueden verla.
            </p>
          </div>
        )}

        {error === "pago" && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-red-300">
              Hubo un problema al procesar el pago. Si fue debitado, contactá a
              soporte.
            </p>
          </div>
        )}

        {cargas.length === 0 ? (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <p className="mb-6" style={{ color: "#374151" }}>
              Todavía no publicaste cargas
            </p>
            <Link
              href="/empresa/cargas/nueva"
              className="inline-flex items-center gap-2 font-semibold rounded-xl px-6 py-3.5 transition-opacity hover:opacity-90 text-sm"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--text-white)",
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Publicar primera carga
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.length === 0 && (
              <div
                className="rounded-xl border p-10 text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
              >
                <p className="text-sm" style={{ color: "#374151" }}>
                  No hay cargas con ese estado.
                </p>
              </div>
            )}
            {visible.map((carga: any) => {
              const cfg = ESTADO_CONFIG[carga.estado] ?? {
                label: carga.estado,
                badgeStyle: {
                  backgroundColor: "#F3F4F6",
                  color: "#4B5563",
                  border: "1px solid #E5E7EB",
                },
                cardBorder: "#E5E7EB",
                dot: "bg-gray-600",
              };
              const pendientes = carga._count.postulaciones;
              const needsAction = carga.estado === "EN_CONFIRMACION";

              const emoji = getIconoCarga(
                carga.tipoCarga,
                carga.tipoCargaDetalle,
              );

              return (
                <Link
                  key={carga.id}
                  href={`/empresa/cargas/${carga.id}`}
                  className={`rounded-xl border block overflow-hidden transition-all ${needsAction ? "ring-1 ring-orange-500/40" : ""}`}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: cfg.cardBorder,
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}
                          />
                          <h3 className="font-semibold text-gray-900 truncate">
                            {carga.titulo}
                          </h3>
                        </div>
                        <p
                          className="text-sm ml-4"
                          style={{ color: "#374151" }}
                        >
                          {carga.origen}{" "}
                          <span style={{ color: "var(--primary)" }}>→</span>{" "}
                          {carga.destino}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
                        style={cfg.badgeStyle}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 ml-4">
                      <div className="flex items-start gap-2">
                        <span className="text-xl leading-none flex-shrink-0">
                          {emoji}
                        </span>
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                            style={{ color: "#6B7280" }}
                          >
                            Tipo
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>
                            Camiones
                          </p>
                          <p className="text-sm font-bold text-gray-900">{carga.cantidadCamiones}</p>
                        </div>
                      </div>
                      {carga.peso !== null && (
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-0.5 flex-shrink-0"
                            style={{ color: "var(--primary)" }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                              />
                            </svg>
                          </span>
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                              style={{ color: "#6B7280" }}
                            >
                              Peso
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {carga.peso}{" "}
                              {carga.pesoUnidad === "kg"
                                ? "kg"
                                : carga.pesoUnidad === "bulto"
                                  ? "bultos"
                                  : "tn"}
                            </p>
                          </div>
                        </div>
                      )}
                      {carga.presupuesto !== null && (
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-0.5 flex-shrink-0"
                            style={{ color: "var(--primary)" }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </span>
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                              style={{ color: "#6B7280" }}
                            >
                              Precio
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "var(--primary)" }}
                            >
                              ${carga.presupuesto.toLocaleString("es-AR")}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex-shrink-0"
                          style={{ color: "var(--primary)" }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </span>
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                            style={{ color: "#6B7280" }}
                          >
                            Fecha
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {carga.fechaCarga.toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-5 py-3.5 flex items-center justify-center gap-2 font-semibold text-sm"
                    style={
                      needsAction
                        ? { backgroundColor: "#FB923C", color: "#fff" }
                        : pendientes > 0
                          ? {
                              backgroundColor: "var(--primary)",
                              color: "var(--text-white)",
                            }
                          : {
                              backgroundColor: "var(--primary)",
                              color: "var(--text-white)",
                            }
                    }
                  >
                    {needsAction ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Confirmar viaje completado
                      </>
                    ) : pendientes > 0 ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Ver {pendientes} postulaci
                        {pendientes === 1 ? "ón" : "ones"}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Ver carga
                      </>
                    )}
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
