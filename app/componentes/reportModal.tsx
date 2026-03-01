"use client";
// app/componentes/reportModal.tsx

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Flag, X, AlertTriangle, ShieldAlert, Pill, Crosshair,
  Flame, Megaphone, FileText, Loader2, CheckCircle2,
} from "lucide-react";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";

interface ReportModalProps {
  // "user" es alias interno del chat — se envía como "business" al backend
  // ya que el modelo solo acepta "product" | "business"
  targetType: "product" | "business" | "user";
  targetId: string;
  targetName: string;
  token: string;
  onRequireAuth: () => Promise<void>;
  // Modo programático: el padre controla la apertura (usado desde el chat)
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

// ─── Enums exactos del reportModel.js ────────────────────────────────────────
// category: "spam" | "fraud" | "adult" | "drugs" | "weapons" | "violence" | "other"
// targetType: "product" | "business"

const CATEGORIES = [
  {
    group: "Contenido inapropiado",
    items: [
      { value: "adult",    label: "Contenido adulto",    Icon: ShieldAlert  },
      { value: "violence", label: "Violencia / Acoso",   Icon: Flame        },
      { value: "drugs",    label: "Drogas / Sustancias", Icon: Pill         },
      { value: "weapons",  label: "Armas",               Icon: Crosshair    },
    ],
  },
  {
    group: "Fraude / Estafa",
    items: [
      { value: "fraud", label: "Estafa / Fraude",            Icon: AlertTriangle },
      { value: "spam",  label: "Spam / Publicidad engañosa", Icon: Megaphone     },
    ],
  },
  {
    group: "Otros",
    items: [
      { value: "other", label: "Otro motivo", Icon: FileText },
    ],
  },
] as const;

type CategoryValue = "adult" | "violence" | "drugs" | "weapons" | "fraud" | "spam" | "other";

interface SubmitResult {
  success: boolean;
  message: string;
  productBlocked?: boolean;
}

function ModalPortal({
  targetType,
  targetName,
  targetId,
  token,
  onClose,
}: {
  targetType: "product" | "business" | "user";
  targetName: string;
  targetId: string;
  token: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<CategoryValue | "">("");
  const [reason,   setReason]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [mounted,  setMounted]  = useState(false);
  const [result,   setResult]   = useState<SubmitResult | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const isFormValid = category !== "" && reason.trim().length >= 10;

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!category)                 { setError("Por favor seleccioná una categoría"); return; }
    if (reason.trim().length < 10) { setError("La razón debe tener al menos 10 caracteres"); return; }

    setError("");
    setLoading(true);
    try {
      // "user" no es un enum válido en el modelo — se envía como "business"
      // El backend no auto-bloquea negocios salvo autoBlocked por keywords,
      // así que es seguro usarlo para reportar usuarios del chat.
      const backendTargetType: "product" | "business" =
        targetType === "user" ? "business" : targetType;

      const res = await fetch(`${API}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: backendTargetType,
          targetId,
          targetName,
          category,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success:        true,
          message:        data.message || "Reporte enviado correctamente.",
          productBlocked: data.productBlocked || data.autoBlocked,
        });
      } else {
        throw new Error(data.message || "Error al enviar reporte");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    opacity: mounted ? 1 : 0,
    transition: "opacity 0.2s ease",
  };

  const boxStyle: React.CSSProperties = {
    background: "#1a1e2b",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "460px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    opacity: mounted ? 1 : 0,
    transition: "transform 0.25s ease, opacity 0.25s ease",
    position: "relative",
    zIndex: 2147483647,
  };

  // ── Vista de resultado exitoso ────────────────────────────────────────────
  if (result?.success) {
    return createPortal(
      <div style={overlayStyle} onMouseDown={onClose}>
        <div style={boxStyle} onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(34,197,94,0.15)",
              border: "2px solid rgba(34,197,94,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <CheckCircle2 size={32} style={{ color: "#4ade80" }} />
            </div>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>
              ¡Reporte enviado!
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
              {result.message}
            </p>
            {result.productBlocked && (
              <div style={{
                background: "rgba(249,115,22,0.1)",
                border: "1px solid rgba(249,115,22,0.3)",
                borderRadius: 10, padding: "0.75rem 1rem",
                marginBottom: "1rem",
              }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#fdba74", fontWeight: 600 }}>
                  🔒 El contenido fue bloqueado temporalmente mientras el equipo lo revisa.
                </p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
                  Si el reporte es inválido, será desbloqueado a la brevedad.
                </p>
              </div>
            )}
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
              Gracias por ayudarnos a mantener la comunidad segura. Te avisaremos cuando el equipo tome una decisión.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg,#4ade80,#16a34a)",
                color: "#fff", border: "none", borderRadius: 10,
                padding: "0.6rem 2rem", fontWeight: 700, fontSize: "0.88rem",
                cursor: "pointer", boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Vista del formulario ──────────────────────────────────────────────────
  return createPortal(
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={boxStyle} onMouseDown={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Flag size={16} style={{ color: "#ef4444" }} />
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Reportar {targetType === "product" ? "producto" : targetType === "user" ? "usuario" : "negocio"}
            </h3>
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: "transparent", border: "none",
              color: "rgba(122,128,153,0.9)",
              cursor: "pointer", padding: "0.25rem", borderRadius: "6px",
              display: "flex", alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem" }}>
          {/* Aviso bloqueo temporal — solo para productos */}
          {targetType === "product" && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "0.5rem",
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 10, padding: "0.65rem 0.85rem",
              marginBottom: "1rem",
            }}>
              <AlertTriangle size={14} style={{ color: "#f97316", flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                Al enviar este reporte, el producto{" "}
                <strong style={{ color: "#fdba74" }}>"{targetName}"</strong>{" "}
                será bloqueado temporalmente mientras el equipo lo revisa.
              </p>
            </div>
          )}

          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>
            Estás reportando:{" "}
            <strong style={{ color: "#ffffff" }}>{targetName}</strong>
          </p>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px", padding: "0.6rem 0.85rem",
              marginBottom: "1rem", fontSize: "0.8rem", color: "#f87171",
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Categorías */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{
              display: "block", fontSize: "0.72rem", fontWeight: 700,
              color: "rgba(122,128,153,0.9)", textTransform: "uppercase",
              letterSpacing: "0.05em", marginBottom: "0.6rem",
            }}>
              Motivo
            </label>
            {CATEGORIES.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: "0.55rem" }}>
                <span style={{
                  display: "block", fontSize: "0.67rem",
                  color: "rgba(122,128,153,0.9)",
                  fontWeight: 600, marginBottom: "0.3rem",
                }}>
                  {group}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {items.map(({ value, label, Icon }) => {
                    const sel = category === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onMouseDown={(e) => { e.stopPropagation(); setCategory(value as CategoryValue); setError(""); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.3rem",
                          padding: "0.32rem 0.65rem",
                          borderRadius: "20px",
                          border: `1.5px solid ${sel ? "rgba(249,115,22,0.6)" : "rgba(255,255,255,0.1)"}`,
                          background: sel ? "rgba(249,115,22,0.12)" : "transparent",
                          color: sel ? "#f97316" : "rgba(122,128,153,0.9)",
                          fontSize: "0.74rem", fontWeight: 600,
                          cursor: "pointer",
                          transition: "border-color 0.15s, background 0.15s, color 0.15s",
                        }}
                      >
                        <Icon size={11} />
                        {label}
                        {sel && <CheckCircle2 size={10} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Textarea */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{
              display: "block", fontSize: "0.72rem", fontWeight: 700,
              color: "rgba(122,128,153,0.9)", textTransform: "uppercase",
              letterSpacing: "0.05em", marginBottom: "0.5rem",
            }}>
              Descripción
            </label>
            <textarea
              className="rpt-textarea"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Contanos por qué reportás este contenido..."
              maxLength={500}
              rows={3}
              style={{
                width: "100%", resize: "vertical",
                background: "rgba(255,255,255,0.06)",
                border: `1.5px solid ${reason.length > 0 && reason.trim().length < 10
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(255,255,255,0.15)"}`,
                borderRadius: "10px", padding: "0.65rem 0.85rem",
                color: "#ffffff", fontSize: "0.85rem",
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit", lineHeight: 1.5,
                transition: "border-color 0.2s",
              }}
            />
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: "0.71rem", color: "rgba(122,128,153,0.9)",
              marginTop: "0.3rem",
            }}>
              <span style={{ color: reason.trim().length < 10 && reason.length > 0 ? "#f97316" : "inherit" }}>
                {reason.trim().length < 10 && reason.length > 0
                  ? `Faltan ${10 - reason.trim().length} caracteres`
                  : "Mínimo 10 caracteres"}
              </span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
              disabled={loading}
              style={{
                padding: "0.52rem 1.1rem", borderRadius: "10px",
                border: "1.5px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(122,128,153,0.9)",
                fontSize: "0.82rem", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onMouseDown={handleSubmit}
              disabled={loading || !isFormValid}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.52rem 1.2rem", borderRadius: "10px",
                border: "none",
                background: isFormValid && !loading
                  ? "linear-gradient(135deg,#ef4444,#dc2626)"
                  : "rgba(239,68,68,0.18)",
                color: isFormValid && !loading ? "#fff" : "rgba(239,68,68,0.35)",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: isFormValid && !loading ? "pointer" : "not-allowed",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {loading
                ? <><Loader2 size={13} style={{ animation: "rpt-spin 1s linear infinite" }} /> Enviando...</>
                : <><Flag size={13} /> Enviar reporte</>
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rpt-spin { to { transform: rotate(360deg); } }
        .rpt-textarea::placeholder { color: rgba(255,255,255,0.3) !important; }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Botón trigger ────────────────────────────────────────────────────────────
export default function ReportModal({
  targetType, targetId, targetName, token, onRequireAuth,
  isOpenExternal, onCloseExternal,
}: ReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Modo programático: el padre controla la apertura (ej: chat page)
  const open  = isOpenExternal !== undefined ? isOpenExternal : isOpen;
  const close = onCloseExternal ?? (() => setIsOpen(false));

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { onRequireAuth(); return; }
    setIsOpen(true);
  };

  // Si es modo programático, no renderizar el botón trigger
  if (isOpenExternal !== undefined) {
    return open ? (
      <ModalPortal
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
        token={token}
        onClose={close}
      />
    ) : null;
  }

  // Modo normal: botón trigger + portal
  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.3rem",
          width: "100%",
          padding: "0.38rem 0.65rem",
          borderRadius: "8px",
          border: "1.5px solid rgba(255,255,255,0.15)",
          background: "transparent",
          color: "#9ca3af",
          fontSize: "0.74rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "color 0.18s, border-color 0.18s",
          isolation: "isolate",
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color       = "#ef4444";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color       = "#9ca3af";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
        }}
      >
        <Flag size={13} />
        Reportar
      </button>

      {open && (
        <ModalPortal
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          token={token}
          onClose={close}
        />
      )}
    </>
  );
}