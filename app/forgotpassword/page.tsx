"use client";
// app/forgot-password/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../styles/forgotPassword.css";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step,        setStep]        = useState<Step>("email");
  const [email,       setEmail]       = useState("");
  const [code,        setCode]        = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const startCountdown = () => {
    setResendTimer(60);
    const t = setInterval(() => {
      setResendTimer(v => {
        if (v <= 1) { clearInterval(t); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Ingresá tu email.");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep("code");
      startCountdown();
    } catch (err: any) {
      setError(err.message || "Error enviando el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      startCountdown();
    } catch {
      setError("Error reenviando el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) return setError("El código debe tener 6 dígitos.");
    setStep("password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6)  return setError("Mínimo 6 caracteres.");
    if (newPassword !== confirm)  return setError("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Error restableciendo la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = { email: 1, code: 2, password: 3, done: 3 }[step];

  return (
    <div className="fp-page">
      <div className="fp-card">

        {/* Logo */}
        <Link href="/" className="fp-logo">
          <span className="fp-logo-badge">Off</span>
          <span className="fp-logo-suffix">ertas</span>
        </Link>

        {/* Progress */}
        {step !== "done" && (
          <div className="fp-progress">
            {[1, 2, 3].map(n => (
              <div key={n} className={`fp-step ${n <= stepIndex ? "fp-step--active" : ""} ${n < stepIndex ? "fp-step--done" : ""}`}>
                <div className="fp-step-dot">{n < stepIndex ? "✓" : n}</div>
                <span className="fp-step-label">
                  {n === 1 ? "Email" : n === 2 ? "Código" : "Contraseña"}
                </span>
              </div>
            ))}
            <div className="fp-progress-line">
              <div className="fp-progress-fill" style={{ width: `${((stepIndex - 1) / 2) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="fp-error"><span>⚠️</span> {error}</div>}

        {/* PASO 1: Email */}
        {step === "email" && (
          <form className="fp-form" onSubmit={handleSendCode}>
            <div className="fp-form-head">
              <h1 className="fp-title">¿Olvidaste tu contraseña?</h1>
              <p className="fp-desc">Ingresá tu email y te enviamos un código para restablecerla.</p>
            </div>
            <div className="fp-field">
              <label className="fp-label">Correo electrónico</label>
              <input className="fp-input" type="email" placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <button className="fp-btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="fp-spinner" /> : "Enviar código"}
            </button>
            <Link href="/login" className="fp-back">← Volver al inicio de sesión</Link>
          </form>
        )}

        {/* PASO 2: Código */}
        {step === "code" && (
          <form className="fp-form" onSubmit={handleVerifyCode}>
            <div className="fp-form-head">
              <div className="fp-icon">📬</div>
              <h1 className="fp-title">Revisá tu email</h1>
              <p className="fp-desc">
                Enviamos un código de 6 dígitos a <strong>{email}</strong>.
                Revisá también la carpeta de spam.
              </p>
            </div>
            <div className="fp-field">
              <label className="fp-label">Código de verificación</label>
              <input className="fp-input fp-input--code" type="text" inputMode="numeric"
                maxLength={6} placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus />
            </div>
            <button className="fp-btn-primary" type="submit" disabled={loading || code.length !== 6}>
              {loading ? <span className="fp-spinner" /> : "Verificar código"}
            </button>
            <button type="button" className="fp-resend" onClick={handleResend} disabled={resendTimer > 0 || loading}>
              {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : "¿No llegó? Reenviar código"}
            </button>
            <button type="button" className="fp-back" onClick={() => setStep("email")}>← Cambiar email</button>
          </form>
        )}

        {/* PASO 3: Nueva contraseña */}
        {step === "password" && (
          <form className="fp-form" onSubmit={handleResetPassword}>
            <div className="fp-form-head">
              <div className="fp-icon">🔒</div>
              <h1 className="fp-title">Nueva contraseña</h1>
              <p className="fp-desc">Elegí una contraseña segura de al menos 6 caracteres.</p>
            </div>
            <div className="fp-field">
              <label className="fp-label">Nueva contraseña</label>
              <div className="fp-input-wrap">
                <input className="fp-input" type={showPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required autoFocus />
                <button type="button" className="fp-toggle-pass" onClick={() => setShowPass(v => !v)}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {newPassword && (
                <div className="fp-strength">
                  <div className="fp-strength-bar">
                    {[1,2,3,4].map(n => (
                      <div key={n} className={`fp-strength-seg ${getStrength(newPassword) >= n ? `fp-s${getStrength(newPassword)}` : ""}`} />
                    ))}
                  </div>
                  <span className="fp-strength-label">{strengthLabel(newPassword)}</span>
                </div>
              )}
            </div>
            <div className="fp-field">
              <label className="fp-label">Repetir contraseña</label>
              <input className={`fp-input ${confirm && confirm !== newPassword ? "fp-input--error" : ""}`}
                type={showPass ? "text" : "password"} placeholder="Repetí la contraseña"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
              {confirm && confirm !== newPassword && (
                <span className="fp-field-hint">Las contraseñas no coinciden</span>
              )}
            </div>
            <button className="fp-btn-primary" type="submit"
              disabled={loading || newPassword !== confirm || newPassword.length < 6}>
              {loading ? <span className="fp-spinner" /> : "Guardar contraseña"}
            </button>
            <button type="button" className="fp-back" onClick={() => setStep("code")}>← Volver</button>
          </form>
        )}

        {/* PASO 4: Éxito */}
        {step === "done" && (
          <div className="fp-form fp-done">
            <div className="fp-done-icon">🎉</div>
            <h1 className="fp-title">¡Todo listo!</h1>
            <p className="fp-desc">Tu contraseña fue actualizada. Ya podés iniciar sesión.</p>
            <button className="fp-btn-primary" onClick={() => router.push("/login")}>
              Ir al inicio de sesión
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 6)                        s++;
  if (pw.length >= 10)                       s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw))              s++;
  return Math.max(1, s);
}

function strengthLabel(pw: string): string {
  return ["", "Débil", "Regular", "Buena", "Fuerte"][getStrength(pw)] ?? "";
}