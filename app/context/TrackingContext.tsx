// app/context/TrackingContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./authContext";

type TrackFn = (event: string, props?: Record<string, any>) => void;

const TrackingContext = createContext<{ track: TrackFn, anonymousId: string }>(null as any);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [anonymousId, setAnonymousId] = useState("");

  useEffect(() => {
    // ANTI-DUPLICADO: Guardado en 2 lugares
    let anon = localStorage.getItem("_mr_anon") || document.cookie.match(/_mr_anon=([^;]+)/)?.[1];
    if (!anon) {
      anon = `anon_${uuidv4()}`;
      localStorage.setItem("_mr_anon", anon);
      document.cookie = `_mr_anon=${anon}; path=/; max-age=31536000; SameSite=Lax`;
    }
    setAnonymousId(anon);
  }, []);

  const track: TrackFn = (event, props = {}) => {
    if (!anonymousId) return;

    const payload = {
      business_id: props.businessId || "global",
      anonymous_id: anonymousId,
      user_id: (user as any)?._id || (user as any)?.id || null, // Si está logueado, se linkea solo
      event_name: event,
      properties: props,
      url: window.location.href,
      session_id: sessionStorage.getItem("_mr_sess") || (() => {
        const s = `sess_${uuidv4()}`;
        sessionStorage.setItem("_mr_sess", s);
        return s;
      })(),
    };

    // sendBeacon no se pierde aunque cierre la pestaña
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", JSON.stringify(payload));
    } else {
      fetch("/api/track", { method: "POST", body: JSON.stringify(payload), keepalive: true });
    }
  };

  return (
    <TrackingContext.Provider value={{ track, anonymousId }}>
      {children}
    </TrackingContext.Provider>
  );
}

export const useTracking = () => useContext(TrackingContext);
