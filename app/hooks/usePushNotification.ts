"use client";

import { useEffect, useRef, useCallback } from "react";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";
const VAPID_PUBLIC ="BLR8fiu0VNED_-qHI0rOQn_UPEtJptD4wiYJXuBQxgBhFFRf_SvU54F95IBaBG86V-cv3wwZ4l_NlLD236io1rw";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function usePushNotifications() {
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        swRef.current = reg;
        console.log("[SW] Registrado:", reg.scope);

        navigator.serviceWorker.addEventListener(
          "message",
          (event: MessageEvent) => {
            if (event.data?.type === "NAVIGATE" && event.data?.url) {
              window.location.href = event.data.url;
            }
          },
        );
      })
      .catch((err) => console.error("[SW] Error registrando:", err));
  }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    if (!token || !VAPID_PUBLIC) {
      console.warn("[Push] Falta token o VAPID_PUBLIC_KEY");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("[Push] Permiso denegado");
        return false;
      }

      const reg = swRef.current ?? (await navigator.serviceWorker.ready);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      const res = await fetch(`${API}/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) throw new Error("Error guardando suscripción en servidor");

      console.log("[Push] Suscripción guardada ✅");
      return true;
    } catch (err) {
      console.error("[Push] Error al suscribirse:", err);
      return false;
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    try {
      const reg = swRef.current ?? (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return true;

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      if (token) {
        await fetch(`${API}/push/unsubscribe`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint }),
        });
      }

      console.log("[Push] Desuscripto ✅");
      return true;
    } catch (err) {
      console.error("[Push] Error al desuscribirse:", err);
      return false;
    }
  }, []);

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const reg = swRef.current ?? (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }, []);

  const saveLocation = useCallback(
    async (lat: number, lng: number): Promise<boolean> => {
      const token = getToken();
      if (!token) return false;
      try {
        const res = await fetch(`${API}/push/location`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lat, lng }),
        });
        return res.ok;
      } catch (err) {
        console.error("[Push] Error guardando ubicación:", err);
        return false;
      }
    },
    [],
  );

  const requestAndSaveLocation = useCallback(async (): Promise<{
    lat: number;
    lng: number;
  } | null> => {
    if (!("geolocation" in navigator)) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos: GeolocationPosition) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          await saveLocation(lat, lng);
          resolve({ lat, lng });
        },
        (err: GeolocationPositionError) => {
          console.warn("[Location] Error obteniendo ubicación:", err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 },
      );
    });
  }, [saveLocation]);

  return {
    subscribeToPush,
    unsubscribeFromPush,
    checkSubscription,
    saveLocation,
    requestAndSaveLocation,
  };
}
