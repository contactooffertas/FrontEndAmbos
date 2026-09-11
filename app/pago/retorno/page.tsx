"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../../componentes/MainLayout";
import { CheckCircle, Clock, ShieldCheck } from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";

function ReturnContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Registrando tu regreso del proveedor de pago...");

  useEffect(() => {
    const orderId = params.get("orderId");
    const token = localStorage.getItem("marketplace_token");

    if (!orderId || !token) {
      setState("error");
      setMessage("No pudimos identificar el pedido. Entrá a Mis compras para revisar su estado.");
      return;
    }

    fetch(`${API}/orders/${orderId}/payment/returned`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "No se pudo registrar el pago");
        setState("ok");
        setMessage(data.message || "Pago informado. Estamos esperando la confirmación de acreditación.");
      })
      .catch((error) => {
        setState("error");
        setMessage(error.message || "No se pudo registrar el regreso.");
      });
  }, [params]);

  return (
    <MainLayout>
      <main style={{ minHeight: "65vh", display: "grid", placeItems: "center", padding: "2rem 1rem" }}>
        <section style={{
          width: "100%", maxWidth: 520, background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 22, padding: "1.5rem", textAlign: "center",
          boxShadow: "0 14px 40px rgba(15,23,42,.08)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: "0 auto 1rem",
            display: "grid", placeItems: "center",
            background: state === "ok" ? "#ecfdf5" : state === "error" ? "#fef2f2" : "#fff7ed",
            color: state === "ok" ? "#047857" : state === "error" ? "#b91c1c" : "#c2410c",
          }}>
            {state === "ok" ? <CheckCircle size={27} /> : state === "error" ? <ShieldCheck size={27} /> : <Clock size={27} />}
          </div>
          <h1 style={{ margin: 0, color: "#142033", fontSize: "1.35rem" }}>
            {state === "ok" ? "Pago informado" : state === "error" ? "Revisá tu pedido" : "Verificando regreso"}
          </h1>
          <p style={{ color: "#64748b", lineHeight: 1.55, fontSize: 13 }}>{message}</p>

          {state === "ok" && (
            <div style={{ background: "#eff6ff", borderRadius: 12, padding: 11, color: "#1d4ed8", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
              El envío sigue bloqueado hasta que el vendedor confirme en su banco o Mercado Pago que el dinero se acreditó realmente.
            </div>
          )}

          <button
            onClick={() => router.push("/panel?tab=purchases")}
            style={{
              border: 0, borderRadius: 10, padding: "10px 15px",
              background: "#f97316", color: "#fff", fontWeight: 850, cursor: "pointer",
            }}
          >
            Ver mis compras
          </button>
        </section>
      </main>
    </MainLayout>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center" }}>Verificando pago...</div>}>
      <ReturnContent />
    </Suspense>
  );
}
