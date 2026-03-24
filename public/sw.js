// public/sw.js
// Service Worker — maneja push notifications, navegación y actualización de badge

const MANIFEST_URL = "/manifest.json";
let cachedManifest = null;

// ── Instalar y activar ───────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Obtener manifest.json para leer el logo dinámico ─────────────────────────
async function getManifestIcon() {
  try {
    if (!cachedManifest) {
      const res = await fetch(MANIFEST_URL);
      if (res.ok) cachedManifest = await res.json();
    }
    if (cachedManifest?.icons && cachedManifest.icons.length > 0) {
      return cachedManifest.icons[0].src || "/assets/offerton.jpg";
    }
  } catch (e) {
    console.warn("Error al obtener manifest:", e);
  }
  return "/assets/offerton.jpg";
}

// ── Recibir push del servidor ────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Nueva notificación",
      body: event.data.text(),
      url: "/",
    };
  }

  const icon  = "/assets/offerton.jpg";
  const badge = "/assets/offerton.jpg";

  const options = {
    body:   data.body || "",
    icon:   icon,
    badge:  badge,
    vibrate: [100, 50, 100],
    data: {
      url:        data.url || "/",
      badgeCount: data.badgeCount,
    },
    actions: [
      { action: "open",    title: "Ver ahora" },
      { action: "dismiss", title: "Cerrar"    },
    ],
    tag:                 data.tag || "notification",
    requireInteraction:  data.requireInteraction || false,
  };

  event.waitUntil(
    Promise.all([
      // 1️⃣ Notificación nativa — funciona aunque la app esté cerrada
      self.registration.showNotification(data.title, options),

      // 2️⃣ Si la app está abierta, mandar toast al Navbar
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type:  "PUSH_RECEIVED",
              title: data.title || "Nueva notificación",
              body:  data.body  || "",
              url:   data.url   || "/",
              icon:  icon,
            });
          });
        }),
    ])
  );
});

// ── Click en la notificación ─────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: targetUrl });
            return;
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Close/dismiss notificación ───────────────────────────────────────────────
self.addEventListener("notificationclose", (event) => {
  console.log("Notificación cerrada:", event.notification.tag);
});

// ── Sincronización en background ────────────────────────────────────────────
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

// ── Message handler ──────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
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
