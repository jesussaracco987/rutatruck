import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import SeleccionarButton from "./_components/SeleccionarButton";
import CerrarConvocatoriaButton from "./_components/CerrarConvocatoriaButton";
import EditarCargaPanel from "./_components/EditarCargaPanel";
import ConfirmarCompletadoButton from "./_components/ConfirmarCompletadoButton";
import AbrirDisputaEmpresaButton from "./_components/AbrirDisputaEmpresaButton";
import ReintentarPagoButton from "./_components/ReintentarPagoButton";
import CancelarCargaButton from "./_components/CancelarCargaButton";
import ReactivarCargaButton from "./_components/ReactivarCargaButton";
import RepetirCargaButton from "./_components/RepetirCargaButton";
import NotificacionBellEmpresa from "../../_components/NotificacionBellEmpresa";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import { AutoRefresh } from "@/app/_components/AutoRefresh";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import RatingChip from "@/app/_components/RatingChip";
import BadgeVerificado from "@/app/_components/BadgeVerificado";
import ResenaForm from "@/app/_components/ResenaForm";
import { findResenasEscritasEnCarga } from "@/lib/repositories/resena.repository";
import { DIAS_GRACIA_CANCELADA, DIAS_EN_CONFIRMACION_ABANDONADA } from "@/lib/plazos";
import { esMatchConfirmado } from "@/lib/match";

const ESTADO_LABELS: Record<string, { label: string; badgeStyle: CSSProperties }> = {
  PENDIENTE_PAGO: { label: "Pago pendiente", badgeStyle: { backgroundColor: "#FEF9C3", color: "#A16207", border: "1px solid #FEF08A" } },
  ACTIVA: { label: "Activa", badgeStyle: { backgroundColor: "#DCFCE7", color: "#15803D", border: "1px solid #BBF7D0" } },
  PENDIENTE_PAGO_TRANSPORTISTA: { label: "Esperando pago", badgeStyle: { backgroundColor: "#FEF9C3", color: "#A16207", border: "1px solid #FEF08A" } },
  ASIGNADA: { label: "Asignada", badgeStyle: { backgroundColor: "#DBEAFE", color: "#1D4ED8", border: "1px solid #BFDBFE" } },
  EN_CONFIRMACION: { label: "Esperando confirmación", badgeStyle: { backgroundColor: "#FFEDD5", color: "#C2410C", border: "1px solid #FED7AA" } },
  FINALIZADA: { label: "Finalizada", badgeStyle: { backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #E5E7EB" } },
  CANCELADA: { label: "Cancelada", badgeStyle: { backgroundColor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECACA" } },
  DISPUTA: { label: "En disputa", badgeStyle: { backgroundColor: "#F3E8FF", color: "#7E22CE", border: "1px solid #E9D5FF" } },
};

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

/** Días que faltan para que se cumpla un plazo de `dias` contado desde `desde`. */
function diasHasta(desde: Date, dias: number): number {
  const vence = desde.getTime() + dias * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((vence - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default async function CargaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const { error } = await searchParams;

  const cargaId = parseInt(id);
  if (isNaN(cargaId)) redirect("/empresa/cargas");

  const carga = await db.carga.findUnique({
    where: { id: cargaId, empresaId: session.userId },
    include: {
      postulaciones: {
        include: {
          transportista: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              emailVerified: true,
              ratingPromedio: true,
              ratingCantidad: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!carga) redirect("/empresa/cargas");

  const resenasEscritas = await findResenasEscritasEnCarga(cargaId, session.userId);
  const yaCalifique = new Set(resenasEscritas.map((r) => r.destinatarioId));

  // Mark new postulaciones as seen by empresa
  await db.postulacion.updateMany({
    where: { cargaId, estado: "PENDIENTE", vistaEmpresa: false },
    data: { vistaEmpresa: true },
  });

  const estado = ESTADO_LABELS[carga.estado] ?? {
    label: carga.estado,
    badgeStyle: { backgroundColor: "#F3F4F6", color: "#4B5563", border: "1px solid #E5E7EB" },
  };

  // Los asignados salen de las postulaciones ACEPTADA, no del escalar
  // transportistaAsignadoId: cuando la convocatoria la cubren varios
  // transportistas, ese campo solo guarda a uno.
  const asignados = carga.postulaciones
    .filter((p) => p.estado === "ACEPTADA")
    .map((p) => {
      // Contacto y chat se habilitan juntos, recién con el match pago. Es por
      // transportista: en una convocatoria cada uno paga su comisión.
      const confirmado = esMatchConfirmado(p);
      return {
      postulacionId: p.id,
      id: p.transportista.id,
      name: p.transportista.name,
      confirmado,
      email: confirmado ? (p.contactoEmail ?? p.transportista.email) : null,
      phone: confirmado ? (p.contactoTelefono ?? p.transportista.phone) : null,
      camionesCubiertos: p.camionesCubiertos ?? 1,
      emailVerified: p.transportista.emailVerified,
      ratingPromedio: p.transportista.ratingPromedio,
      ratingCantidad: p.transportista.ratingCantidad,
      };
    });
  const sinPagar = asignados.filter((t) => !t.confirmado);

  const puedeEditar = carga.estado === "ACTIVA";
  const puedeCancelar = carga.estado === "ACTIVA";
  const pendientePago = carga.estado === "PENDIENTE_PAGO";
  const puedeConfirmar = carga.estado === "EN_CONFIRMACION";
  const puedeDisputa = carga.estado === "ASIGNADA" || carga.estado === "EN_CONFIRMACION";
  const esperandoPagoTransportista = carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA";
  const puedeCalificar = carga.estado === "FINALIZADA" && asignados.length > 0;

  // Una CANCELADA vive DIAS_GRACIA_CANCELADA días desde su updatedAt (el
  // momento en que se canceló) y después la purga el cron. Mientras dura esa
  // ventana la empresa puede devolverla al ruedo con una fecha nueva.
  // Una cancelada sin pagar no se puede reactivar: volvería a ACTIVA sin pasar
  // por el checkout. Para esas el camino es "Repetir carga".
  const estaCancelada = carga.estado === "CANCELADA" && carga.disputaAbiertaPor === null;
  const puedeReactivar = estaCancelada && carga.pagado;
  const diasParaBorrado = diasHasta(carga.updatedAt, DIAS_GRACIA_CANCELADA);

  // Mismo reloj del lado de EN_CONFIRMACION: pasado el plazo, el cron
  // cerrar-viajes-abandonados la finaliza sin la confirmación de la empresa.
  const diasParaCierreAutomatico = diasHasta(
    carga.updatedAt,
    DIAS_EN_CONFIRMACION_ABANDONADA,
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <AutoRefresh url={`/api/cargas/${carga.id}/estado`} />
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

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/empresa/cargas"
            className="inline-flex items-center gap-2 mb-4 font-semibold text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2" style={{ borderColor: "var(--primary)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            Mis cargas
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">{carga.titulo}</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={estado.badgeStyle}>
              {estado.label}
            </span>
          </div>
          <p className="mt-1.5 text-base" style={{ color: "#374151" }}>
            {carga.origen} <span style={{ color: "var(--primary)" }}>→</span> {carga.destino}
          </p>
        </div>

        {error === "pago_cancelado" && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-yellow-300">
              El pago fue cancelado. Podés intentarlo nuevamente.
            </p>
          </div>
        )}

        {puedeConfirmar && (
          <div
            className="mb-6 rounded-xl border px-4 py-3"
            style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }}
          >
            <p className="text-sm" style={{ color: "#C2410C" }}>
              {diasParaCierreAutomatico > 0
                ? `El transportista marcó el viaje como completado. Si no confirmás ni abrís una disputa, se cierra automáticamente en ${diasParaCierreAutomatico} ${diasParaCierreAutomatico === 1 ? "día" : "días"}.`
                : "El transportista marcó el viaje como completado. Se cierra automáticamente en las próximas horas si no confirmás ni abrís una disputa."}
            </p>
          </div>
        )}

        {estaCancelada && (
          <div
            className="mb-6 rounded-xl border px-4 py-3"
            style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}
          >
            <p className="text-sm" style={{ color: "#B91C1C" }}>
              {diasParaBorrado > 0
                ? `Esta carga está cancelada y se elimina en ${diasParaBorrado} ${diasParaBorrado === 1 ? "día" : "días"}. `
                : "Esta carga está cancelada y se elimina en las próximas horas. "}
              {puedeReactivar
                ? "Reactivala con una fecha nueva si querés volver a publicarla."
                : "El pago de la publicación nunca se completó, así que no se puede reactivar: usá “Repetir carga” para publicarla de nuevo."}
            </p>
          </div>
        )}

        <div
          className="rounded-xl border p-5 mb-6"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <h2 className="font-medium text-gray-900 mb-4">Acciones</h2>
          <div className="flex flex-wrap gap-3">
            {pendientePago && (
              <>
                <ReintentarPagoButton cargaId={carga.id} />
                <CancelarCargaButton cargaId={carga.id} />
              </>
            )}
            {puedeReactivar && <ReactivarCargaButton cargaId={carga.id} />}
            {(puedeEditar || puedeCancelar) && (
              <EditarCargaPanel
                sinTransportista={carga.transportistaAsignadoId === null}
                carga={{
                  id: carga.id,
                  origen: carga.origen,
                  destino: carga.destino,
                  cantidadCamiones: carga.cantidadCamiones,
                  tipoCarga: carga.tipoCarga,
                  tipoCargaDetalle: carga.tipoCargaDetalle ?? null,
                  peso: carga.peso,
                  pesoUnidad: carga.pesoUnidad ?? null,
                  presupuesto: carga.presupuesto,
                  fechaCarga: toDateInput(carga.fechaCarga),
                  fechaCupo: toDateInput(carga.fechaCupo),
                  preferenciaCamion: carga.preferenciaCamion,
                  descripcion: carga.descripcion,
                  contactoNombre: carga.contactoNombre,
                  contactoTelefono: carga.contactoTelefono,
                  contactoEmail: carga.contactoEmail,
                }}
              />
            )}
            {puedeConfirmar && <ConfirmarCompletadoButton cargaId={carga.id} />}
            <RepetirCargaButton
              carga={{
                origen: carga.origen,
                origenLat: carga.origenLat,
                origenLng: carga.origenLng,
                destino: carga.destino,
                destinoLat: carga.destinoLat,
                destinoLng: carga.destinoLng,
                tipoCarga: carga.tipoCarga,
                tipoCargaDetalle: carga.tipoCargaDetalle ?? null,
                peso: carga.peso,
                pesoUnidad: carga.pesoUnidad ?? null,
                cantidadCamiones: carga.cantidadCamiones,
                presupuesto: carga.presupuesto,
                preferenciaCamion: carga.preferenciaCamion,
                descripcion: carga.descripcion,
                contactoNombre: carga.contactoNombre,
                contactoTelefono: carga.contactoTelefono,
                contactoEmail: carga.contactoEmail,
              }}
            />
          </div>
        </div>

        {esperandoPagoTransportista && sinPagar.length > 0 && carga.transportistaPagoDeadline && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-yellow-300 font-medium mb-1">
              Esperando pago de comisión
            </p>
            <p className="text-sm text-yellow-200">
              <strong>{sinPagar.map((t) => t.name).join(", ")}</strong>{" "}
              {sinPagar.length === 1 ? "tiene" : "tienen"} hasta las{" "}
              {carga.transportistaPagoDeadline.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} del{" "}
              {carga.transportistaPagoDeadline.toLocaleDateString("es-AR")} para pagar la comisión y activar el viaje.
              {sinPagar.length === 1
                ? " Si no paga, la carga vuelve a estar disponible para que aceptes a otro transportista."
                : " Los que no paguen quedan afuera y la carga vuelve a estar disponible para que aceptes reemplazos."}
            </p>
          </div>
        )}

        {carga.estado === "EN_CONFIRMACION" && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <p className="text-sm text-orange-700 font-medium">
              El transportista marcó el viaje como completado. ¿Podés confirmarlo?
            </p>
          </div>
        )}

        {carga.estado === "DISPUTA" && carga.disputaDescripcion && (
          <div className="mb-6 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-purple-300 font-medium mb-1">
              Disputa abierta por {carga.disputaAbiertaPor === "EMPRESA" ? "vos" : "el transportista"}
            </p>
            <p className="text-sm text-purple-200">{carga.disputaDescripcion}</p>
          </div>
        )}

        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <h2 className="font-medium text-gray-900 mb-4">Datos de la carga</h2>
          <div className="space-y-2">
            {[
              ["Tipo de carga", carga.tipoCarga],
              carga.tipoCargaDetalle ? ["Especificación", carga.tipoCargaDetalle] : null,
              carga.peso !== null ? [carga.pesoUnidad === "kg" ? "kg" : carga.pesoUnidad === "bulto" ? "Bulto" : "Tonelada", `${carga.peso} ${carga.pesoUnidad === "kg" ? "kg" : carga.pesoUnidad === "bulto" ? "bultos" : "tn"}`] : null,
              ["Presupuesto", carga.presupuesto !== null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"],
              ["Fecha de carga", carga.fechaCarga.toLocaleDateString("es-AR")],
              carga.fechaCupo
                ? ["Fecha de cupo", carga.fechaCupo.toLocaleDateString("es-AR")]
                : null,
              carga.preferenciaCamion ? ["Preferencia de camión", carga.preferenciaCamion] : null,
              carga.descripcion ? ["Descripción", carga.descripcion] : null,
            ]
              .filter((item): item is string[] => Array.isArray(item))
              .map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-1.5 border-b last:border-0"
                  style={{ borderColor: "#E2E8E8" }}
                >
                  <span className="text-sm" style={{ color: "#374151" }}>{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
          </div>
        </div>

        {asignados.length > 0 && (
          <div
            className="rounded-xl border p-6 mb-6"
            style={{ backgroundColor: "#FFFFFF", borderColor: "var(--primary-20)" }}
          >
            <h2 className="font-medium text-gray-900 mb-3">
              {asignados.length === 1 ? "Transportista asignado" : `Transportistas asignados (${asignados.length})`}
            </h2>
            {asignados.map((t) => (
              <div key={t.id} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/perfil/${t.id}`}
                    className="font-medium text-gray-900 underline decoration-dotted underline-offset-4 hover:opacity-70"
                  >
                    {t.name}
                  </Link>
                  <RatingChip promedio={t.ratingPromedio} cantidad={t.ratingCantidad} />
                  <BadgeVerificado verificado={t.emailVerified} />
                  {t.camionesCubiertos > 1 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}>
                      {t.camionesCubiertos} camiones
                    </span>
                  )}
                </div>
                {t.confirmado ? (
                  <>
                    <p className="text-sm mt-0.5" style={{ color: "#374151" }}>{t.email}</p>
                    {t.phone && (
                      <p className="text-sm" style={{ color: "#374151" }}>{t.phone}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
                    Los datos de contacto y el chat se habilitan cuando pague la comisión.
                  </p>
                )}
              </div>
            ))}
            {/* Un hilo por transportista: en una convocatoria de varios camiones
                cada uno tiene su conversación aparte con la empresa. */}
            {asignados.filter((t) => t.confirmado).map((t) => (
              <Link
                key={t.postulacionId}
                href={`/empresa/conversaciones/${t.postulacionId}`}
                className="mt-4 flex items-center gap-4 rounded-xl border p-4 transition-colors hover:border-[var(--primary-27)]"
                style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)" }}
              >
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--primary-13)" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="var(--primary)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--primary)" }}>
                    Chat con {t.name}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: "#374151" }}>
                    Coordiná los detalles del viaje desde la app
                  </p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--primary)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          {/* Header con contador de camiones */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-medium text-gray-900">
                Postulaciones
                {carga.postulaciones.length > 0 && (
                  <span className="ml-2 text-sm font-normal" style={{ color: "#6B7280" }}>
                    ({carga.postulaciones.length})
                  </span>
                )}
              </h2>
              {carga.cantidadCamiones > 1 && (() => {
                const cubiertos = carga.postulaciones
                  .filter((p: any) => p.estado === "ACEPTADA")
                  .reduce((sum: number, p: any) => sum + (p.camionesCubiertos ?? 1), 0);
                const pct = Math.min(100, Math.round((cubiertos / carga.cantidadCamiones) * 100));
                return (
                  <div className="mt-2">
                    <p className="text-sm mb-1.5" style={{ color: cubiertos >= carga.cantidadCamiones ? "var(--primary)" : "#374151" }}>
                      <span className="font-semibold">{cubiertos}</span> de{" "}
                      <span className="font-semibold">{carga.cantidadCamiones}</span> camiones cubiertos
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8E8", width: "160px" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cubiertos >= carga.cantidadCamiones ? "var(--primary)" : "#F59E0B" }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
            {carga.estado === "ACTIVA" && carga.postulaciones.some((p: any) => p.estado === "ACEPTADA") && (
              <CerrarConvocatoriaButton cargaId={carga.id} />
            )}
          </div>

          {carga.postulaciones.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "#6B7280" }}>
              Todavía no hay postulaciones para esta carga.
            </p>
          ) : (
            <div className="space-y-3">
              {carga.postulaciones.map((p: any) => (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 ${p.estado === "RECHAZADA" ? "opacity-50" : ""}`}
                  style={{
                    borderColor: p.estado === "ACEPTADA" ? "var(--primary-20)" : "#E2E8E8",
                    backgroundColor: p.estado === "ACEPTADA" ? "var(--primary-5)" : "#FAFAFA",
                  }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/perfil/${p.transportista.id}`}
                            className="font-medium text-gray-900 underline decoration-dotted underline-offset-4 hover:opacity-70"
                          >
                            {p.transportista.name}
                          </Link>
                          <RatingChip
                            promedio={p.transportista.ratingPromedio}
                            cantidad={p.transportista.ratingCantidad}
                          />
                          <BadgeVerificado verificado={p.transportista.emailVerified} />
                          {p.camionesCubiertos > 1 && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}>
                              {p.camionesCubiertos} camiones
                            </span>
                          )}
                          {p.precioOfrecido != null && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--primary-10)", color: "var(--primary)" }}>
                              ${p.precioOfrecido.toLocaleString("es-AR")}/tn
                            </span>
                          )}
                        </div>
                        {/* El contacto de los aceptados se muestra arriba, en
                            "Transportista asignado", una vez confirmado el viaje. */}
                        {p.estado === "PENDIENTE" && (
                          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                            Vas a ver sus datos de contacto cuando lo selecciones.
                          </p>
                        )}
                        {p.mensaje && (
                          <p className="text-sm mt-2 italic" style={{ color: "#6B7280" }}>
                            "{p.mensaje}"
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                          Postulado el {p.createdAt.toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {p.estado === "ACEPTADA" && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--primary-13)", color: "var(--primary)" }}>
                            ✓ Aceptado
                          </span>
                        )}
                        {p.estado === "RECHAZADA" && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>
                            No seleccionado
                          </span>
                        )}
                      </div>
                    </div>
                    {p.estado === "PENDIENTE" && carga.estado === "ACTIVA" && (
                      <SeleccionarButton
                        cargaId={carga.id}
                        postulacionId={p.id}
                        transportistaNombre={p.transportista.name}
                        camionesCubiertos={p.camionesCubiertos ?? 1}
                        cantidadCamionesTotal={carga.cantidadCamiones}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {puedeCalificar && (
          <div
            className="rounded-xl border p-6 mt-6"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <h2 className="font-medium text-gray-900 mb-1">Calificá el viaje</h2>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
              Tu calificación ayuda a que otras empresas sepan con quién están tratando.
            </p>
            <div className="space-y-4">
              {asignados.map((t) =>
                yaCalifique.has(t.id) ? (
                  <div
                    key={t.id}
                    className="rounded-xl border px-4 py-3"
                    style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)" }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                      Ya calificaste a {t.name}
                    </p>
                  </div>
                ) : (
                  <ResenaForm
                    key={t.id}
                    cargaId={carga.id}
                    destinatarioId={t.id}
                    destinatarioNombre={t.name}
                    tipo="A_TRANSPORTISTA"
                  />
                ),
              )}
            </div>
          </div>
        )}

        {puedeDisputa && (
          <div className="mt-10 pt-6 border-t" style={{ borderColor: "#E2E8E8" }}>
            <p className="text-sm mb-3" style={{ color: "#9CA3AF" }}>¿Tuviste algún inconveniente?</p>
            <AbrirDisputaEmpresaButton cargaId={carga.id} />
          </div>
        )}
      </main>
    </div>
  );
}
