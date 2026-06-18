// public/sw.js
// Service Worker — push notifications, navegación, badge

const MANIFEST_URL = "/manifest.json";
let cachedManifest = null;

// ── Instalar ──────────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  // Activar inmediatamente sin esperar que otras pestañas cierren
  self.skipWaiting();
});

// ── Activar ───────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  // Tomar control de todas las pestañas abiertas de inmediato
  event.waitUntil(clients.claim());
});

// ── Fetch — OBLIGATORIO para recibir push con app cerrada ─────────────────────
// Sin este handler, algunos navegadores no entregan push cuando la app está cerrada.
// No cacheamos nada, solo dejamos pasar todo al network.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response("", { status: 503, statusText: "Service Unavailable" })
    )
  );
});

// ── Helper: obtener ícono del manifest ───────────────────────────────────────
async function getIcon() {
  try {
    if (!cachedManifest) {
      const res = await fetch(MANIFEST_URL);
      if (res.ok) cachedManifest = await res.json();
    }
    if (cachedManifest?.icons?.length) {
      return cachedManifest.icons[0].src;
    }
  } catch (e) {
    console.warn("[SW] getIcon error:", e);
  }
  return "/assets/ofertas.webp";
}

// ── Push ──────────────────────────────────────────────────────────────────────
// Se dispara aunque la app esté completamente cerrada.
// El navegador despierta el SW en background, muestra la notificación nativa
// del SO y (si la app está abierta) manda un mensaje al Navbar para el toast.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Nueva notificación",
      body:  event.data.text(),
      url:   "/",
    };
  }

  const icon  = data.icon  || "/assets/ofertas.webp";
  const badge = data.badge || "/assets/ofertas.webp";

  const options = {
    body:    data.body  || "",
    icon,
    badge,
    image:   data.image || undefined,        // imagen grande en Android
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url:        data.url        || "/",
      badgeCount: data.badgeCount || 0,
    },
    actions: [
      { action: "open",    title: "Ver ahora" },
      { action: "dismiss", title: "Cerrar"    },
    ],
    tag:                data.tag                || "offertas-notif",
    renotify:           data.renotify           ?? true,
    requireInteraction: data.requireInteraction ?? false,
  };

  event.waitUntil(
    Promise.all([
      // 1️⃣ Notificación nativa del SO — visible aunque la app esté cerrada
      self.registration.showNotification(data.title || "Offertas", options),

      // 2️⃣ Si la app está abierta en alguna pestaña → toast in-app al Navbar
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type:  "PUSH_RECEIVED",
              title: data.title || "Nueva notificación",
              body:  data.body  || "",
              url:   data.url   || "/",
              icon,
            });
          });
        }),
    ])
  );
});

// ── Click en la notificación ──────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si la app ya está abierta, enfocarla y navegar
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: targetUrl });
            return;
          }
        }
        // Si la app está cerrada, abrirla
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Cierre de notificación ────────────────────────────────────────────────────
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notificación cerrada:", event.notification.tag);
});

// ── Background sync ───────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-orders") {
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({ type: "SYNC_ORDERS" });
          });
        })
    );
  }
});

// ── Mensajes desde el frontend ────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "CHECK_UPDATES") {
    event.waitUntil(
      fetch(MANIFEST_URL)
        .then((res) => res.json())
        .then((newManifest) => {
          cachedManifest = newManifest;
          event.ports[0]?.postMessage({ success: true, manifest: newManifest });
        })
        .catch((e) => {
          event.ports[0]?.postMessage({ success: false, error: e.message });
        })
    );
  }
});
