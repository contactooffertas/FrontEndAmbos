"use client";
// app/register/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/authContext";
import "../styles/login.css";
import {
  Store,
  Package,
  TrendingUp,
  ShoppingBag,
  Loader2,
  Rocket,
  Eye,
  EyeOff,
} from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    confirm:  "",
    role:     "user",
  });
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [terminosAceptados, setTerminosAceptados] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())                       errs.name     = "El nombre es requerido.";
    if (!form.email)                             errs.email    = "El email es requerido.";
    else if (!/\S+@\S+\.\S+/.test(form.email))  errs.email    = "Email inválido.";
    if (!form.password)                          errs.password = "La contraseña es requerida.";
    else if (form.password.length < 6)           errs.password = "Mínimo 6 caracteres.";
    if (form.password !== form.confirm)          errs.confirm  = "Las contraseñas no coinciden.";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const Swal = (await import("sweetalert2")).default;

    // ── BLOQUEO: T&C obligatorios ──────────────────────────────────────────
    if (!terminosAceptados) {
      const result = await Swal.fire({
        icon:               "warning",
        title:              "Términos y Condiciones",
        text:               "Debés aceptar los Términos y Condiciones para continuar con el registro.",
        confirmButtonText:  "Leer Términos y Condiciones",
        confirmButtonColor: "#2563eb",
        showCancelButton:   true,
        cancelButtonText:   "Volver",
        cancelButtonColor:  "#6b7280",
      });
      // Si clickeó "Leer T&C" → lleva al componente Terminos
      if (result.isConfirmed) {
        router.push("/terminos");
      }
      return; // siempre corta — no sigue el registro
    }

    // ── Validación campos ──────────────────────────────────────────────────
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch("https://vercel-backend-ochre-nine.vercel.app/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              form.name,
          email:             form.email,
          password:          form.password,
          role:              form.role,
          terminosAceptados: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await Swal.fire({
          icon:               "success",
          title:              "¡Cuenta creada!",
          text:               data.message || "Registro exitoso",
          confirmButtonText:  "Verificar ahora",
          confirmButtonColor: "#2563eb",
        });
        router.replace(`/verify?email=${encodeURIComponent(form.email)}`);
      } else {
        Swal.fire({
          icon:  "error",
          title: "Error",
          text:  data.message || "Error al registrar",
        });
      }
    } catch {
      Swal.fire({
        icon:  "error",
        title: "Error de conexión",
        text:  "No se pudo conectar con el servidor",
      });
    }

    setLoading(false);
  };

  return (
    <div className="auth-page register-page">

      {/* ── Left ── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-logo">Offerton</div>
          <h2>Sumate a la comunidad</h2>
          <p>
            Miles de compradores y vendedores confían en Offerton para sus
            transacciones del día a día.
          </p>
          <ul className="auth-left-features">
            <li><span><ShoppingBag size={18} /></span><span>Registro 100% gratuito</span></li>
            <li><span><Store       size={18} /></span><span>Creá tu negocio online</span></li>
            <li><span><Package     size={18} /></span><span>Vendé tus productos localmente</span></li>
            <li><span><TrendingUp  size={18} /></span><span>Estadísticas y métricas de tus ventas</span></li>
          </ul>
        </div>
      </div>

      {/* ── Right ── */}
      <div className="auth-right">
        <div className="auth-header">
          <h1>Crear cuenta</h1>
          <p>Es gratis y toma menos de 1 minuto</p>
          <Link href="/" className="flex items-center gap-1">← Volver</Link>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Tipo de cuenta */}
          <div className="form-group">
            <label>Tipo de cuenta</label>
            <div className="role-selector">
              <div
                className={`role-option ${form.role === "user"   ? "selected" : ""}`}
                onClick={() => set("role", "user")}
              >
                <div className="role-option-icon"><ShoppingBag size={18} /></div>
                Comprador
              </div>
              <div
                className={`role-option ${form.role === "seller" ? "selected" : ""}`}
                onClick={() => set("role", "seller")}
              >
                <div className="role-option-icon"><Store size={18} /></div>
                Vendedor
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              type="text"
              className={`form-control ${errors.name ? "error" : ""}`}
              placeholder="Juan Pérez"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`form-control ${errors.email ? "error" : ""}`}
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {/* Contraseñas */}
          <div className="form-row">
            <div className="form-group" style={{ position: "relative" }}>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`form-control ${errors.password ? "error" : ""}`}
                placeholder="Mín. 6 caracteres"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "10px", top: "38px", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group" style={{ position: "relative" }}>
              <label htmlFor="confirm">Confirmar</label>
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                className={`form-control ${errors.confirm ? "error" : ""}`}
                placeholder="Repetí tu contraseña"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
              />
              <span
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: "10px", top: "38px", cursor: "pointer" }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>
          </div>

          {/* ── Términos y Condiciones ── */}
          <div style={{
            background:   terminosAceptados ? "#eff6ff" : "#f9fafb",
            border:       `1.5px solid ${terminosAceptados ? "#2563eb" : "#e5e7eb"}`,
            borderRadius: "10px",
            padding:      "14px 16px",
            marginBottom: "4px",
            transition:   "border-color 0.2s, background 0.2s",
          }}>
            <label style={{
              display:    "flex",
              alignItems: "flex-start",
              gap:        "12px",
              cursor:     "pointer",
              margin:     0,
            }}>
              <input
                type="checkbox"
                checked={terminosAceptados}
                onChange={(e) => setTerminosAceptados(e.target.checked)}
                style={{
                  width:       "18px",
                  height:      "18px",
                  marginTop:   "2px",
                  accentColor: "#2563eb",
                  flexShrink:  0,
                  cursor:      "pointer",
                }}
              />
              <span style={{ fontSize: "0.82rem", color: "#374151", lineHeight: "1.55" }}>
                He leído y acepto los{" "}
                {/* ✅ Link al componente Terminos en /terminos — abre en nueva pestaña */}
                <Link
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}
                >
                  Términos y Condiciones
                </Link>
                {" "}de Offerton.com.ar. Entiendo que la plataforma no intermedia
                transacciones y que su responsabilidad máxima es de{" "}
                <strong style={{ color: "#2563eb" }}>ARS 0</strong>.
              </span>
            </label>
          </div>

          {/* Aviso inline si no aceptó */}
          {!terminosAceptados && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", margin: "2px 0 8px 2px" }}>
              Debés aceptar los{" "}
              {/* ✅ Segundo link — también lleva al componente Terminos */}
              <Link
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#dc2626", fontWeight: 700, textDecoration: "underline" }}
              >
                Términos y Condiciones
              </Link>
              {" "}para registrarte.
            </p>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ marginRight: "6px" }} />
                Creando cuenta...
              </>
            ) : (
              <>
                <Rocket size={18} style={{ marginRight: "6px" }} />
                Crear mi cuenta gratis
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tenés cuenta? <Link href="/login">Iniciá sesión →</Link>
        </div>
      </div>
    </div>
  );
}