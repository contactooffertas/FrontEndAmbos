"use client";

/**
 * useUserLocation
 * ───────────────
 * Hook reutilizable para gestionar la ubicación del usuario.
 * Funciona tanto para compradores como vendedores.
 *
 * - Pide permiso al navegador
 * - Guarda las coords en el backend (PUT /api/user/location)
 * - Detecta la ciudad via reverse geocoding (Nominatim)
 * - Expone estado y helpers para usar en cualquier componente
 *
 * Uso:
 *   const { coords, city, locationEnabled, requestLocation, removeLocation } = useUserLocation();
 */

import { useState, useEffect, useCallback } from "react";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";

interface Coords {
  lat: number;
  lng: number;
}

interface UseUserLocationReturn {
  coords: Coords | null;
  city: string | null;
  locationEnabled: boolean;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<Coords | null>;
  removeLocation: () => Promise<void>;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "OffertaMarketplace/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.municipality || null;
  } catch {
    return null;
  }
}

async function saveLocationToBackend(lat: number, lng: number): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) return false;
    const res = await fetch(`${API}/user/location`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lat, lng }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useUserLocation(
  initialCoords?: { lat?: number | null; lng?: number | null; locationEnabled?: boolean }
): UseUserLocationReturn {
  const [coords, setCoords]                   = useState<Coords | null>(
    initialCoords?.lat && initialCoords?.lng
      ? { lat: initialCoords.lat, lng: initialCoords.lng }
      : null
  );
  const [city, setCity]                       = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(initialCoords?.locationEnabled ?? false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  // Si ya tenemos coords al montar, detectar ciudad
  useEffect(() => {
    if (coords && !city) {
      reverseGeocode(coords.lat, coords.lng).then(c => setCity(c));
    }
  }, []); // eslint-disable-line

  const requestLocation = useCallback(async (): Promise<Coords | null> => {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalización.");
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newCoords: Coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          setCoords(newCoords);
          setLocationEnabled(true);

          // Reverse geocoding para ciudad
          const detectedCity = await reverseGeocode(newCoords.lat, newCoords.lng);
          setCity(detectedCity);

          // Guardar en backend
          await saveLocationToBackend(newCoords.lat, newCoords.lng);

          setLoading(false);
          resolve(newCoords);
        },
        (err) => {
          setLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setError(
              "Permiso denegado. Hacé click en el candado 🔒 de la barra de direcciones → Ubicación → Permitir."
            );
          } else if (err.code === err.TIMEOUT) {
            setError("La solicitud tardó demasiado. Intentá de nuevo.");
          } else {
            setError("No se pudo obtener la ubicación.");
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 }
      );
    });
  }, []);

  const removeLocation = useCallback(async () => {
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API}/user/location`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    setCoords(null);
    setCity(null);
    setLocationEnabled(false);
  }, []);

  return { coords, city, locationEnabled, loading, error, requestLocation, removeLocation };
}