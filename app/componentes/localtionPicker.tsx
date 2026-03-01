"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2, CheckCircle2, X, Navigation } from "lucide-react";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────
// Las sugerencias de Google Autocomplete vienen con placeId pero SIN lat/lng.
// Las coordenadas se obtienen en el paso 2 (Place Details).
export interface LocationSuggestion {
  label:        string;
  placeId?:     string;  // presente en respuestas de Google Autocomplete
  description?: string;
  // estos dos solo están cuando el backend usa fallback geocoding directo
  lat?:         number;
  lng?:         number;
  address?:     string;
}

export interface LocationResult {
  lat:     number;
  lng:     number;
  address: string;
  label:   string;
}

interface LocationPickerProps {
  value?:    { lat: number; lng: number; address: string } | null;
  onChange:  (loc: { lat: number; lng: number; address: string }) => void;
  userLat?:  number | null;
  userLng?:  number | null;
  userCity?: string | null;
  required?: boolean;
  error?:    string;
}

export default function LocationPicker({
  value,
  onChange,
  userLat,
  userLng,
  userCity,
  required = true,
  error,
}: LocationPickerProps) {
  const [query, setQuery]         = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading]     = useState(false);   // buscando sugerencias
  const [resolving, setResolving] = useState(false);   // resolviendo placeId → coords
  const [open, setOpen]           = useState(false);
  const [confirmed, setConfirmed] = useState<{ lat: number; lng: number; address: string } | null>(
    value ?? null
  );

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Cerrar dropdown al click afuera ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Sincronizar si cambia el valor externo ────────────────────────────────
  useEffect(() => {
    if (value) {
      setQuery(value.address);
      setConfirmed(value);
    }
  }, [value?.address]);

  // ── PASO 1: buscar sugerencias (Places Autocomplete) ──────────────────────
  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q });
        if (userLat) params.append("lat", userLat.toString());
        if (userLng) params.append("lng", userLng.toString());
        if (userCity) params.append("city", userCity);

        const res  = await fetch(`${API}/business/geocode?${params}`);
        if (!res.ok) throw new Error();
        const data: LocationSuggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [userLat, userLng, userCity]
  );

  // ── PASO 2: resolver placeId → lat/lng exactos ────────────────────────────
  const handleSelect = async (loc: LocationSuggestion) => {
    setOpen(false);
    setSuggestions([]);
    setQuery(loc.label);

    // Caso A: ya viene con coordenadas (fallback geocoding directo del backend)
    if (loc.lat && loc.lng) {
      const resolved = { lat: loc.lat, lng: loc.lng, address: loc.label };
      setConfirmed(resolved);
      onChange(resolved);
      return;
    }

    // Caso B: solo tiene placeId → llamar al backend para obtener coordenadas
    if (loc.placeId) {
      setResolving(true);
      try {
        const res  = await fetch(`${API}/business/geocode?placeId=${encodeURIComponent(loc.placeId)}`);
        if (!res.ok) throw new Error();
        const data: LocationResult[] = await res.json();

        if (data.length > 0 && data[0].lat && data[0].lng) {
          const resolved = { lat: data[0].lat, lng: data[0].lng, address: data[0].label };
          setConfirmed(resolved);
          setQuery(data[0].label);
          onChange(resolved);
        } else {
          // No se pudo resolver → limpiar para que reintente
          setConfirmed(null);
          setQuery("");
        }
      } catch {
        setConfirmed(null);
        setQuery("");
      } finally {
        setResolving(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (confirmed && val !== confirmed.address) setConfirmed(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleClear = () => {
    setConfirmed(null);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  const isLoading = loading || resolving;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>

      {/* ── Label ── */}
      <p style={{
        margin: "0 0 0.5rem",
        fontSize: "0.8rem",
        color: error ? "#fca5a5" : "rgba(255,255,255,0.75)",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "0.3rem",
      }}>
        <MapPin size={12} />
        Ubicación del negocio
        {required && <span style={{ color: "#f97316", fontWeight: 700 }}>*</span>}

        {/* Estado: confirmada */}
        {confirmed && !resolving && (
          <span style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
            <CheckCircle2 size={11} /> Confirmada
          </span>
        )}

        {/* Estado: resolviendo coordenadas */}
        {resolving && (
          <span style={{ color: "#fdba74", display: "flex", alignItems: "center", gap: 3, marginLeft: 4, fontSize: "0.72rem" }}>
            <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
            Obteniendo coordenadas…
          </span>
        )}
      </p>

      {/* ── Input ── */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>

        {/* Ícono izquierdo */}
        <div style={{
          position: "absolute", left: "0.75rem",
          display: "flex", alignItems: "center",
          pointerEvents: "none",
          color: confirmed ? "#4ade80" : "rgba(255,255,255,0.4)",
        }}>
          {isLoading
            ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            : confirmed
            ? <Navigation size={14} />
            : <Search size={14} />
          }
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Ej: Pasaje 516 6449, San Martín 1234, Melincué…"
          disabled={resolving}
          style={{
            width: "100%",
            padding: "0.65rem 2.5rem 0.65rem 2.25rem",
            background: confirmed ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.08)",
            border: `1.5px solid ${
              error       ? "#f87171"
              : confirmed ? "#4ade80"
              : open      ? "rgba(249,115,22,0.7)"
                          : "rgba(255,255,255,0.2)"
            }`,
            borderRadius: open ? "10px 10px 0 0" : "10px",
            color: "#fff",
            fontSize: "0.87rem",
            outline: "none",
            opacity: resolving ? 0.6 : 1,
            transition: "all 0.18s",
            boxSizing: "border-box",
            cursor: resolving ? "wait" : "text",
          }}
        />

        {/* Botón limpiar */}
        {(query || confirmed) && !resolving && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute", right: "0.65rem",
              background: "none", border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer", display: "flex", alignItems: "center", padding: 2,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Dropdown de sugerencias ── */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#1e1b2e",
          border: "1.5px solid rgba(249,115,22,0.5)",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          zIndex: 999,
          maxHeight: 260, overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {suggestions.map((loc, i) => (
            <button
              key={loc.placeId || i}
              type="button"
              onClick={() => handleSelect(loc)}
              style={{
                width: "100%", textAlign: "left",
                padding: "0.7rem 1rem",
                background: "none", border: "none",
                color: "rgba(255,255,255,0.9)",
                fontSize: "0.82rem", cursor: "pointer",
                display: "flex", alignItems: "flex-start", gap: "0.6rem",
                borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                transition: "background 0.13s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(249,115,22,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <MapPin size={13} style={{ color: "#f97316", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{loc.label}</div>
                {loc.description && loc.description !== loc.label && (
                  <div style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.3 }}>
                    {loc.description.slice(0, 90)}{loc.description.length > 90 ? "…" : ""}
                  </div>
                )}
              </div>
            </button>
          ))}

          {/* Atribución requerida por Google ToS */}
          <div style={{
            padding: "0.35rem 1rem",
            textAlign: "right",
            fontSize: "0.63rem",
            color: "rgba(255,255,255,0.2)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            powered by Google
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "#fca5a5", fontWeight: 600 }}>
          {error}
        </p>
      )}

      {/* ── Hint: escribió pero no seleccionó ── */}
      {query.length >= 2 && !confirmed && !isLoading && !open && (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.73rem", color: "rgba(255,215,100,0.8)", fontWeight: 600 }}>
          Seleccioná una sugerencia del listado para confirmar la ubicación.
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}