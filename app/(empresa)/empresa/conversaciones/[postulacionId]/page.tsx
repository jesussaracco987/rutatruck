import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import NotificacionBellEmpresa from "../../_components/NotificacionBellEmpresa";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import ChatThread from "@/app/_components/ChatThread";
import { findPostulacionParaChat, findMensajesDeHilo } from "@/lib/repositories/mensaje.repository";
import { labelChatPorVencer } from "@/lib/chat";
import { participantesDelHilo } from "@/lib/services/mensaje.service";

export default async function EmpresaConversacionPage({
  params,
}: {
  params: Promise<{ postulacionId: string }>;
}) {
  const session = await verifySession();
  const { postulacionId: postulacionIdParam } = await params;
  const postulacionId = parseInt(postulacionIdParam);
  if (isNaN(postulacionId)) redirect("/empresa/conversaciones");

  const postulacion = await findPostulacionParaChat(postulacionId, session.userId);
  if (!postulacion || postulacion.carga.empresaId !== session.userId) {
    redirect("/empresa/conversaciones");
  }

  const { carga } = postulacion;
  const mensajes = await findMensajesDeHilo(postulacionId);
  const avisoVencimiento = labelChatPorVencer(carga);
  const participantes = participantesDelHilo(postulacion);
  const nombres = Object.fromEntries(participantes.map((p) => [p.id, p.nombre]));

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="flex-shrink-0 border-b px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <LogoClickCargo />
        <div className="flex items-center gap-2">
          <NotificacionBellEmpresa />
          <HamburgerMenu role="empresa" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      <div
        className="flex-shrink-0 border-b px-5 py-3 flex items-center gap-3"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
      >
        <Link
          href="/empresa/conversaciones"
          className="flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0"
          style={{ borderColor: "var(--primary)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--primary)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">
            {postulacion.miembros.length > 0
              ? `Grupo de ${postulacion.transportista.name} (${postulacion.miembros.length + 1})`
              : postulacion.transportista.name}
          </p>
          <Link
            href={`/empresa/cargas/${carga.id}`}
            className="text-xs truncate block transition-opacity hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            {carga.titulo}
          </Link>
        </div>
        {avisoVencimiento && (
          <span
            className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: "#FFEDD5", color: "#9A3412" }}
          >
            {avisoVencimiento}
          </span>
        )}
      </div>

      {/* `key` fuerza remount al cambiar de hilo: React no desmonta cuando sólo
          cambia un parámetro de ruta, y ChatThread mergea `initialMensajes` por
          id sin mirar el postulacionId (y `lastIdRef` tampoco se resetea), así
          que reusar la instancia arrastraría los mensajes del hilo previo. */}
      <ChatThread
        key={postulacion.id}
        postulacionId={postulacion.id}
        currentUserId={session.userId}
        nombres={nombres}
        initialMensajes={mensajes.map((m) => ({
          id: m.id,
          autorId: m.autorId,
          cuerpo: m.cuerpo,
          creadoEn: m.creadoEn.toISOString(),
          leidoEn: m.leidoEn ? m.leidoEn.toISOString() : null,
        }))}
      />
    </div>
  );
}
