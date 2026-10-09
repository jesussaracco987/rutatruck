"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { CargaMapItem } from "./MapaCargas";
import CountdownTimer from "../[id]/_components/CountdownTimer";
import { getIconoCarga } from "@/lib/iconos-carga";
import BottomNavTransportista from "../../_components/BottomNavTransportista";
import FreeTierBanner from "@/app/_components/FreeTierBanner";
import { TIPO_CARGA_LABELS as TIPO_LABELS } from "@/lib/tipos-carga";

const MapaCargas = dynamic(() => import("./MapaCargas"), { ssr: false });
const MapaInline = dynamic(() => import("./MapaInline"), { ssr: false });

type PendientePago = {
  id: number;
  titulo: string;
  origen: string;
  destino: string;
  tipoCarga: string;
  presupuesto: number | null;
  transportistaPagoDeadline: string | null;
};

type CargaPrivada = {
  id: number;
  titulo: string;
  origen: string;
  destino: string;
  tipoCarga: string;
  presupuesto: number | null;
  fechaCarga: string;
  descripcion: string | null;
};

function OfertaPrivadaCard({ carga, onRespond }: { carga: CargaPrivada; onRespond: (id: number, accion: "aceptar" | "rechazar") => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#F0FFF4", borderColor: "#86EFAC" }}
    >
      <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ borderColor: "#86EFAC", backgroundColor: "#DCFCE7" }}>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#166534" }}>
          Oferta directa — Una empresa te solicitó
        </span>
      </div>
      <div className="p-4">
        <p className="font-bold text-gray-900 mb-1">{carga.origen} → {carga.destino}</p>
        <p className="text-sm text-gray-600 mb-1">{carga.titulo} · {TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <span>📅 {new Date(carga.fechaCarga).toLocaleDateString("es-AR")}</span>
          <span>💰 {carga.presupuesto !== null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"}</span>
        </div>
        {carga.descripcion && (
          <p className="text-xs text-gray-500 mb-3 italic">"{carga.descripcion}"</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => onRespond(carga.id, "aceptar"))}
            className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-opacity"
            style={{ backgroundColor: "var(--primary)", color: "#FFFFFF", opacity: pending ? 0.6 : 1 }}
          >
            {pending ? "..." : "✓ Aceptar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => onRespond(carga.id, "rechazar"))}
            className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-opacity"
            style={{ backgroundColor: "#FEE2E2", color: "#991B1B", opacity: pending ? 0.6 : 1 }}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  cargas: CargaMapItem[];
  yaPostuladoIds: number[];
  pendientesPago: PendientePago[];
  cargasPrivadas: CargaPrivada[];
  success?: string;
  pago?: string;
  freeTier: boolean;
  freeTierDias: number | null;
}

export default function CargasClientWrapper({
  cargas,
  yaPostuladoIds,
  pendientesPago,
  cargasPrivadas: initialPrivadas,
  success,
  pago,
  freeTier,
  freeTierDias,
}: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"listado" | "mapa">("listado");
  const [privadas, setPrivadas] = useState(initialPrivadas);
  const yaPostuladoSet = new Set(yaPostuladoIds);

  async function responderPrivada(id: number, accion: "aceptar" | "rechazar") {
    const res = await fetch(`/api/cargas/${id}/responder-privada`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    });
    if (res.ok) {
      setPrivadas((prev) => prev.filter((c) => c.id !== id));
      if (accion === "aceptar") router.push(`/transportista/cargas/${id}`);
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {/* ── Inline map (split view) ───────────────────────────────────────────── */}
      {viewMode === "listado" && (
        <div style={{ height: "42svh", flexShrink: 0 }}>
          <MapaInline cargas={cargas} yaPostuladoIds={yaPostuladoIds} />
        </div>
      )}

      {/* ── Toggle bar ───────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 border-b px-4"
        style={{ backgroundColor: "#F2F5F5", borderColor: "#E2E8E8", flexShrink: 0 }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-2 py-2.5">
          <button
            type="button"
            onClick={() => setViewMode("listado")}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: viewMode === "listado" ? "var(--primary)" : "transparent",
              color: viewMode === "listado" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Listado
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mapa")}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: viewMode === "mapa" ? "var(--primary)" : "transparent",
              color: viewMode === "mapa" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Mapa
          </button>
          <span className="ml-auto text-xs font-medium" style={{ color: "#9CA3AF" }}>
            {cargas.length} activa{cargas.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Scrollable list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-20">
          <main className="max-w-2xl mx-auto px-5 py-6 w-full">
            {freeTier && (
              <FreeTierBanner role="transportista" diasRestantes={freeTierDias} />
            )}

            {pago === "1" && (
              <div
                className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3 border"
                style={{ backgroundColor: "var(--primary-10)", borderColor: "var(--primary-20)" }}
              >
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                  ¡Comisión pagada! El viaje está activado.
                </p>
              </div>
            )}

            {success === "1" && (
              <div
                className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3 border"
                style={{ backgroundColor: "var(--primary-10)", borderColor: "var(--primary-20)" }}
              >
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                  ¡Postulación enviada! La empresa te contactará si te selecciona.
                </p>
              </div>
            )}

            {/* Ofertas directas */}
            {privadas.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#166534" }}>
                    Ofertas directas — {privadas.length} empresa{privadas.length !== 1 ? "s" : ""} te solicit{privadas.length !== 1 ? "aron" : "ó"}
                  </h2>
                </div>
                <div className="space-y-3">
                  {privadas.map((c) => (
                    <OfertaPrivadaCard key={c.id} carga={c} onRespond={responderPrivada} />
                  ))}
                </div>
              </div>
            )}

            {/* Pendientes de pago */}
            {pendientesPago.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#FB923C" }}>
                    Requieren pago — {pendientesPago.length} carga{pendientesPago.length !== 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="space-y-3">
                  {pendientesPago.map((carga) => (
                    <Link
                      key={carga.id}
                      href={`/transportista/cargas/${carga.id}`}
                      className="rounded-xl border block overflow-hidden transition-all hover:border-orange-400/40"
                      style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }}
                    >
                      <div className="px-4 py-2 flex items-center justify-between border-b" style={{ borderColor: "#FED7AA", backgroundColor: "#FEF3E2" }}>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#EA580C" }}>
                          Pendiente de pago
                        </span>
                        {carga.transportistaPagoDeadline && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <CountdownTimer deadline={carga.transportistaPagoDeadline} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-base font-bold text-gray-900 mb-1">
                          {carga.origen} → {carga.destino}
                        </p>
                        <p className="text-xs" style={{ color: "#9CA3AF" }}>
                          {carga.titulo} · {TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}
                          {` · ${carga.presupuesto !== null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"}`}
                        </p>
                      </div>
                      <div
                        className="px-4 py-2.5 text-center text-sm font-semibold"
                        style={{ backgroundColor: "#FB923C", color: "#FFFFFF" }}
                      >
                        Pagar comisión →
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Main cargas list */}
            {cargas.length === 0 ? (
              <div
                className="rounded-xl border p-12 text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
              >
                <p style={{ color: "#374151" }}>No hay cargas disponibles en este momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cargas.map((carga) => {
                  const yaPostulado = yaPostuladoSet.has(carga.id);
                  const emoji = getIconoCarga(carga.tipoCarga, carga.tipoCargaDetalle);
                  return (
                    <Link
                      key={carga.id}
                      href={`/transportista/cargas/${carga.id}`}
                      className="rounded-xl border block overflow-hidden hover:border-[var(--primary-33)] transition-all"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "var(--primary-13)" }}
                    >
                      <div className="p-5">
                        {yaPostulado && (
                          <div className="mb-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--primary-10)", color: "var(--primary)", border: "1px solid var(--primary-20)" }}>
                              ✓ Ya me postulé
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-4xl leading-none flex-shrink-0">{emoji}</span>
                            <div className="min-w-0">
                              <p className="text-xl font-black text-gray-900 leading-tight">{TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}</p>
                              {carga.tipoCargaDetalle && (
                                <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "#6B7280" }}>{carga.tipoCargaDetalle}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Precio</p>
                            <p className="text-lg font-black" style={{ color: "var(--primary)" }}>
                              {carga.presupuesto !== null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary)" }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Ruta</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 mb-4 leading-tight">
                          {carga.origen} <span style={{ color: "var(--primary)" }}>→</span> {carga.destino}
                        </p>

                        <div className="flex items-end justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>Camiones</p>
                            </div>
                            <p className="text-xl font-black" style={{ color: "var(--primary)" }}>
                              {carga.cantidadCamiones}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#6B7280" }}>Fecha</p>
                            <p className="text-sm font-bold text-gray-900">
                              {new Date(carga.fechaCarga).toLocaleDateString("es-AR")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="px-5 py-3.5 flex items-center justify-center gap-2 font-semibold text-sm"
                        style={{ backgroundColor: yaPostulado ? "var(--primary-27)" : "var(--primary)", color: yaPostulado ? "var(--primary)" : "#FFFFFF" }}
                      >
                        {yaPostulado ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                            </svg>
                            Ver mi postulación
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            Me interesa
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

      {/* ── Full map overlay ─────────────────────────────────────────────────── */}
      {viewMode === "mapa" && (
        <MapaCargas
          cargas={cargas}
          yaPostuladoIds={yaPostuladoIds}
          onClose={() => setViewMode("listado")}
        />
      )}

      <BottomNavTransportista />
    </div>
  );
}
