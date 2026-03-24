// public/sw.js
// Service Worker — maneja push notifications, navegación y actualización de badge

const MANIFEST_URL = "/manifest.json";
let cachedManifest = null;

// ── Instalar y activar ───────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Activar el SW inmediatamente sin esperar a que cierren otras pestañas.
  // Esto es crítico para que el SW pueda recibir push aunque la app no esté abierta.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Tomar control de todas las pestañas abiertas inmediatamente.
  event.waitUntil(clients.claim());
});

// ── Fetch handler ────────────────────────────────────────────────────────────
// IMPORTANTE: este handler debe existir para que el navegador clasifique
// al SW como "funcional" y lo mantenga registrado para recibir eventos push
// incluso cuando ninguna pestaña de la app está abierta.
// Sin un fetch handler, algunos navegadores pueden descalificar el SW.
self.addEventListener("fetch", (event) => {
  // Pasamos todo al network sin hacer cache — solo necesitamos que el handler exista.
  // Si en el futuro querés agregar cache offline, este es el lugar.
  event.respondWith(
    fetch(event.request).catch(() => {
      // Si no hay red y el request falla, devolvemos una respuesta vacía
      // para no romper la app cuando está offline.
      return new Response("", { status: 503, statusText: "Service Unavailable" });
    })
  );
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
// Este evento se dispara aunque la app esté completamente cerrada.
// El navegador despierta el SW en background, ejecuta este handler,
// y muestra la notificación nativa del sistema operativo.
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
    tag:                data.tag || "notification",
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    Promise.all([
      // 1️⃣ Mostrar notificación nativa del sistema operativo.
      //    Esto funciona aunque la app esté cerrada — es el navegador quien la muestra.
      self.registration.showNotification(data.title, options),

      // 2️⃣ Si la app ESTÁ abierta en alguna pestaña, además mandar un mensaje
      //    al Navbar para que aparezca el toast in-app.
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
        // Si la app ya está abierta en alguna pestaña, enfocamos esa pestaña
        // y le mandamos el comando de navegación.
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: targetUrl });
            return;
          }
        }
        // Si la app está cerrada, la abrimos en una nueva pestaña.
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
