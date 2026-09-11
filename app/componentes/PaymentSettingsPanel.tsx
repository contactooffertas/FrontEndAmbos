"use client";

import { useEffect, useState } from "react";
import { Landmark, Save } from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";

type PaymentSettings = {
  bna: { enabled: boolean; paymentLink: string };
  santafe: { enabled: boolean; paymentLink: string };
  mercadopago: { enabled: boolean; paymentLink: string };
};

const EMPTY_SETTINGS: PaymentSettings = {
  bna: { enabled: false, paymentLink: "" },
  santafe: { enabled: false, paymentLink: "" },
  mercadopago: { enabled: false, paymentLink: "" },
};

export default function PaymentSettingsPanel({
  token,
  compact = false,
}: {
  token: string | null;
  compact?: boolean;
}) {
  const [settings, setSettings] = useState<PaymentSettings>(EMPTY_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadingSettings(false);
      return;
    }

    fetch(`${API}/business/payment-settings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.paymentMethods) {
          setSettings({
            bna: {
              enabled: Boolean(data.paymentMethods.bna?.enabled),
              paymentLink: data.paymentMethods.bna?.paymentLink || "",
            },
            santafe: {
              enabled: Boolean(data.paymentMethods.santafe?.enabled),
              paymentLink: data.paymentMethods.santafe?.paymentLink || "",
            },
            mercadopago: {
              enabled: Boolean(data.paymentMethods.mercadopago?.enabled),
              paymentLink: data.paymentMethods.mercadopago?.paymentLink || "",
            },
          });
        }
      })
      .finally(() => setLoadingSettings(false));
  }, [token]);

  const save = async () => {
    if (!token) return;

    setSavingSettings(true);
    try {
      const res = await fetch(`${API}/business/payment-settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethods: settings }),
      });

      const data = await res.json();
      const Swal = (await import("sweetalert2")).default;

      if (!res.ok) {
        await Swal.fire({
          icon: "error",
          title: data.message || "No se pudo guardar",
        });
        return;
      }

      setSettings({
        bna: {
          enabled: Boolean(data.paymentMethods?.bna?.enabled),
          paymentLink: data.paymentMethods?.bna?.paymentLink || "",
        },
        santafe: {
          enabled: Boolean(data.paymentMethods?.santafe?.enabled),
          paymentLink: data.paymentMethods?.santafe?.paymentLink || "",
        },
        mercadopago: {
          enabled: Boolean(data.paymentMethods?.mercadopago?.enabled),
          paymentLink: data.paymentMethods?.mercadopago?.paymentLink || "",
        },
      });

      await Swal.fire({
        icon: "success",
        title: "Métodos de cobro guardados",
        text: "Los cambios ya están disponibles también en tu panel de órdenes.",
        timer: 2200,
        showConfirmButton: false,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loadingSettings || !token) return null;

  return (
    <section
      style={{
        marginBottom: compact ? 0 : "1rem",
        padding: "1rem",
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 6px 20px rgba(15,23,42,.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 4,
        }}
      >
        <Landmark size={18} color="#f97316" />
        <strong style={{ color: "#111827" }}>Métodos de cobro</strong>
      </div>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        Elegí cómo querés cobrar. Pegá únicamente el link oficial de tu comercio.
        Nunca cargues usuario, contraseña, token bancario ni datos de tarjeta.
      </p>

      {([
        ["bna", "BNA · +Pagos Nación"],
        ["santafe", "Banco Santa Fe · PlusPagos"],
        ["mercadopago", "Mercado Pago"],
      ] as const).map(([key, label]) => (
        <div
          key={key}
          style={{
            display: "grid",
            gridTemplateColumns: "auto minmax(0,1fr)",
            gap: 10,
            alignItems: "center",
            padding: "10px 0",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <input
            type="checkbox"
            checked={settings[key].enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                [key]: { ...prev[key], enabled: e.target.checked },
              }))
            }
            aria-label={`Habilitar ${label}`}
          />

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#1f2937",
                marginBottom: 5,
              }}
            >
              {label}
            </div>

            <input
              type="url"
              placeholder="https://link-oficial-de-pago..."
              value={settings[key].paymentLink}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  [key]: { ...prev[key], paymentLink: e.target.value },
                }))
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #d1d5db",
                borderRadius: 9,
                padding: "9px 10px",
                fontSize: 12,
              }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={savingSettings}
        style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: 0,
          borderRadius: 9,
          background: "#f97316",
          color: "#fff",
          padding: "9px 13px",
          fontWeight: 800,
          cursor: savingSettings ? "wait" : "pointer",
          opacity: savingSettings ? 0.75 : 1,
        }}
      >
        <Save size={14} />
        {savingSettings ? "Guardando..." : "Guardar métodos de cobro"}
      </button>
    </section>
  );
}
