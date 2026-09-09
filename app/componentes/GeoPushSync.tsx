"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "../context/authContext";

const API = "https://new-backend-lovat.vercel.app/api";
const MIN_MOVE_METERS = 80;
const HEARTBEAT_MS = 15 * 60 * 1000;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GeoPushSync() {
  const { user, updateUser } = useAuth();
  const lastSentRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !user.locationEnabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let active = true;

    const syncPosition = async (lat: number, lng: number, force = false) => {
      if (!active || sendingRef.current) return;

      const last = lastSentRef.current;
      const moved = last
        ? haversineMeters(last.lat, last.lng, lat, lng)
        : Infinity;
      const stale = !last || Date.now() - last.at >= HEARTBEAT_MS;

      if (!force && moved < MIN_MOVE_METERS && !stale) return;

      const token = localStorage.getItem("marketplace_token");
      if (!token) return;

      sendingRef.current = true;
      try {
        const res = await fetch(`${API}/push-geo/location`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lat, lng }),
        });

        if (res.ok) {
          lastSentRef.current = { lat, lng, at: Date.now() };
          updateUser({ lat, lng, locationEnabled: true });
        }
      } catch (err) {
        console.warn("[GeoPush] No se pudo sincronizar ubicación", err);
      } finally {
        sendingRef.current = false;
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        syncPosition(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("[GeoPush] watchPosition:", err.message);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 12_000,
      },
    );

    const syncVisible = () => {
      if (document.visibilityState !== "visible") return;
      navigator.geolocation.getCurrentPosition(
        (pos) => syncPosition(pos.coords.latitude, pos.coords.longitude, true),
        () => {},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
      );
    };

    document.addEventListener("visibilitychange", syncVisible);

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", syncVisible);
    };
  }, [user?.id, user?.locationEnabled, updateUser]);

  return null;
}
