// app/context/TrackingContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";

type TrackFn = (event: string, props?: Record<string, any>) => void;

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

  const track: TrackFn = (event, props = {}) => {
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

    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", body);
      } else {
        fetch("/api/track", { method: "POST", body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) {
      console.error("track error", e);
    }
  };

  return (
    <TrackingContext.Provider value={{ track, anonymousId }}>
      {children}
    </TrackingContext.Provider>
  );
}

export const useTracking = () => useContext(TrackingContext);
