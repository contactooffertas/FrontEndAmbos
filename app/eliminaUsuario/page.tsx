"use client";
// app/eliminausuario/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  AlertTriangle,
  ShieldOff,
  Package,
  MessageSquare,
  Store,
  ChevronRight,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/authContext";
import MainLayout from "../componentes/MainLayout";
import "../styles/eliminaUsuario.css";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

type Step = "idle" | "warning" | "reason" | "confirm" | "loading" | "done" | "error";

export default function EliminarUsuarioPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [step,   setStep]   = useState<Step>("warning"); // arranca directo en warning
  const [reason, setReason] = useState("");
  const [error,  setError]  = useState("");

  const isSeller = user?.role === "seller";
  const userName = user?.name ?? "Usuario";

  const handleCancel = () => {
    router.back();
  };

  const handleConfirmDelete = async () => {
    setStep("loading");
    setError("");

    try {
      const token = getToken();
      const res = await fetch(`${API}/elimina-usuario/confirm`, {
        method:  "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al eliminar la cuenta.");
        setStep("error");
        return;
      }

      setStep("done");

      setTimeout(() => {
        localStorage.removeItem("marketplace_token");
        sessionStorage.clear();
        logout?.();
        router.push("/");
      }, 2500);
    } catch {
      setError("No se pudo conectar con el servidor. Intentá más tarde.");
      setStep("error");
    }
  };

  if (!user) return null;

  return (
    <MainLayout>
      {/* Reutilizamos los mismos estilos del modal pero como página centrada */}
      <div
        style={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div className="elimina-modal" role="main" style={{ position: "relative", margin: 0 }}>

          {/* ── STEP: warning ──── */}
          {step === "warning" && (
            <div className="elimina-step elimina-step--warning">
              <button className="elimina-close" onClick={handleCancel} aria-label="Volver">
                <X size={18} />
              </button>

              <div className="elimina-icon-wrap elimina-icon-wrap--red">
                <AlertTriangle size={28} />
              </div>

              <h2 className="elimina-title">¿Eliminar tu cuenta?</h2>
              <p className="elimina-subtitle">
                Esta acción es <strong>permanente e irreversible</strong>.<br />
                Se eliminarán todos tus datos de nuestros servidores.
              </p>

              <ul className="elimina-list">
                <li><Package size={14} /><span>Todos tus productos publicados</span></li>
                {isSeller && <li><Store size={14} /><span>Tu negocio y toda su información</span></li>}
                <li><MessageSquare size={14} /><span>Conversaciones y mensajes de chat</span></li>
                <li><ShieldOff size={14} /><span>Historial de órdenes y reportes</span></li>
              </ul>

              <div className="elimina-actions">
                <button className="elimina-btn elimina-btn--ghost" onClick={handleCancel}>
                  Cancelar
                </button>
                <button className="elimina-btn elimina-btn--danger" onClick={() => setStep("reason")}>
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: reason ──── */}
          {step === "reason" && (
            <div className="elimina-step">
              <button className="elimina-close" onClick={handleCancel} aria-label="Volver">
                <X size={18} />
              </button>

              <div className="elimina-icon-wrap elimina-icon-wrap--amber">
                <Trash2 size={26} />
              </div>

              <h2 className="elimina-title">¿Por qué te vas?</h2>
              <p className="elimina-subtitle">
                Opcional. Tu respuesta nos ayuda a mejorar.
              </p>

              <textarea
                className="elimina-textarea"
                placeholder="Contanos qué pasó o qué podríamos mejorar..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="elimina-char">{reason.length}/500</p>

              <div className="elimina-actions">
                <button className="elimina-btn elimina-btn--ghost" onClick={() => setStep("warning")}>
                  Atrás
                </button>
                <button className="elimina-btn elimina-btn--danger" onClick={() => setStep("confirm")}>
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: confirm ──── */}
          {step === "confirm" && (
            <div className="elimina-step elimina-step--confirm">
              <button className="elimina-close" onClick={handleCancel} aria-label="Volver">
                <X size={18} />
              </button>

              <div className="elimina-icon-wrap elimina-icon-wrap--red elimina-icon-wrap--pulse">
                <AlertTriangle size={28} />
              </div>

              <h2 className="elimina-title">Última confirmación</h2>
              <p className="elimina-subtitle">
                Estás por eliminar la cuenta de <strong>{userName}</strong>.<br />
                Recibirás un correo confirmando la eliminación.
              </p>

              <div className="elimina-warning-box">
                <p>Esta acción <strong>no se puede deshacer</strong>. Una vez eliminada, todos tus datos desaparecerán de forma permanente.</p>
              </div>

              <div className="elimina-actions">
                <button className="elimina-btn elimina-btn--ghost" onClick={() => setStep("reason")}>
                  Atrás
                </button>
                <button className="elimina-btn elimina-btn--danger elimina-btn--final" onClick={handleConfirmDelete}>
                  <Trash2 size={16} />
                  Sí, eliminar mi cuenta
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: loading ──── */}
          {step === "loading" && (
            <div className="elimina-step elimina-step--center">
              <div className="elimina-spinner">
                <Loader2 size={40} className="elimina-spin" />
              </div>
              <h2 className="elimina-title">Eliminando tu cuenta...</h2>
              <p className="elimina-subtitle">Por favor, no cierres esta ventana.</p>
              <div className="elimina-progress">
                <div className="elimina-progress-bar" />
              </div>
            </div>
          )}

          {/* ── STEP: done ──── */}
          {step === "done" && (
            <div className="elimina-step elimina-step--center">
              <div className="elimina-icon-wrap elimina-icon-wrap--green">
                <CheckCircle size={32} />
              </div>
              <h2 className="elimina-title">Cuenta eliminada</h2>
              <p className="elimina-subtitle">
                Tu cuenta y todos tus datos fueron eliminados.<br />
                Recibirás un correo de confirmación. ¡Hasta pronto!
              </p>
            </div>
          )}

          {/* ── STEP: error ──── */}
          {step === "error" && (
            <div className="elimina-step elimina-step--center">
              <div className="elimina-icon-wrap elimina-icon-wrap--red">
                <AlertTriangle size={28} />
              </div>
              <h2 className="elimina-title">Algo salió mal</h2>
              <p className="elimina-subtitle">{error}</p>
              <div className="elimina-actions elimina-actions--center">
                <button className="elimina-btn elimina-btn--ghost" onClick={handleCancel}>
                  Cancelar
                </button>
                <button className="elimina-btn elimina-btn--danger" onClick={handleConfirmDelete}>
                  Reintentar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );

}
