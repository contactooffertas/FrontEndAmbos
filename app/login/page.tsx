"use client";
// app/login/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/authContext";
import "../styles/login.css";
import {
  MapPin,
  Bell,
  Star,
  CreditCard,
  Loader2,
  Lock,
  Shield,
} from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validate = () => {
    const errs: typeof errors = {};
    if (!email) errs.email = "El email es requerido.";
    if (!password) errs.password = "La contraseña es requerida.";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const Swal = (await import("sweetalert2")).default;
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Check if the logged-in user is an admin
      const storedUser = JSON.parse(
        localStorage.getItem("marketplace_user") || "{}",
      );
      if (storedUser?.role === "admin") {
        const { value: goToAdmin } = await Swal.fire({
          icon: "success",
          title: "¡Bienvenido, Administrador!",
          text: "¿A dónde querés ir?",
          showCancelButton: true,
          confirmButtonText: "🛡️ Ir al Panel de Admin",
          cancelButtonText: "🏠 Ir al inicio",
          confirmButtonColor: "#7c3aed",
          cancelButtonColor: "#f97316",
          timer: 8000,
          timerProgressBar: true,
        });

        if (goToAdmin) {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else {
        await Swal.fire({
          icon: "success",
          title: "¡Bienvenido!",
          text: result.message,
          timer: 1500,
          showConfirmButton: false,
        });
        router.push("/");
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Error al ingresar",
        text: result.message,
      });
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-logo">Off-ertas</div>
          <h2>Encontrá las mejores ofertas cerca tuyo</h2>
          <p>Accedé a miles de productos de negocios verificados en tu zona.</p>
          <ul className="auth-left-features">
            <li>
              <span>
                <MapPin size={18} />
              </span>
              <span>Productos cercanos a tu ubicación</span>
            </li>
            <li>
              <span>
                <Bell size={18} />
              </span>
              <span>Alertas de ofertas en tiempo real</span>
            </li>
            <li>
              <span>
                <Star size={18} />
              </span>
              <span>Negocios calificados por la comunidad</span>
            </li>
            <li>
              <span>
                <CreditCard size={18} />
              </span>
              <span>Pagos seguros y garantizados</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-header">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            ← Volver al inicio
          </Link>
          <h1>Iniciar sesión</h1>
          <p>Bienvenido de vuelta a Off-ertas</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`form-control ${errors.email ? "error" : ""}`}
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className={`form-control ${errors.password ? "error" : ""}`}
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <Link
              href="forgotpassword"
              style={{
                fontSize: "0.82rem",
                color: "var(--primary)",
                fontWeight: "600",
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                  style={{ marginRight: "6px" }}
                />
                Ingresando...
              </>
            ) : (
              <>
                <Lock size={18} style={{ marginRight: "6px" }} />
                Ingresar
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          ¿No tenés cuenta? <Link href="/register">Registrate gratis →</Link>
        </div>
      </div>
    </div>
  );
}
