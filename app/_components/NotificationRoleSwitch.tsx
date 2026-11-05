"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleSwitchOverlay } from "./SwitchRoleButton";

type Vista = "empresa" | "transportista";

// Una cuenta dual que está en una vista y toca una notificación de la otra
// cambiaba de vista sin aviso. El service worker (`notificationclick` en
// public/sw.js) detecta ese caso y, en vez de navegar él, le pide a la pestaña
// que lo haga: acá se muestra la misma transición que el SwitchRoleButton y
// después se navega. El ack por el MessagePort le avisa al SW que alguien
// atendió el pedido; sin ack (página vieja sin este componente) navega él.
export default function NotificationRoleSwitch() {
  const router = useRouter();
  const [toRole, setToRole] = useState<Vista | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "CAMBIO_DE_VISTA") return;
      const { url, toRole } = event.data as { url: string; toRole: Vista };
      event.ports[0]?.postMessage("ok");
      setToRole(toRole);
      setTimeout(() => {
        router.push(url);
        setTimeout(() => setToRole(null), 400);
      }, 700);
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return toRole ? <RoleSwitchOverlay toRole={toRole} /> : null;
}
