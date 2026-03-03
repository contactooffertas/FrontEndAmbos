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
      if (res.ok) {
        cachedManifest = await res.json();
      }
    }
    // Retornar el primer icono del manifest o un icono por defecto
    if (cachedManifest?.icons && cachedManifest.icons.length > 0) {
      return cachedManifest.icons[0].src || "/icon.png";
    }
  } catch (e) {
    console.warn("Error al obtener manifest:", e);
  }
  return "/icon.png";
}

// ── Actualizar badge en el icono de la PWA (servidor) ───────────────────────
async function updateBadgeAPI(userId, count) {
  try {
    const token = localStorage?.getItem?.("marketplace_token") || "";
    if (!token) return;
    await fetch("https://new-backend-lovat.vercel.app/api/notification/update-badge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ count }),
    });
  } catch (e) {
    console.warn("Error al actualizar badge en servidor:", e);
  }
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

  // 🔴 Si el push contiene un contador de órdenes/notificaciones, actualizar badge
  if (data.badgeCount !== undefined) {
    updateBadgeAPI(data.userId, data.badgeCount);
  }

  const icon = data.icon || "/icon.png";
  const badge = data.badge || "/icon.png";

  const options = {
    body: data.body || "",
    icon: icon,
    badge: badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      badgeCount: data.badgeCount,
    },
    actions: [
      { action: "open", title: "Ver ahora" },
      { action: "dismiss", title: "Cerrar" },
    ],
    tag: data.tag || "notification", // Agrupar notificaciones del mismo tipo
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    Promise.all([
      // 1️⃣ Mostrar notificación nativa del sistema
      self.registration.showNotification(data.title, options),

      // 2️⃣ Notificar a todas las pestañas/ventanas abiertas
      //    para que el Navbar muestre el toast en tiempo real
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: "PUSH_RECEIVED",
              title: data.title || "Nueva notificación",
              body: data.body || "",
              url: data.url || "/",
              icon: data.icon || "/icon.png",
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
        // Si ya hay una pestaña o ventana PWA abierta, enfocarla y navegar
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: targetUrl });
            return;
          }
        }
        // Si no hay ventana abierta (app cerrada), abrir una nueva
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Close/dismiss notificación (botón cerrar) ────────────────────────────────
self.addEventListener("notificationclose", (event) => {
  console.log("Notificación cerrada:", event.notification.tag);
});

// ── Sincronización en background (opcional) ─────────────────────────────────
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

// ── Message handler (opcional para comunicación directa) ────────────────────
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

