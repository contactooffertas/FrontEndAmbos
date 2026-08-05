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

self.addEventListener("fetch", () => {
  // sin intervención — dejar pasar todo al network normalmente
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

// ── Helper: actualizar badge del ícono (como WhatsApp) ───────────────────────
// Solo tiene efecto si la PWA está instalada (agregada a inicio / como app).
// En una pestaña normal del navegador la Badging API no hace nada, es
// limitación del navegador, no del código.
async function updateBadge(count) {
  if (!("setAppBadge" in self.registration)) return;
  try {
    if (count > 0) {
      await self.registration.setAppBadge(count);
    } else {
      await self.registration.clearAppBadge();
    }
  } catch (e) {
    console.warn("[SW] updateBadge error:", e);
  }
}

// ── Push ──────────────────────────────────────────────────────────────────────
// Se dispara aunque la app esté completamente cerrada.
// El navegador despierta el SW en background, muestra la notificación nativa
// del SO, actualiza el badge del ícono y (si la app está abierta) manda un
// mensaje al Navbar para el toast.
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

  const icon  = data.icon  || "/assets/offerton-192.png";
  const badge = data.badge || "/assets/offerton-512.png";

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

      // 2️⃣ Badge en el ícono de la app instalada (número, como WhatsApp)
      updateBadge(data.badgeCount || 1),

      // 3️⃣ Si la app está abierta en alguna pestaña → toast in-app al Navbar
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
    Promise.all([
      // Limpiar el badge al interactuar con la notificación
      updateBadge(0),

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
        }),
    ])
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

  if (event.data?.type === "CLEAR_BADGE") {
    event.waitUntil(updateBadge(0));
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
