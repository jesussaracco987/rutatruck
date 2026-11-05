const CACHE_VERSION = "v2";
const CACHE_NAME = `clickcargo-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// La rama `navigate` de abajo cachea el HTML de cada página visitada, incluidas
// las autenticadas. Cache Storage es por origen, no por sesión: en un teléfono
// compartido, el usuario siguiente podía ver páginas cacheadas del anterior.
// Al llegar al login (logout explícito o sesión vencida) se purga todo lo que
// no sea el app shell ni un asset con hash — esos son públicos e inmutables, y
// borrarlos rompería el modo offline, porque `install` ya no vuelve a correr.
function esAssetPublico(pathname) {
  return pathname.startsWith("/_next/static/") || APP_SHELL.includes(pathname);
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PURGE_AUTHED_CACHE") return;
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      await Promise.all(
        keys
          .filter((req) => !esAssetPublico(new URL(req.url).pathname))
          .map((req) => cache.delete(req)),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Las navegaciones cliente del App Router no pegan a /api/: piden la propia
  // ruta (p.ej. /transportista/conversaciones?_rsc=<hash>) con fetch(), así que
  // `request.mode` es "cors" y caían en el stale-while-revalidate de abajo, que
  // devuelve la copia vieja al instante. Eso servía payloads RSC viejos y
  // anulaba los router.refresh() de ChatThread y EventsProvider — el chat sólo
  // se veía al día tras una recarga manual (esa sí es mode "navigate").
  // El hash de _rsc es determinístico, así que la entrada vieja se reusaba
  // siempre. Estos pedidos van siempre a la red.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title ?? "ClickCargo";
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    data: { url: data.url ?? "/" },
    // Sin tag cada push apila una notificación nueva: diez mensajes de un chat
    // eran diez avisos. La url identifica el destino (hilo o carga), así que
    // sirve de clave para que el nuevo reemplace al anterior en vez de sumarse.
    tag: data.tag ?? data.url ?? "clickcargo",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// El navegador puede rotar/expirar la subscription push sin avisar a la
// pestaña (ni siquiera hace falta que la app esté abierta). Sin este handler,
// la única forma de renovarla es que PushNotificationSetup vuelva a correr,
// o sea que el usuario abra la app — hasta entonces no le llega ningún push.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : undefined)
      .then((subscription) => {
        const json = subscription.toJSON();
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          }),
        });
      })
      .catch(() => {})
  );
});

function vistaDe(url) {
  const { origin, pathname } = new URL(url);
  if (origin !== self.location.origin) return null;
  if (pathname.startsWith("/empresa")) return "empresa";
  if (pathname.startsWith("/transportista")) return "transportista";
  return null;
}

// Una cuenta dual (EMPRESA_TRANSPORTISTA) en la vista empresa que toca un aviso
// de carga pasa a la vista transportista. En vez de navegar acá, se le pide a
// la pestaña que lo haga con la transición de "Cambiando a …"
// (NotificationRoleSwitch). Resuelve false si la página no contesta — p.ej. una
// versión vieja sin el listener — y entonces navega el SW como antes.
function pedirCambioDeVista(client, url, toRole) {
  return new Promise((resolve) => {
    const canal = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 1000);
    canal.port1.onmessage = () => { clearTimeout(timer); resolve(true); };
    const { pathname, search, hash } = new URL(url);
    client.postMessage({ type: "CAMBIO_DE_VISTA", url: pathname + search + hash, toRole }, [canal.port2]);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url ?? "/";
  const url = rawUrl.startsWith("http") ? rawUrl : self.location.origin + rawUrl;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      const existing = list.find((c) => c.url.startsWith(self.location.origin) && "focus" in c);
      if (!existing) return clients.openWindow(url);
      existing.focus();
      const desde = vistaDe(existing.url);
      const hacia = vistaDe(url);
      if (desde && hacia && desde !== hacia && (await pedirCambioDeVista(existing, url, hacia))) return;
      return existing.navigate(url);
    })
  );
});
