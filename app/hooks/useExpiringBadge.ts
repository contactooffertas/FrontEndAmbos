"use client";
// app/hooks/useExpiringBadge.ts

import { useEffect, useRef, useState } from "react";

const DEFAULT_WINDOW_MS = 3 * 60 * 1000; // 3 minutos

interface StoredState {
  baseline: number;      // último valor ya "reconocido" (no se vuelve a mostrar)
  windowStart: number | null; // cuándo arrancó la ventana de 3 minutos actual
  lastRaw: number;        // último valor crudo visto, para detectar nuevos incrementos
}

function loadState(key: string): StoredState {
  if (typeof window === "undefined") return { baseline: 0, windowStart: null, lastRaw: 0 };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { baseline: 0, windowStart: null, lastRaw: 0 };
    const parsed = JSON.parse(raw);
    return {
      baseline: typeof parsed.baseline === "number" ? parsed.baseline : 0,
      windowStart: typeof parsed.windowStart === "number" ? parsed.windowStart : null,
      lastRaw: typeof parsed.lastRaw === "number" ? parsed.lastRaw : 0,
    };
  } catch {
    return { baseline: 0, windowStart: null, lastRaw: 0 };
  }
}

function saveState(key: string, state: StoredState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage lleno o bloqueado: no rompemos nada, el badge simplemente no persiste.
  }
}

export function useExpiringBadge(key: string, rawValue: number, windowMs: number = DEFAULT_WINDOW_MS): number {
  const [display, setDisplay] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const safeRaw = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 0;

    const recompute = () => {
      let state = loadState(key);

      // Subió por encima de la base reconocida -> arranca (o extiende) la ventana.
      if (safeRaw > state.baseline && (state.windowStart === null || safeRaw > state.lastRaw)) {
        state = { baseline: state.baseline, windowStart: Date.now(), lastRaw: safeRaw };
        saveState(key, state);
      }

      const delta = Math.max(0, safeRaw - state.baseline);

      if (delta === 0) {
        setDisplay(0);
        return;
      }

      const elapsed = state.windowStart !== null ? Date.now() - state.windowStart : windowMs;
      if (elapsed >= windowMs) {
        // Se cumplieron los 3 minutos: reconocer y volver a 0.
        state = { baseline: safeRaw, windowStart: null, lastRaw: safeRaw };
        saveState(key, state);
        setDisplay(0);
      } else {
        setDisplay(delta);
      }
    };

    recompute();
    intervalRef.current = setInterval(recompute, 5_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [key, rawValue, windowMs]);

  return display;
}
