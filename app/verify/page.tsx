"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../styles/verify.css";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(60);
  const [resending, setResending] = useState<boolean>(false);

  useEffect(() => {
    const emailFromUrl = searchParams?.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl.trim().toLowerCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("https://new-backend-lovat.vercel.app/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data: { message?: string } = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Error al verificar");
      } else {
        setMessage("Cuenta verificada correctamente ✅");
        if (searchParams?.get("intent") === "service") {
          localStorage.setItem("post_login_redirect", "/servicios?panel=1");
        }
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch {
      setMessage("Error del servidor");
    }

    setLoading(false);
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setMessage("");

    try {
      const res = await fetch("https://new-backend-lovat.vercel.app/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data: { message?: string } = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message ?? `No se pudo reenviar el código (HTTP ${res.status})`);
        return;
      }

      setTimer(60);
      setMessage(data.message ?? "Nuevo código enviado 📩");
    } catch {
      setMessage("No se pudo conectar con el servidor para reenviar el código");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <h2>Verificar Cuenta</h2>
        <p className="verify-subtitle">Ingresá el código enviado a tu email</p>

        <form onSubmit={handleVerify}>
          <input
            type="email"
            className="verify-input"
            value={email}
            disabled
          />
          <input
            type="text"
            className="verify-input"
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" className="verify-button" disabled={loading}>
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>

        <div className="resend-section">
          {timer > 0 ? (
            <span>Reenviar código en {timer}s</span>
          ) : (
            <button className="resend-button" onClick={handleResend} disabled={resending}>
              {resending ? "Enviando..." : "Reenviar código"}
            </button>
          )}
        </div>

        {message && <p className="verify-message">{message}</p>}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="verify-container"><p>Cargando...</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}
