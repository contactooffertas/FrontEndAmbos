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

  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl);
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
      const res = await fetch("https://vercel-backend-ochre-nine.vercel.app/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data: { message?: string } = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Error al verificar");
      } else {
        setMessage("Cuenta verificada correctamente ✅");
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
    try {
      await fetch("https://vercel-backend-ochre-nine.vercel.app/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setTimer(60);
      setMessage("Nuevo código enviado 📩");
    } catch {
      setMessage("Error al reenviar código");
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
            <button className="resend-button" onClick={handleResend}>
              Reenviar código
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
