"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/authContext";
import "../styles/login.css";
import {
  MapPin,
  Bell,
  Star,
  Store,
  Loader2,
  Lock,
} from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
      const storedUser = JSON.parse(localStorage.getItem("marketplace_user") || "{}");

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

        router.push(goToAdmin ? "/admin" : "/");
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
      <div className="auth-left">
        <div className="auth-left-content">
          <Link
            href="/"
            aria-label="Rosario Market — Ir al inicio"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              color: "inherit",
              textDecoration: "none",
              marginBottom: "1.35rem",
            }}
          >
            <img
              src="/assets/navbarbolsa.png"
              alt=""
              style={{ width: 42, height: 42, objectFit: "contain" }}
            />
            <span style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Rosario <span style={{ color: "#f97316" }}>Market</span>
            </span>
          </Link>

          <h2>Todo Rosario, en un solo lugar</h2>
          <p>
            Iniciá sesión para guardar tus preferencias, seguir negocios y descubrir productos cerca tuyo.
          </p>

          <ul className="auth-left-features">
            <li>
              <span><MapPin size={18} /></span>
              <span>Negocios y productos según tu ubicación</span>
            </li>
            <li>
              <span><Bell size={18} /></span>
              <span>Alertas de ofertas de tus negocios favoritos</span>
            </li>
            <li>
              <span><Star size={18} /></span>
              <span>Calificaciones y referencias de la comunidad</span>
            </li>
            <li>
              <span><Store size={18} /></span>
              <span>Acceso directo a comercios locales de Rosario</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-header">
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--primary)",
              textDecoration: "none",
              fontSize: "0.86rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            <img
              src="/assets/navbarbolsa.png"
              alt=""
              style={{ width: 24, height: 24, objectFit: "contain" }}
            />
            Volver a Rosario Market
          </Link>

          <h1>Iniciar sesión</h1>
          <p>Bienvenido de vuelta a Rosario Market</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
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
              autoComplete="current-password"
              className={`form-control ${errors.password ? "error" : ""}`}
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div style={{ textAlign: "right" }}>
            <Link
              href="/forgotpassword"
              style={{ fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600 }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ marginRight: 6 }} />
                Ingresando...
              </>
            ) : (
              <>
                <Lock size={18} style={{ marginRight: 6 }} />
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
