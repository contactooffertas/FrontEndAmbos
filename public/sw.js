// public/sw.js
// Service Worker — maneja push notifications y navegación al hacer click

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Recibir push del servidor ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Nueva notificación", body: event.data.text(), url: "/" };
  }

  const options = {
    body:  data.body  || "",
    icon:  data.icon  || "/icon.png",
    badge: data.badge || "/badge.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
    actions: [
      { action: "open",    title: "Ver ahora" },
      { action: "dismiss", title: "Cerrar"    },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Click en la notificación ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una pestaña abierta de la app, enfocarla y navegar
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: targetUrl });
            return;
          }
        }
        // Si no hay pestaña abierta, abrir una nueva
        return clients.openWindow(targetUrl);
      })
  );
});