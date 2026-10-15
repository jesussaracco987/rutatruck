import { NextRequest } from "next/server";
import { getSession } from "@/lib/dal";
import {
  sseSubscribe,
  sseUnsubscribe,
  notifyTransportista,
  notifyEmpresa,
  totalPendienteEmpresa,
  totalPendienteTransportista,
} from "@/lib/sse";
import { isTransportista, isEmpresa } from "@/lib/roles";

export const dynamic = "force-dynamic";
// Without this, Vercel's default serverless timeout (10s on Hobby) kills the
// stream before the first 10s poll tick even fires, forcing a client
// reconnect loop. 60s is the max allowed on Hobby; raise if the plan allows more.
export const maxDuration = 60;

/**
 * Cuentas EMPRESA_TRANSPORTISTA son ambos roles a la vez: `vista` indica en
 * qué sección está parado el usuario ahora (viene de AppShell/EventsProvider),
 * no reemplaza el chequeo de permiso. Sin esto, isTransportista() siempre
 * gana primero para esas cuentas y el lado empresa nunca se calculaba,
 * pasara lo que pasara en la URL.
 */
function resolverVista(role: string, vista: string | null): "empresa" | "transportista" | null {
  if (vista === "empresa" && isEmpresa(role)) return "empresa";
  if (vista === "transportista" && isTransportista(role)) return "transportista";
  if (isTransportista(role)) return "transportista";
  if (isEmpresa(role)) return "empresa";
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { userId, role } = session;
  const vista = resolverVista(role, new URL(req.url).searchParams.get("vista"));
  if (!vista) return new Response("Forbidden", { status: 403 });

  const esDual = role === "EMPRESA_TRANSPORTISTA";

  async function pushEstado() {
    if (vista === "transportista") {
      const otroRolPendiente = esDual ? await totalPendienteEmpresa(userId) : undefined;
      await notifyTransportista(userId, esDual ? { otroRolPendiente } : undefined);
    } else {
      const otroRolPendiente = esDual ? await totalPendienteTransportista(userId) : undefined;
      await notifyEmpresa(userId, esDual ? { otroRolPendiente } : undefined);
    }
  }

  let ctrl: ReadableStreamDefaultController<Uint8Array>;
  let pingId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      ctrl = controller;
      sseSubscribe(userId, vista, ctrl);

      // Send initial state immediately
      await pushEstado();

      // Recompute from DB every 10s instead of a plain keep-alive ping.
      // Deployed on Vercel, the request that mutates data (nueva postulación,
      // aceptación, etc.) can land on a different serverless instance than
      // the one holding this open connection, so the in-memory push in
      // lib/sse.ts silently misses it. Polling the real state from within
      // this same connection self-heals that within ~10s regardless of
      // which instance handled the write, and doubles as the keep-alive.
      pingId = setInterval(() => {
        (async () => {
          try {
            await pushEstado();
          } catch {
            clearInterval(pingId);
          }
        })();
      }, 10000);
    },
    cancel() {
      sseUnsubscribe(userId, vista, ctrl);
      clearInterval(pingId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
