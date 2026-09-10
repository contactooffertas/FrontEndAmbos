// app/context/TrackingContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "./authContext";

type TrackFn = (event: string, props?: Record<string, any>) => void;

const API = "https://new-backend-lovat.vercel.app/api";

// Generador de ID sin librerías externas
const genId = (prefix = "") => {
  // Usa la API nativa del navegador, 100% compatible
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}${crypto.randomUUID()}`;
  }
  // Fallback si el navegador es viejo
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

const TrackingContext = createContext<{ track: TrackFn, anonymousId: string }>({
  track: () => {},
  anonymousId: ""
});

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [anonymousId, setAnonymousId] = useState("");

  useEffect(() => {
    let anon = localStorage.getItem("_mr_anon") || document.cookie.match(/_mr_anon=([^;]+)/)?.[1];
    if (!anon) {
      anon = genId("anon_");
      localStorage.setItem("_mr_anon", anon);
      document.cookie = `_mr_anon=${anon}; path=/; max-age=31536000; SameSite=Lax`;
    }
    setAnonymousId(anon);
    // Crea session si no existe
    if (!sessionStorage.getItem("_mr_sess")) {
      sessionStorage.setItem("_mr_sess", genId("sess_"));
    }
  }, []);

  const track: TrackFn = useCallback((event, props = {}) => {
    if (!anonymousId) return;
    const payload = {
      business_id: props.businessId || "global",
      anonymous_id: anonymousId,
      user_id: (user as any)?._id || (user as any)?.id || null,
      event_name: event,
      properties: props,
      url: typeof window !== 'undefined' ? window.location.href : '',
      session_id: typeof window !== 'undefined' ? sessionStorage.getItem("_mr_sess") : '',
    };

    const url = `${API}/tracking/event`;
    const body = JSON.stringify(payload);

    try {
      if (navigator.sendBeacon) {
        // OJO: sendBeacon con un string manda Content-Type: text/plain
        // y express.json() no lo parsea. Hay que forzar un Blob con
        // el mimetype correcto para que el backend reciba el body.
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon(url, blob);
        if (!ok) {
          // Si sendBeacon falla (payload muy grande, etc.), fallback a fetch
          fetch(url, {
            method: "POST",
            body,
            keepalive: true,
            headers: { "Content-Type": "application/json" },
          }).catch(() => {});
        }
      } else {
        fetch(url, {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }
    } catch (e) {
      console.error("track error", e);
    }
  }, [anonymousId, user]);

  useEffect(() => {
    if (!anonymousId || typeof window === "undefined") return;
    const qs = searchParams?.toString() || "";
    const params = new URLSearchParams(qs);
    const startedAt = Date.now();
    const referrer = document.referrer || "direct";
    const source = params.get("utm_source") || (referrer === "direct" ? "direct" : referrer);
    const medium = params.get("utm_medium") || "";
    const campaign = params.get("utm_campaign") || "";
    const isAndroidApp = /RosarioMarketAndroid\//i.test(navigator.userAgent || "");

    track("page_enter", {
      source,
      referrer,
      utm_source: params.get("utm_source") || undefined,
      utm_medium: medium || undefined,
      utm_campaign: campaign || undefined,
      landing_path: pathname || "/",
      platform: isAndroidApp ? "android_app" : "web",
    });

    return () => {
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      track("page_leave", { seconds, landing_path: pathname || "/", platform: isAndroidApp ? "android_app" : "web" });
    };
  }, [anonymousId, pathname, searchParams, track]);

  return (
    <TrackingContext.Provider value={{ track, anonymousId }}>
      {children}
    </TrackingContext.Provider>
  );
}

export const useTracking = () => useContext(TrackingContext);
