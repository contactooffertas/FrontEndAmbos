"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff, ShoppingBag } from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";
const CHECK_EVERY_MS = 15000;
const FAILURES_BEFORE_OUTAGE = 2;

export default function ApiHealthGuard({ children }: { children: React.ReactNode }) {
  const [outage, setOutage] = useState(false);
  const [checking, setChecking] = useState(false);
  const failures = useRef(0);

  const checkApi = useCallback(async (manual = false) => {
    if (manual) setChecking(true);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 7000);
      const response = await fetch(`${API}/health?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!response.ok) throw new Error("API unavailable");

      failures.current = 0;
      setOutage(false);
    } catch {
      failures.current += 1;
      if (failures.current >= FAILURES_BEFORE_OUTAGE) setOutage(true);
    } finally {
      if (manual) setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkApi();
    const interval = window.setInterval(() => void checkApi(), CHECK_EVERY_MS);
    const onOnline = () => void checkApi(true);
    window.addEventListener("online", onOnline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [checkApi]);

  if (!outage) return <>{children}</>;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(circle at 78% 16%, rgba(249,115,22,.18), transparent 28%), linear-gradient(155deg,#0b1220 0%,#122033 60%,#1a120d 100%)",
        color: "#fff",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          textAlign: "center",
          borderRadius: 26,
          padding: "42px 24px",
          background: "rgba(15,23,42,.88)",
          border: "1px solid rgba(249,115,22,.28)",
          boxShadow: "0 26px 90px rgba(0,0,0,.42)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: 24,
            margin: "0 auto 18px",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg,#f97316,#ea580c)",
            boxShadow: "0 14px 38px rgba(249,115,22,.28)",
          }}
        >
          <ShoppingBag size={38} strokeWidth={2.1} />
        </div>

        <div
          style={{
            color: "#fb923c",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Rosario Market
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(30px,7vw,46px)",
            lineHeight: 1.08,
            fontWeight: 950,
            letterSpacing: "-.035em",
          }}
        >
          Estamos teniendo un inconveniente
        </h1>

        <p
          style={{
            maxWidth: 430,
            margin: "14px auto 0",
            color: "#cbd5e1",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Nuestros servidores están tardando más de lo habitual en responder.
          Tu cuenta y tus datos siguen guardados. Intentá nuevamente en unos instantes.
        </p>

        <div
          style={{
            margin: "20px auto 0",
            maxWidth: 430,
            display: "flex",
            alignItems: "center",
            gap: 10,
            textAlign: "left",
            padding: "11px 13px",
            borderRadius: 13,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.08)",
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          <WifiOff size={18} color="#fb923c" style={{ flex: "0 0 auto" }} />
          No necesitás volver a registrarte ni repetir tus datos.
        </div>

        <button
          onClick={() => void checkApi(true)}
          disabled={checking}
          style={{
            marginTop: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minWidth: 170,
            padding: "12px 18px",
            border: 0,
            borderRadius: 12,
            background: "#f97316",
            color: "#fff",
            fontWeight: 900,
            cursor: checking ? "wait" : "pointer",
            opacity: checking ? 0.75 : 1,
            boxShadow: "0 10px 28px rgba(249,115,22,.24)",
          }}
        >
          <RefreshCw size={17} />
          {checking ? "Comprobando..." : "Intentar de nuevo"}
        </button>

        <p style={{ margin: "20px 0 0", color: "#64748b", fontSize: 11 }}>
          Gracias por tu paciencia · Rosario Market
        </p>
      </section>
    </main>
  );
}
