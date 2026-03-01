"use client";

import { useState } from "react";
import { MapPin, Navigation, Shield, X } from "lucide-react";

interface LocationPermissionModalProps {
  open: boolean;
  onAllow: (coords: { lat: number; lng: number }) => void;
  onSkip?: () => void;   // null si es obligatorio
  businessName?: string;
}

export default function LocationPermissionModal({
  open,
  onAllow,
  onSkip,
  businessName,
}: LocationPermissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleAllow = async () => {
    setError("");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Guardar en backend para que el comprador también quede registrado
        try {
          const token = localStorage.getItem("marketplace_token");
          if (token) {
            await fetch("https://new-backend-lovat.vercel.app/api/user/location", {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(coords),
            });
          }
        } catch {}
        setLoading(false);
        onAllow(coords);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            "Bloqueaste los permisos de ubicación en el navegador. " +
            "Hacé click en el ícono 🔒 de la barra de direcciones → Ubicación → Permitir, y recargá la página."
          );
        } else {
          setError("No se pudo obtener la ubicación. Intentá de nuevo.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg,#1a1730,#14111f)",
          border: "1.5px solid rgba(249,115,22,0.35)",
          borderRadius: 20,
          padding: "2rem 2rem 1.75rem",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.1)",
          position: "relative",
        }}
      >
        {/* Icono decorativo */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg,rgba(249,115,22,0.25),rgba(249,115,22,0.08))",
            border: "1.5px solid rgba(249,115,22,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <Navigation size={28} style={{ color: "#f97316" }} />
        </div>

        <h2
          style={{
            textAlign: "center",
            color: "#fff",
            fontSize: "1.2rem",
            fontWeight: 800,
            margin: "0 0 0.5rem",
          }}
        >
          Tu negocio necesita ubicación
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.65)",
            fontSize: "0.875rem",
            margin: "0 0 1.5rem",
            lineHeight: 1.55,
          }}
        >
          Para que los compradores cercanos puedan encontrarte
           {" "}
            en <strong><h2>{businessName}</h2></strong>
          necesitamos saber dónde está tu negocio. Es obligatorio y solo se usa para las búsquedas por cercanía.
        </p>

        {/* Beneficios */}
        <div
          style={{
            background: "rgba(249,115,22,0.07)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 12,
            padding: "0.9rem 1rem",
            marginBottom: "1.25rem",
          }}
        >
          {[
            "Aparecés en búsquedas de compradores cercanos",
            "Tus productos heredan tu ubicación automáticamente",
            "Podés cambiar la dirección cuando quieras",
          ].map((txt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.8)",
                marginBottom: i < 2 ? "0.5rem" : 0,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#f97316",
                  flexShrink: 0,
                }}
              />
              {txt}
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.73rem",
            color: "rgba(255,255,255,0.4)",
            marginBottom: "1.25rem",
          }}
        >
          <Shield size={11} />
          Tu ubicación exacta nunca es pública; solo se usa para calcular distancias.
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "0.7rem 0.9rem",
              color: "#fca5a5",
              fontSize: "0.78rem",
              marginBottom: "1rem",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: "flex", gap: "0.6rem", flexDirection: "column" }}>
          <button
            type="button"
            onClick={handleAllow}
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              opacity: loading ? 0.8 : 1,
              boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
              transition: "opacity 0.15s",
            }}
          >
            <MapPin size={16} />
            {loading ? "Obteniendo ubicación…" : "Permitir ubicación"}
          </button>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              style={{
                width: "100%",
                padding: "0.65rem",
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.5)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Omitir por ahora (limitado)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
           
         
