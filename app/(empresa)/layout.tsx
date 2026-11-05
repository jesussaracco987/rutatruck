import PushNotificationSetup from "../(transportista)/transportista/_components/PushNotificationSetup";
import { AppShell } from "@/app/_components/AppShell";
import { EventsProvider } from "@/app/_components/EventsProvider";
import NotificationRoleSwitch from "@/app/_components/NotificationRoleSwitch";

export default function EmpresaGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EventsProvider vista="empresa">
      <PushNotificationSetup />
      <NotificationRoleSwitch />
      <AppShell role="empresa">{children}</AppShell>
    </EventsProvider>
  );
}
