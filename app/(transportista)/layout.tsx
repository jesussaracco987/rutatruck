import PushNotificationSetup from "./transportista/_components/PushNotificationSetup";
import { AppShell } from "@/app/_components/AppShell";
import { EventsProvider } from "@/app/_components/EventsProvider";
import NotificationRoleSwitch from "@/app/_components/NotificationRoleSwitch";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import Link from "next/link";
import { esDisponibilidadVigente } from "@/lib/disponibilidad";

async function DisponibleBanner() {
  const session = await getSession();
  if (!session) return null;
  const disp = await db.disponibilidadTransportista.findFirst({
    where: { transportistaId: session.userId, activo: true },
    select: { disponibleHoy: true, actualizadoEn: true },
  });
  if (!disp) return null;

  const vigente = esDisponibilidadVigente(disp);

  return (
    <Link
      href="/transportista/disponibilidad"
      className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white"
      style={{ backgroundColor: vigente ? "#166534" : "#B45309" }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: vigente ? "#86EFAC" : "#FDE68A" }}
      />
      {vigente
        ? "Estás marcado como Disponible · Tocar para gestionar"
        : "Tu disponibilidad venció · Tocá para reactivarla"}
    </Link>
  );
}

export default function TransportistaGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EventsProvider vista="transportista">
      <PushNotificationSetup />
      <NotificationRoleSwitch />
      <AppShell role="transportista" banner={<DisponibleBanner />}>
        {children}
      </AppShell>
    </EventsProvider>
  );
}
