import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBell from "../../_components/NotificacionBell";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import { isFlota } from "@/lib/roles";
import PostularseButton from "./_components/PostularseButton";
import CompletarViajeButton from "./_components/CompletarViajeButton";
import AbrirDisputaTransportistaButton from "./_components/AbrirDisputaTransportistaButton";
import PagarComisionButton from "./_components/PagarComisionButton";
import CountdownTimer from "./_components/CountdownTimer";
import { AutoRefresh } from "@/app/_components/AutoRefresh";
import { getComisionConfig, calcularComisionPostulacion } from "@/lib/comision";
import { resolverRondaPago } from "@/lib/services/comision.service";
import RatingChip from "@/app/_components/RatingChip";
import ResenaForm from "@/app/_components/ResenaForm";
import { findResenasEscritasEnCarga } from "@/lib/repositories/resena.repository";
import { esMatchConfirmado } from "@/lib/match";
import { TIPO_CARGA_LABELS as TIPO_LABELS } from "@/lib/tipos-carga";

export default async function CargaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; pago?: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const { error, pago } = await searchParams;

  const cargaId = parseInt(id);
  if (isNaN(cargaId)) redirect("/transportista/cargas");

  const [carga, miPostulacion, user] = await Promise.all([
    db.carga.findUnique({
      where: { id: cargaId },
      include: {
        empresa: {
          select: { id: true, name: true, ratingPromedio: true, ratingCantidad: true },
        },
      },
    }),
    db.postulacion.findUnique({
      where: { cargaId_transportistaId: { cargaId, transportistaId: session.userId } },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: { email: true, phone: true, emailVerified: true },
    }),
  ]);

  if (!carga || carga.estado === "PENDIENTE_PAGO" || carga.estado === "CANCELADA") {
    redirect("/transportista/cargas");
  }

  // Expiración perezosa de la ronda de cobro. Con el plazo vencido
  // resolverRondaPago siempre saca a la carga de PENDIENTE_PAGO_TRANSPORTISTA,
  // así que el redirect no puede entrar en loop.
  if (
    carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA" &&
    carga.transportistaPagoDeadline &&
    carga.transportistaPagoDeadline < new Date()
  ) {
    await resolverRondaPago(cargaId);
    redirect(`/transportista/cargas/${cargaId}`);
  }

  const soyAceptado = miPostulacion?.estado === "ACEPTADA";
  const soyAsignado = carga.transportistaAsignadoId === session.userId || soyAceptado;

  // La comisión es por postulación: cada aceptado paga la suya, y el que ya
  // pagó espera a que paguen los demás de la convocatoria.
  const enRondaPago = carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA" && soyAceptado;
  const pendePago = enRondaPago && !esMatchConfirmado(miPostulacion);
  const esperandoOtrosPagos = enRondaPago && esMatchConfirmado(miPostulacion);
  const puedeCompletar = soyAsignado && carga.estado === "ASIGNADA";
  const puedeDisputa = soyAsignado && (carga.estado === "ASIGNADA" || carga.estado === "EN_CONFIRMACION");
  const esperandoConfirmacion = soyAsignado && carga.estado === "EN_CONFIRMACION";
  const puedeCalificar = soyAsignado && carga.estado === "FINALIZADA";

  const yaCalifiqueEmpresa =
    puedeCalificar &&
    (await findResenasEscritasEnCarga(cargaId, session.userId)).some(
      (r) => r.destinatarioId === carga.empresaId,
    );

  let montoComision = 0;
  if (pendePago) {
    const config = await getComisionConfig();
    montoComision = calcularComisionPostulacion(
      config,
      carga.presupuesto,
      miPostulacion.camionesCubiertos,
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      {soyAsignado && <AutoRefresh url={`/api/cargas/${cargaId}/estado`} />}
      <header
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}
      >
        <Link href="/transportista/dashboard">
          <LogoClickCargo />
        </Link>
        <div className="flex items-center gap-2">
          <NotificacionBell />
          <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/transportista/cargas"
            className="inline-flex items-center gap-2 mb-4 font-semibold text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2" style={{ borderColor: "var(--primary)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            Cargas disponibles
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{carga.titulo}</h1>
          <p className="mt-1.5 text-base" style={{ color: "#374151" }}>
            {carga.origen} <span style={{ color: "var(--primary)" }}>→</span> {carga.destino}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: "#6B7280" }}>
              Publicado por{" "}
              <Link
                href={`/perfil/${carga.empresaId}`}
                className="font-medium text-gray-900 underline decoration-dotted underline-offset-4 hover:opacity-70"
              >
                {carga.empresa.name}
              </Link>
            </span>
            <RatingChip
              promedio={carga.empresa.ratingPromedio}
              cantidad={carga.empresa.ratingCantidad}
            />
          </div>
          <div
            className="mt-4 inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 border"
            style={{ backgroundColor: "var(--primary-10)", borderColor: "var(--primary-20)" }}
          >
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            <span className="font-semibold text-base" style={{ color: "var(--primary)" }}>
              {carga.cantidadCamiones} {carga.cantidadCamiones === 1 ? "camión necesario" : "camiones necesarios"}
            </span>
          </div>
        </div>

        {pago === "1" && (
          <div
            className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3 border"
            style={{ backgroundColor: "var(--primary-10)", borderColor: "var(--primary-20)" }}
          >
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              {carga.estado === "PENDIENTE_PAGO_TRANSPORTISTA"
                ? "¡Comisión pagada!"
                : "¡Comisión pagada! El viaje está activado."}
            </p>
          </div>
        )}

        {error === "pago_fuera_de_termino" && (
          <div className="mb-6 rounded-xl border px-4 py-3" style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}>
            <p className="text-sm" style={{ color: "#B91C1C" }}>
              Tu pago se acreditó, pero el plazo para pagar ya había vencido y perdiste el lugar en la carga.
              Escribinos desde <Link href="/reporte" className="underline">Reportar un problema</Link> para gestionar la devolución.
            </p>
          </div>
        )}

        {error === "pago_cancelado" && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
            <p className="text-sm text-yellow-300">El pago fue cancelado. Podés intentarlo nuevamente.</p>
          </div>
        )}

        {/* Sección de pago de comisión */}
        {pendePago && carga.transportistaPagoDeadline && (
          <div
            className="rounded-xl border p-5 mb-6"
            style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">¡Fuiste seleccionado!</h2>
              <div className="flex items-center gap-2 text-sm" style={{ color: "#9CA3AF" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <CountdownTimer deadline={carga.transportistaPagoDeadline.toISOString()} />
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: "#9CA3AF" }}>
              Pagá la comisión para activar el viaje. Si no pagás a tiempo, perdés tu lugar en la carga.
              {miPostulacion && miPostulacion.camionesCubiertos > 1 &&
                ` La comisión es por camión: cubrís ${miPostulacion.camionesCubiertos}.`}
            </p>
            <PagarComisionButton cargaId={carga.id} montoComision={montoComision} />
          </div>
        )}

        {esperandoOtrosPagos && (
          <div
            className="rounded-xl border px-4 py-3 mb-6"
            style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)" }}
          >
            <p className="text-sm" style={{ color: "#374151" }}>
              Pagaste tu comisión. El viaje se activa cuando paguen los demás transportistas de la convocatoria.
            </p>
          </div>
        )}

        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <h2 className="font-medium text-gray-900 mb-4">Detalles de la carga</h2>
          <div className="space-y-2">
            {[
              ["Tipo", TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga],
              carga.tipoCargaDetalle ? ["Especificación", carga.tipoCargaDetalle] : null,
              carga.volumen !== null ? ["Volumen", `${carga.volumen} m³`] : null,
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

        {soyAceptado && miPostulacion && esMatchConfirmado(miPostulacion) && (
          <Link
            href={`/transportista/conversaciones/${miPostulacion.id}`}
            className="rounded-xl border p-6 mb-6 flex items-center gap-4 transition-colors hover:border-[var(--primary-27)]"
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
              <p className="font-medium" style={{ color: "var(--primary)" }}>
                Chat con {carga.contactoNombre}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#374151" }}>
                Coordiná los detalles del viaje desde la app
              </p>
            </div>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--primary)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {(puedeCompletar || puedeDisputa || esperandoConfirmacion) && (
          <div className="space-y-3 mb-6">
            {esperandoConfirmacion && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <p className="text-sm text-orange-700 font-medium">
                  Marcaste este viaje como completado. Esperando confirmación de la empresa.
                </p>
              </div>
            )}
            {puedeCompletar && <CompletarViajeButton cargaId={carga.id} />}
            {puedeDisputa && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E2E8E8" }}>
                <p className="text-sm mb-3" style={{ color: "#9CA3AF" }}>¿Tuviste algún inconveniente?</p>
                <AbrirDisputaTransportistaButton cargaId={carga.id} />
              </div>
            )}
          </div>
        )}

        {soyAsignado && carga.estado === "FINALIZADA" && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-green-700 font-medium">
              Viaje completado y confirmado por la empresa.
            </p>
          </div>
        )}

        {puedeCalificar && (
          <div
            className="rounded-xl border p-6 mb-6"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <h2 className="font-medium text-gray-900 mb-1">Calificá el viaje</h2>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
              Contá cómo fue trabajar con esta empresa. Ayuda al resto de los transportistas.
            </p>
            {yaCalifiqueEmpresa ? (
              <div
                className="rounded-xl border px-4 py-3"
                style={{ backgroundColor: "var(--primary-5)", borderColor: "var(--primary-20)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                  Ya calificaste a {carga.empresa.name}
                </p>
              </div>
            ) : (
              <ResenaForm
                cargaId={carga.id}
                destinatarioId={carga.empresaId}
                destinatarioNombre={carga.empresa.name}
                tipo="A_EMPRESA"
              />
            )}
          </div>
        )}

        {soyAsignado && carga.estado === "DISPUTA" && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-purple-300 font-medium mb-1">Disputa abierta</p>
            {carga.disputaDescripcion && (
              <p className="text-sm text-purple-200">{carga.disputaDescripcion}</p>
            )}
          </div>
        )}

        {!soyAsignado && (
          <PostularseButton
            cargaId={carga.id}
            miPostulacion={miPostulacion}
            contactoDefecto={{ email: user?.email ?? "", telefono: user?.phone ?? "" }}
            cantidadCamiones={carga.cantidadCamiones ?? 1}
            esFlota={isFlota(session.role, session.esFlota)}
            pesoUnidad={carga.pesoUnidad}
            emailVerified={user?.emailVerified ?? true}
          />
        )}
      </main>
    </div>
  );
}
