"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import "../styles/ordenes.css";
import {
  Package, Clock, Truck, CheckCircle, RotateCcw, Bell, RefreshCw, Trash2, Star,
  Landmark, ShieldCheck, XCircle, Save,
} from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";

interface OrderItem {
  productId: string; name: string; quantity: number; price: number;
}

interface RatingData {
  rating: number | null; comment: string; ratedAt: string | null;
}

interface SellerOrder {
  _id: string;
  date?: string | null;
  total?: number | null;
  status?: string | null;
  businessName?: string;
  businessPhone?: string;
  buyer?: {
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    buyerRating?: number | null;
    buyerTotalRatings?: number | null;
  } | null;
  items?: OrderItem[] | null;
  buyerRating?:  RatingData | null;
  sellerRating?: RatingData | null;
  payment?: {
    method?: "direct" | "bna" | "santafe";
    status?: "unpaid" | "pending" | "verifying" | "paid" | "rejected" | "refunded";
    refundStatus?: "none" | "requested" | "refunded";
    initiatedAt?: string | null;
    returnedAt?: string | null;
    confirmedAt?: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pendiente",  color: "#f59e0b", icon: <Clock size={14} /> },
  confirmed: { label: "Confirmado", color: "#3b82f6", icon: <CheckCircle size={14} /> },
  shipped:   { label: "Enviado",    color: "#0ea5e9", icon: <Truck size={14} /> },
  delivered: { label: "Entregado",  color: "#10b981", icon: <CheckCircle size={14} /> },
  returned:  { label: "Devuelto",   color: "#ef4444", icon: <RotateCcw size={14} /> },
};

type FilterTab = "all" | "pending" | "shipped" | "delivered" | "returned";

// ── Star picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-picker">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`star-btn${n <= (hover || value) ? " active" : ""}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        >
          <Star size={24} fill={n <= (hover || value) ? "#f59e0b" : "none"} />
        </button>
      ))}
      {value > 0 && (
        <span className="star-label">{["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][value]}</span>
      )}
    </div>
  );
}

// ── Bloque para calificar al comprador ────────────────────────────────────────
function RateBuyerBlock({
  order,
  token,
  onRated,
}: {
  order: SellerOrder;
  token: string | null;
  onRated: (orderId: string, data: RatingData) => void;
}) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Ya calificó
  if (order.buyerRating?.rating) {
    return (
      <div className="rate-block rate-block--done rate-block--buyer">
        <div className="rate-block-done-stars">
          {[1,2,3,4,5].map(n => (
            <Star key={n} size={16} fill={n <= (order.buyerRating?.rating ?? 0) ? "#60a5fa" : "none"} color={n <= (order.buyerRating?.rating ?? 0) ? "#60a5fa" : "#374151"} />
          ))}
        </div>
        <p className="rate-block-done-text">
          Calificaste a este comprador con <strong>{order.buyerRating.rating}/5</strong>
        </p>
        {order.buyerRating.comment && (
          <p className="rate-block-done-comment">"{order.buyerRating.comment}"</p>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!rating) { setError("Seleccioná una calificación"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/orders/${order._id}/rate-buyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.ok) {
        onRated(order._id, { rating, comment, ratedAt: new Date().toISOString() });
      } else {
        const d = await res.json();
        setError(d.message || "Error al calificar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rate-block rate-block--buyer">
      <div className="rate-block-header">
        <span className="rate-block-icon">👤</span>
        <div>
          <p className="rate-block-title">Calificar a {order.buyer?.name || "el comprador"}</p>
          <p className="rate-block-subtitle">¿Cómo fue la experiencia con este comprador?</p>
        </div>
      </div>

      {/* Reputación actual del comprador */}
      {(order.buyer?.buyerTotalRatings ?? 0) > 0 && (
        <div className="rate-block-current">
          <Star size={13} fill="#60a5fa" color="#60a5fa" />
          <span>Reputación actual: <strong>{order.buyer?.buyerRating?.toFixed(1)}</strong> ({order.buyer?.buyerTotalRatings} calificaciones)</span>
        </div>
      )}

      <StarPicker value={rating} onChange={setRating} />

      <textarea
        className="rate-block-textarea"
        placeholder="Comentario opcional (ej: pagó rápido, buen comprador...)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
      />

      {error && <p className="rate-block-error">{error}</p>}

      <button
        className={`rate-block-btn rate-block-btn--buyer${!rating ? " disabled" : ""}`}
        onClick={handleSubmit}
        disabled={!rating || loading}
      >
        {loading ? "Enviando..." : "Calificar comprador"}
      </button>
    </div>
  );
}

function PaymentSettingsPanel({ token }: { token: string | null }) {
  const [settings, setSettings] = useState({
    bna: { enabled: false, paymentLink: "" },
    santafe: { enabled: false, paymentLink: "" },
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/business/payment-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.paymentMethods) setSettings(data.paymentMethods);
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
        await Swal.fire({ icon: "error", title: data.message || "No se pudo guardar" });
        return;
      }
      setSettings(data.paymentMethods);
      await Swal.fire({
        icon: "success",
        title: "Métodos de cobro guardados",
        text: "Rosario Market nunca guarda tu usuario, contraseña ni datos de tarjeta.",
        timer: 2200,
        showConfirmButton: false,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loadingSettings) return null;

  return (
    <div style={{
      marginBottom: "1rem", padding: "1rem", borderRadius: 16,
      background: "#fff", border: "1px solid #e5e7eb",
      boxShadow: "0 6px 20px rgba(15,23,42,.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
        <Landmark size={18} color="#f97316" />
        <strong style={{ color: "#111827" }}>Métodos de cobro</strong>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
        Pegá únicamente el link oficial de cobro de tu comercio. Nunca cargues usuario, contraseña, token bancario ni datos de tarjeta.
      </p>

      {([
        ["bna", "BNA · +Pagos Nación"],
        ["santafe", "Banco Santa Fe · PlusPagos"],
      ] as const).map(([key, label]) => (
        <div key={key} style={{
          display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 10,
          alignItems: "center", padding: "10px 0", borderTop: "1px solid #f1f5f9",
        }}>
          <input
            type="checkbox"
            checked={settings[key].enabled}
            onChange={(e) => setSettings((prev) => ({
              ...prev,
              [key]: { ...prev[key], enabled: e.target.checked },
            }))}
            aria-label={`Habilitar ${label}`}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", marginBottom: 5 }}>{label}</div>
            <input
              type="url"
              placeholder="https://link-oficial-de-pago..."
              value={settings[key].paymentLink}
              onChange={(e) => setSettings((prev) => ({
                ...prev,
                [key]: { ...prev[key], paymentLink: e.target.value },
              }))}
              style={{
                width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db",
                borderRadius: 9, padding: "9px 10px", fontSize: 12,
              }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={savingSettings}
        style={{
          marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
          border: 0, borderRadius: 9, background: "#f97316", color: "#fff",
          padding: "9px 13px", fontWeight: 800, cursor: "pointer",
        }}
      >
        <Save size={14} /> {savingSettings ? "Guardando..." : "Guardar cobros"}
      </button>
    </div>
  );
}

function PaymentStatusBox({
  order,
  onRefresh,
}: {
  order: SellerOrder;
  onRefresh: () => void;
}) {
  const payment = order.payment;
  if (!payment || payment.method === "direct") {
    return (
      <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 10, background: "#f8fafc", color: "#64748b", fontSize: 12 }}>
        Trato directo: el pago se coordina con el comprador.
      </div>
    );
  }

  const providerLabel = payment.method === "bna" ? "BNA +Pagos Nación" : "Banco Santa Fe / PlusPagos";
  const states: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "Pago iniciado", bg: "#fff7ed", color: "#c2410c" },
    verifying: { label: "Esperando verificación", bg: "#eff6ff", color: "#1d4ed8" },
    paid: { label: "Pago confirmado", bg: "#ecfdf5", color: "#047857" },
    rejected: { label: "Pago no acreditado", bg: "#fef2f2", color: "#b91c1c" },
    refunded: { label: "Pago devuelto", bg: "#f8fafc", color: "#475569" },
    unpaid: { label: "Sin pago", bg: "#f8fafc", color: "#64748b" },
  };
  const state = states[payment.status || "unpaid"] || states.unpaid;
  const token = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;

  const action = async (kind: "confirm" | "reject" | "refunded") => {
    const Swal = (await import("sweetalert2")).default;
    const texts = {
      confirm: "Confirmá solo si verificaste la acreditación en tu cuenta o portal bancario.",
      reject: "Marcá como no acreditado solo si comprobaste que el pago no ingresó.",
      refunded: "Rosario Market no devuelve el dinero. Marcá esto solo después de hacer el reintegro en el proveedor.",
    };
    const ask = await Swal.fire({
      icon: kind === "confirm" ? "question" : "warning",
      title: kind === "confirm" ? "¿Confirmar pago?" : kind === "reject" ? "¿Pago no acreditado?" : "¿Devolución realizada?",
      text: texts[kind],
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: kind === "confirm" ? "#16a34a" : "#ef4444",
    });
    if (!ask.isConfirmed) return;

    const res = await fetch(`${API}/orders/${order._id}/payment/${kind}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      await Swal.fire({ icon: "error", title: data.message || "No se pudo actualizar el pago" });
      return;
    }
    onRefresh();
  };

  return (
    <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 12, padding: 11, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{providerLabel}</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: state.color }}>{state.label}</div>
        </div>
        <div style={{ background: state.bg, color: state.color, borderRadius: 99, padding: "5px 9px", fontSize: 10, fontWeight: 900 }}>
          {payment.status === "paid" ? <ShieldCheck size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> : null}
          {state.label}
        </div>
      </div>

      {payment.status !== "paid" && payment.status !== "refunded" && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
          No despaches el pedido hasta confirmar la acreditación. El regreso del comprador desde el banco no prueba por sí solo que el dinero haya ingresado.
        </p>
      )}

      {payment.status === "verifying" && (
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
          <button onClick={() => action("confirm")} style={{ border: 0, borderRadius: 8, padding: "7px 10px", background: "#16a34a", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 11 }}>
            Confirmar acreditación
          </button>
          <button onClick={() => action("reject")} style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "7px 10px", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: "pointer", fontSize: 11 }}>
            No acreditado
          </button>
        </div>
      )}

      {payment.refundStatus === "requested" && payment.status === "paid" && (
        <div style={{ marginTop: 9, background: "#fff7ed", borderRadius: 9, padding: 9, fontSize: 11, color: "#9a3412" }}>
          El comprador solicitó devolución. Procesá el reintegro en {providerLabel} y después registralo acá.
          <div><button onClick={() => action("refunded")} style={{ marginTop: 7, border: 0, borderRadius: 7, padding: "6px 9px", background: "#f97316", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 10 }}>Marcar reintegro realizado</button></div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function OrdenesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [orders,      setOrders]      = useState<SellerOrder[]>([]);
  const [fetching,    setFetching]    = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [filterTab,   setFilterTab]   = useState<FilterTab>("all");

  const prevOrderIds = useRef<Set<string>>(new Set());
  const token = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch(`${API}/orders/seller`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const raw = await res.json();
      const data: SellerOrder[] = Array.isArray(raw)
        ? raw.filter((o:any) => o && o._id).map((o:any) => ({
            ...o,
            _id: String(o._id),
            status: typeof o.status === "string" ? o.status : "pending",
            total: Number.isFinite(Number(o.total)) ? Number(o.total) : 0,
            date: o.date || o.createdAt || null,
            buyer: o.buyer && typeof o.buyer === "object" ? o.buyer : null,
            items: Array.isArray(o.items) ? o.items : [],
          }))
        : [];
      setOrders(data);

      const incoming = new Set(data.map(o => o._id));
      const isNew    = new Set<string>();
      incoming.forEach(id => { if (!prevOrderIds.current.has(id)) isNew.add(id); });
      if (isNew.size > 0 && prevOrderIds.current.size > 0) {
        setNewOrderIds(isNew);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("📦 Nueva orden recibida", {
            body: `Tenés ${isNew.size} pedido${isNew.size > 1 ? "s" : ""} nuevo${isNew.size > 1 ? "s" : ""}`,
          });
        }
      }
      prevOrderIds.current = incoming;
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleShip = async (orderId: string) => {
    setDispatching(orderId);
    try {
      const res = await fetch(`${API}/orders/${orderId}/ship`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: "shipped" } : o));
        setNewOrderIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
      }
    } finally {
      setDispatching(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      title: "¿Borrar esta orden?", text: "Se eliminará del historial permanentemente.",
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Sí, borrar", cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    const res = await fetch(`${API}/orders/${orderId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setOrders(prev => prev.filter(o => o._id !== orderId));
      Swal.fire({ icon: "success", title: "Orden eliminada", timer: 1500, showConfirmButton: false });
    }
  };

  // Actualiza buyerRating localmente tras calificar
  const handleBuyerRated = (orderId: string, data: RatingData) => {
    setOrders(prev =>
      prev.map(o => o._id === orderId ? { ...o, buyerRating: data } : o)
    );
  };

  if (loading || !user) return null;

  const pendingCount = orders.filter(o => (o.status || "pending") === "pending").length;

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all",       label: `Todos (${orders.length})` },
    { id: "pending",   label: `Pendientes (${orders.filter(o => (o.status || "pending") === "pending").length})` },
    { id: "shipped",   label: `Enviados (${orders.filter(o => (o.status || "pending") === "shipped").length})` },
    { id: "delivered", label: `Entregados (${orders.filter(o => (o.status || "pending") === "delivered").length})` },
    { id: "returned",  label: `Devueltos (${orders.filter(o => (o.status || "pending") === "returned").length})` },
  ];

  const filtered = filterTab === "all" ? orders : orders.filter(o => o.status === filterTab);

  return (
    <MainLayout>
      <div className="ordenes-page">

        {/* Header */}
        <div className="ordenes-header">
          <div className="ordenes-header-icon"><Package size={22} color="#fff" /></div>
          <div>
            <h1 className="ordenes-header-title">Mis Órdenes</h1>
            <p className="ordenes-header-sub">{orders.length} pedido{orders.length !== 1 ? "s" : ""} en total</p>
          </div>
          {pendingCount > 0 && (
            <div className="ordenes-pending-badge">
              <Bell size={15} color="#f97316" />
              <span>{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</span>
            </div>
          )}
          <button className="ordenes-refresh-btn" onClick={() => fetchOrders()}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>

        <PaymentSettingsPanel token={token} />

        {/* Filtros */}
        <div className="ordenes-tabs">
          {FILTER_TABS.map(t => (
            <button
              key={t.id}
              className={`ordenes-tab${filterTab === t.id ? " active" : ""}`}
              onClick={() => setFilterTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {fetching ? (
          <div className="ordenes-loading">
            <div className="ordenes-spinner" />
            <p>Cargando órdenes...</p>
          </div>
        ) : filtered.length === 0 ? (
<div className="ordenes-empty">
  <Package size={52} strokeWidth={1} />
  <h3>
    {filterTab === "all"
      ? "Sin pedidos aún"
      : "Sin pedidos en esta categoría"}
  </h3>
  <p>
    {filterTab === "all"
      ? "Cuando alguien compre tus productos, aparecerán acá."
      : "Probá con otro filtro."}
  </p>

  <div style={{ marginTop: "1rem", textAlign: "left" }}>
    <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
      Información importante sobre el envío:
    </p>
    <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9rem", lineHeight: "1.6" }}>
      <li>El envío se arregla directamente entre el vendedor (vos) y el comprador.</li>
      <li>El comprador debe contactarte primero para coordinar costos y detalles.</li>
      <li>Es fundamental que hayas cargado correctamente tu número de celular.</li>
      <li>Los costos y demás condiciones de entrega se definen por WhatsApp.</li>
    </ul>
  </div>
</div>
        ) : (
          <div className="ordenes-list">
            {filtered.map(order => {
              const status = order.status || "pending";
              const si    = STATUS_LABELS[status] || STATUS_LABELS.pending;
              const isNew = newOrderIds.has(order._id);
              return (
                <div key={order._id} className={`orden-card${isNew ? " is-new" : ""}`}>

                  {/* Cabecera */}
                  <div className="orden-card-head">
                    <div>
                      {isNew && <div className="orden-new-badge">🔔 NUEVO</div>}
                      <p className="orden-id">#{order._id.slice(-8).toUpperCase()}</p>
                      <p className="orden-buyer">{order.buyer?.name || "Comprador"}</p>
                      <p className="orden-meta">
                        {order.buyer?.email}{order.buyer?.email ? " · " : ""}
                        {order.date ? new Date(order.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "Sin fecha"}
                      </p>
                      {/* Reputación comprador en cabecera */}
                      {(order.buyer?.buyerTotalRatings ?? 0) > 0 && (
                        <div className="orden-buyer-rep">
                          <Star size={11} fill="#60a5fa" color="#60a5fa" />
                          <span>{order.buyer?.buyerRating?.toFixed(1)} reputación ({order.buyer?.buyerTotalRatings} votes)</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="orden-status-badge" style={{ background: `${si.color}18`, color: si.color }}>
                        {si.icon} {si.label}
                      </div>
                      {(status === "delivered" || status === "returned") && (
                        <button className="btn-borrar-orden" onClick={() => handleDelete(order._id)} title="Borrar orden">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="orden-items">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="orden-item-row">
                        <span className="orden-item-name">
                          <span className="orden-item-qty">{item.quantity}x</span>{item.name}
                        </span>
                        <span className="orden-item-price">
                          ${(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                    <div className="orden-total-row">
                      <span className="orden-total-label">Total</span>
                      <span className="orden-total-val">${Number(order.total || 0).toLocaleString("es-AR")}</span>
                    </div>
              <h3 style={{ color: "#ffffff" }}>
            Esperá la confirmación del comprador. 
            Una vez que reciba el pedido y confirme la entrega, vas a poder calificar la operación y dejar tu valoración.
             </h3>
                  </div>
                  <PaymentStatusBox order={order} onRefresh={() => fetchOrders(true)} />

                  {/* Acciones según estado */}
                  <div className="orden-actions">
                        {status === "pending" && (
                      <>
                        <button
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "#0d6efd",
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            opacity: dispatching === order._id ? 0.7 : 1,
                          }}
                          onClick={() => handleShip(order._id)}
                          disabled={dispatching === order._id || (!!order.payment?.method && order.payment.method !== "direct" && order.payment.status !== "paid")}>
                          <Truck size={15} />
                          {dispatching === order._id
                            ? "Despachando..."
                            : (!!order.payment?.method && order.payment.method !== "direct" && order.payment.status !== "paid")
                              ? "Esperando pago"
                              : "Despachar pedido"}
                        </button>
                        <p
                          style={{
                            marginTop: "8px",
                            backgroundColor: "#fff3cd",
                            color: "#856404",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}>
                          ⚠️ Antes de despachar el pedido, asegurate de arreglar
                          el gasto de envío y todos los detalles logísticos con
                          el comprador, ya tiene tu numero de whatsapp si lo cargaste correctamente o contactalo por mail que esta debajo de su nombre.
                        </p>
                      </>
                    )}
                    {status === "delivered" && (
                      <p className="orden-delivered-msg">
                        ✅ Vendido — el comprador confirmó la recepción
                      </p>
                    )}
                    {status === "returned" && (
                      <p className="orden-returned-msg">
                        ↩️ Devuelto — el stock fue restituido automáticamente
                      </p>
                    )}
                  </div>

                  {/* ── Calificar comprador — solo en delivered ── */}
                  {status === "delivered" && (
                    <RateBuyerBlock
                      order={order}
                      token={token}
                      onRated={handleBuyerRated}
                    />
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </MainLayout>
  );
}





