"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import "../styles/ordenes.css";
import {
  Package, Clock, Truck, CheckCircle, RotateCcw, Bell, RefreshCw, Trash2, Star,
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
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pendiente",  color: "#f59e0b", icon: <Clock size={14} /> },
  confirmed: { label: "Confirmado", color: "#3b82f6", icon: <CheckCircle size={14} /> },
  shipped:   { label: "Enviado",    color: "#8b5cf6", icon: <Truck size={14} /> },
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
    <div className="orden-shipping-note">
                          <span className="orden-shipping-note-icon">!</span>
                          <p>
                            <strong>Antes de despachar</strong>
                            Coordiná el costo de envío y los detalles de entrega con el comprador. Podés usar su WhatsApp si lo cargaste correctamente o contactarlo por email.
                          </p>
                        </div>
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





