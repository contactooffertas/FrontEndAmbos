"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import ReportModal from "../componentes/reportModal";

import {
  ShoppingCart,
  Package,
  Heart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  CheckCircle,
  Clock,
  ArrowRight,
  Truck,
  X,
  RotateCcw,
  MessageCircle,
  Store,
  Star,
} from "lucide-react";
import "../styles/panel.css";

type Tab = "cart" | "purchases" | "favorites";

interface CartItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  discount?: number;
  quantity: number;
  stock: number;
  image?: string;
  businessId?: string;
  businessName?: string;
  businessPhone?: string;
}

interface RatingData {
  rating: number | null;
  comment: string;
  ratedAt: string | null;
}

interface Purchase {
  _id: string;
  date: string;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "returned";
  items: { name: string; quantity: number; price: number }[];
  businessName?: string;
  businessPhone?: string;
  businessId?: string;
  buyerRating?: RatingData | null;
  sellerRating?: RatingData | null;
}

const STATUS_MAP = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: <Clock size={13} /> },
  confirmed: {
    label: "Confirmado",
    color: "#3b82f6",
    icon: <CheckCircle size={13} />,
  },
  shipped: { label: "En camino", color: "#8b5cf6", icon: <Truck size={13} /> },
  delivered: {
    label: "Entregado",
    color: "#10b981",
    icon: <CheckCircle size={13} />,
  },
  returned: {
    label: "Devuelto",
    color: "#ef4444",
    icon: <RotateCcw size={13} />,
  },
};

const API = "https://new-backend-lovat.vercel.app/api";

interface BusinessGroup {
  businessId: string;
  businessName: string;
  phone: string;
  items: CartItem[];
  subtotal: number;
}

function buildBusinessGroups(items: CartItem[]): BusinessGroup[] {
  const map: Record<string, BusinessGroup> = {};
  for (const item of items) {
    const bizId = item.businessId || "sin-negocio";
    if (!map[bizId]) {
      map[bizId] = {
        businessId: bizId,
        businessName: item.businessName || "Negocio",
        phone: item.businessPhone || "",
        items: [],
        subtotal: 0,
      };
    }
    const unitPrice = item.discount
      ? item.price * (1 - item.discount / 100)
      : item.price;
    map[bizId].items.push(item);
    map[bizId].subtotal += unitPrice * item.quantity;
  }
  return Object.values(map);
}

function buildWhatsappUrl(group: BusinessGroup): string {
  const lines = group.items.map((item) => {
    const unitPrice = item.discount
      ? item.price * (1 - item.discount / 100)
      : item.price;
    return `- ${item.quantity}x ${item.name}: $${unitPrice.toLocaleString("es-AR")} c/u = $${(unitPrice * item.quantity).toLocaleString("es-AR")}`;
  });
  const mensaje =
    `Hola! Realize un pedido en tu tienda desde Offerton:\n\n` +
    lines.join("\n") +
    `\n\nTotal: $${group.subtotal.toLocaleString("es-AR")}\n\n` +
    `Quedo a la espera para coordinar pago y envio.`;
  const phone = group.phone.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}

// ── Star picker ──────────────────────────────────────────────────────────────
function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none",
            borderColor: "#f59e0b",
            cursor: "pointer",
            padding: 2,
            color: n <= (hover || value) ? "#f59e0b" : "rgba(255,255,255,0.2)",
            transition: "color 0.15s",
          }}
        >
          <Star size={22} fill={n <= (hover || value) ? "#f59e0b" : "#656565"} />
        </button>
      ))}
    </div>
  );
}

// ── Bloque de calificación para el comprador (califica al negocio) ────────────
function RateSellerBlock({
  order,
  onRated,
}: {
  order: Purchase;
  onRated: (orderId: string, data: RatingData) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (order.sellerRating?.rating) {
    return (
      <div
        style={{
          marginTop: "0.75rem",
          padding: "0.75rem",
          background: "rgba(245,158,11,0.08)",
          borderRadius: 10,
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            color: "#fbbf24",
            fontWeight: 600,
          }}
        >
          ★ Tu calificación al negocio: {order.sellerRating.rating}/5
        </p>
        {order.sellerRating.comment && (
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            "{order.sellerRating.comment}"
          </p>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    const token = localStorage.getItem("marketplace_token");
    const res = await fetch(`${API}/orders/${order._id}/rate-seller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, comment }),
    });
    setLoading(false);
    if (res.ok) {
      onRated(order._id, {
        rating,
        comment,
        ratedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      style={{
        marginTop: "0.75rem",
        padding: "0.85rem 1rem",
        background: "rgba(11, 245, 19, 0.06)",
        borderRadius: 12,
        border: "1px solid rgba(245,158,11,0.18)",
      }}
    >
      <p
        style={{
          margin: "0 0 0.5rem",
          fontSize: "0.82rem",
          color: "#1c1b18",
          fontWeight: 700,
        }}
      >
        ¿Cómo fue tu experiencia con {order.businessName || "el negocio"}?
      </p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        placeholder="Comentario opcional..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        style={{
          marginTop: "0.5rem",
          width: "100%",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          color: "#000000",
          padding: "0.5rem",
          fontSize: "0.82rem",
          resize: "vertical",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!rating || loading}
        style={{
          marginTop: "0.5rem",
          background: rating ? "#f97316" : "rgba(21, 20, 20, 0.53)",
          color: "#050c5b",
          border: "none",
          borderRadius: 8,
          padding: "0.45rem 1.2rem",
          fontWeight: 700,
          fontSize: "0.82rem",
          cursor: rating ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Enviando..." : "Calificar negocio"}
      </button>
    </div>
  );
}

// ── Vista del panel del comprador ─────────────────────────────────────────────
function BusinessGroupCard({ group }: { group: BusinessGroup }) {
  const hasPhone = group.phone.trim() !== "";
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Store size={15} color="#f97316" />
        <span
          style={{ fontWeight: 700, color: "#fdba74", fontSize: "0.92rem" }}
        >
          {group.businessName}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {group.items.map((item) => {
          const unitPrice = item.discount
            ? item.price * (1 - item.discount / 100)
            : item.price;
          return (
            <div
              key={item._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <span>
                {item.quantity}x {item.name}
              </span>
              <span style={{ color: "#fff", fontWeight: 600 }}>
                ${(unitPrice * item.quantity).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "0.5rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem" }}>
          Subtotal:{" "}
          <strong style={{ color: "#fff" }}>
            ${group.subtotal.toLocaleString()}
          </strong>
        </span>
        {hasPhone ? (
          <a
            href={buildWhatsappUrl(group)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#25d366",
              color: "#fff",
              borderRadius: 10,
              padding: "0.45rem 1rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <MessageCircle size={14} /> Avisar por WhatsApp
          </a>
        ) : (
          <span
            style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}
          >
            Sin telefono cargado
          </span>
        )}
      </div>
    </div>
  );
}



// ─── Componente principal ─────────────────────────────────────────────────────
function PanelContent() {
  const { user, loading } = useAuth();
  const {
    cart,
    cartCount,
    cartTotal,
    loading: cartLoading,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
  } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("tab") as Tab) || "cart";

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [checkoutGroups, setCheckoutGroups] = useState<BusinessGroup[]>([]);
  const [checkoutDone, setCheckoutDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  const loadPurchases = () => {
    if (!user) return;
    const token = localStorage.getItem("marketplace_token");
    fetch(`${API}/orders/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setPurchases(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    loadPurchases();
  }, [user]);

  if (loading || !user) return null;

  // Actualiza sellerRating localmente tras calificar
  const handleSellerRated = (orderId: string, data: RatingData) => {
    setPurchases((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, sellerRating: data } : o)),
    );
  };

  const handleCheckout = async () => {
    const Swal = (await import("sweetalert2")).default;
    if (cart.length === 0) {
      Swal.fire({ icon: "warning", title: "Tu carrito esta vacio" });
      return;
    }

    const groups = buildBusinessGroups(cart as CartItem[]);
    const businessListHtml = groups
      .map(
        (g) =>
          `<div style="text-align:left;margin-bottom:0.5rem">
        <strong style="color:#f97316">${g.businessName}</strong><br/>
        ${g.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}<br/>
        <span style="color:#6b7280;font-size:.82rem">Subtotal: $${g.subtotal.toLocaleString()}</span>
      </div>`,
      )
      .join("");

    const { isConfirmed } = await Swal.fire({
      title: "Confirmar pedido",
      html: `<p style="margin-bottom:1rem">Total: <strong>$${cartTotal.toLocaleString()}</strong></p>${businessListHtml}
             <p style="color:#6b7280;font-size:.82rem;margin-top:1rem">Vas a poder contactar a cada negocio por WhatsApp.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmar pedido",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#f97316",
    });
    if (!isConfirmed) return;

    const snapGroups = buildBusinessGroups(cart as CartItem[]);
    const ok = await checkout();
    if (ok) {
      setCheckoutGroups(snapGroups);
      setCheckoutDone(true);
      loadPurchases();
      setTab("purchases");
      Swal.fire({
        icon: "success",
        title: "Pedido realizado!",
        text: "Ahora podes contactar a cada negocio por WhatsApp.",
        timer: 2500,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo procesar el pedido. Intenta de nuevo.",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      title: "Borrar esta orden?",
      text: "Se eliminara de tu historial permanentemente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    const token = localStorage.getItem("marketplace_token");
    const res = await fetch(`${API}/orders/${orderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setPurchases((prev) => prev.filter((o) => o._id !== orderId));
      Swal.fire({
        icon: "success",
        title: "Orden eliminada",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleKeep = async (orderId: string) => {
    const token = localStorage.getItem("marketplace_token");
    const res = await fetch(`${API}/orders/${orderId}/keep`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok)
      setPurchases((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "delivered" as const } : o,
        ),
      );
  };

  const handleReturn = async (orderId: string) => {
    const token = localStorage.getItem("marketplace_token");
    const res = await fetch(`${API}/orders/${orderId}/return`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok)
      setPurchases((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "returned" as const } : o,
        ),
      );
  };

  const tabs = [
    {
      id: "cart" as Tab,
      label: "Carrito",
      icon: <ShoppingCart size={16} />,
      badge: cartCount || undefined,
    },
    {
      id: "purchases" as Tab,
      label: "Mis compras",
      icon: <Package size={16} />,
    },
    { id: "favorites" as Tab, label: "Favoritos", icon: <Heart size={16} /> },
  ];

  return (
    <MainLayout>
      <div className="panel-wrapper">
        {/* Header */}
        <div className="panel-header">
          <h1>Mi panel</h1>
          <p>
            Hola, {user.name.split(" ")[0]}. Aca podes gestionar tus compras.
          </p>
        </div>

        {/* Tabs */}
        <div className="panel-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`panel-tab-btn${tab === t.id ? " active" : ""}`}
            >
              {t.icon} {t.label}
              {t.badge !== undefined && (
                <span className="panel-tab-badge">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CART ── */}
        {tab === "cart" && (
          <div className="panel-anim">
            {cartLoading ? (
              <div className="panel-loading">
                <p>Cargando carrito...</p>
              </div>
            ) : cart.length === 0 ? (
              <div className="panel-empty">
                <ShoppingCart size={56} strokeWidth={1} />
                <h3>Tu carrito esta vacio</h3>
                <p>Explora los negocios y agrega productos.</p>
                <Link href="/" className="panel-empty-link">
                  Explorar productos
                </Link>
              </div>
            ) : (
              <div className="cart-grid">
                <div className="cart-items">
                  {(cart as CartItem[]).map((item) => {
                    const finalPrice = item.discount
                      ? item.price * (1 - item.discount / 100)
                      : item.price;
                    return (
                      <div key={item._id} className="cart-item">
                        <img
                          src={
                            item.image ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&size=80&background=f97316&color=fff`
                          }
                          alt={item.name}
                          className="cart-item-img"
                        />
                        <div className="cart-item-info">
                          <h4 className="cart-item-name">{item.name}</h4>
                          {item.businessName && (
                            <span className="cart-item-business">
                              {item.businessName}
                            </span>
                          )}
                          <div className="cart-item-controls">
                            <div className="cart-qty-box">
                              <button
                                className="panel-qty-btn"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={12} />
                              </button>
                              <span className="cart-qty-val">
                                {item.quantity}
                              </span>
                              <button
                                className="panel-qty-btn"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="cart-item-price">
                              ${(finalPrice * item.quantity).toLocaleString()}
                            </span>
                            {item.discount && (
                              <span className="cart-item-original">
                                ${(item.price * item.quantity).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="panel-rm-btn"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <button className="cart-clear-btn" onClick={clearCart}>
                    <X size={13} /> Vaciar carrito
                  </button>
                </div>

                <div className="cart-summary">
                  <h3>Resumen</h3>
                  {buildBusinessGroups(cart as CartItem[]).map((g) => (
                    <div
                      key={g.businessId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.82rem",
                        color: "rgba(255,255,255,0.6)",
                        padding: "0.2rem 0",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Store size={11} color="#f97316" /> {g.businessName}
                      </span>
                      <span>${g.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                  <div
                    className="cart-summary-rows"
                    style={{ marginTop: "0.5rem" }}
                  >
                    <div className="cart-summary-row">
                      <span>
                        Subtotal ({cartCount} articulo
                        {cartCount !== 1 ? "s" : ""})
                      </span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="cart-summary-row green">
                      <span>Envio</span>
                      <span>A coordinar</span>
                    </div>
                  </div>
                  <div className="cart-summary-total">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    className="cart-checkout-btn"
                    onClick={handleCheckout}
                  >
                    <CreditCard size={16} /> Confirmar pedido
                  </button>
                  <p className="cart-summary-note">
                    El pago se coordina con cada vendedor por WhatsApp
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASES ── */}
        {tab === "purchases" && (
          <div className="panel-anim">
            {purchases.length === 0 ? (
              <div className="panel-empty">
                <Package size={52} strokeWidth={1} />
                <h3>No tenes compras aun</h3>
                <p>Tus pedidos confirmados apareceran aca.</p>
              </div>
            ) : (
              <div className="purchases-list">
                {purchases.map((p) => {
                  const si = STATUS_MAP[
                    p.status as keyof typeof STATUS_MAP
                  ] || {
                    label: p.status,
                    color: "#6b7280",
                    icon: <Clock size={13} />,
                  };
                  return (
                    <div key={p._id} className="purchase-card">
                      {/* Header */}
                      <div className="purchase-card-header">
                        <div>
                          <span className="purchase-card-id">
                            Pedido #{p._id.slice(-8).toUpperCase()}
                          </span>
                          <span className="purchase-card-date">
                            {new Date(p.date).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div
                          className="purchase-status"
                          style={{
                            background: `${si.color}18`,
                            color: si.color,
                          }}
                        >
                          {si.icon} {si.label}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="purchase-card-body">
                        {p.items.map((item, i) => (
                          <div key={i} className="purchase-item-row">
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <span>
                              ${(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="purchase-total">
                          <span>Total</span>
                          <span>${p.total.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* WhatsApp */}
                      {p.businessPhone && p.status !== "returned" && (
                        <>
                          <p
                            style={{
                              marginTop: "0.75rem",
                              backgroundColor: "rgba(59,130,246,0.12)",
                              color: "#1e40af",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              lineHeight: "1.4",
                              border: "1px solid rgba(59,130,246,0.25)",
                            }}
                          >
                            📦 Antes de definir la entrega, coordiná por
                            WhatsApp los detalles del envío, incluyendo costos,
                            forma de despacho y cualquier gasto adicional.
                          </p>

                          <a
                            href={`https://wa.me/${p.businessPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola! Te escribo sobre mi pedido #${p._id
                                .slice(-8)
                                .toUpperCase()} realizado en Offerton.\n\n` +
                                p.items
                                  .map((i) => `- ${i.quantity}x ${i.name}`)
                                  .join("\n") +
                                `\n\nTotal: $${p.total.toLocaleString()}`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: "0.5rem",
                              background: "rgba(37,211,102,0.12)",
                              color: "#16a34a",
                              border: "1px solid rgba(37,211,102,0.3)",
                              borderRadius: 10,
                              padding: "0.45rem 1rem",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <MessageCircle size={13} /> Contactar negocio
                          </a>
                        </>
                      )}
                  
{p.businessId && p.status !== "returned" && (
  <ReportModal
    targetType="business"
    targetId={p.businessId}
    targetName={p.businessName || "Negocio"}
    token={localStorage.getItem("marketplace_token") || ""}
    onRequireAuth={async () => {}}
  />
)}

                      {/* Shipped → quedarme / devolver */}
                      {p.status === "shipped" && (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.6rem",
                            marginTop: "0.75rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() => handleKeep(p._id)}
                            style={{
                              background:
                                "linear-gradient(135deg,#10b981,#059669)",
                              color: "#fff",
                              border: "none",
                              borderRadius: 10,
                              padding: "0.55rem 1.2rem",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <CheckCircle size={14} /> Quedarme con el producto
                          </button>
                          <button
                            onClick={() => handleReturn(p._id)}
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "#fca5a5",
                              border: "1.5px solid rgba(239,68,68,0.35)",
                              borderRadius: 10,
                              padding: "0.55rem 1.2rem",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <RotateCcw size={14} /> Devolver
                          </button>
                        </div>
                      )}

                      {/* Delivered → calificar negocio + borrar */}
                      {p.status === "delivered" && (
                        <div style={{ marginTop: "0.75rem" }}>
                          {/* Bloque calificación al negocio */}
                          <RateSellerBlock
                            order={p}
                            onRated={handleSellerRated}
                          />

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              marginTop: "0.75rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color: "#4ade80",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                              }}
                            >
                              Producto recibido y confirmado
                            </p>
                            <button
                              onClick={() => handleDeleteOrder(p._id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                background: "rgba(239,68,68,0.1)",
                                color: "#f87171",
                                border: "1px solid rgba(239,68,68,0.25)",
                                borderRadius: 8,
                                padding: "0.35rem 0.85rem",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={12} /> Borrar orden
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Returned → borrar */}
                      {p.status === "returned" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            marginTop: "0.75rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#f87171",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                            }}
                          >
                            Devolucion procesada
                          </p>
                          <button
                            onClick={() => handleDeleteOrder(p._id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: "rgba(239,68,68,0.1)",
                              color: "#f87171",
                              border: "1px solid rgba(239,68,68,0.25)",
                              borderRadius: 8,
                              padding: "0.35rem 0.85rem",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={12} /> Borrar orden
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FAVORITES ── */}
        {tab === "favorites" && (
          <div className="panel-anim panel-empty">
            <Heart size={52} strokeWidth={1} />
            <h3>Tus favoritos</h3>
            <p>Los negocios y productos que guardaste apareceran aca.</p>
            <Link href="/" className="panel-empty-link">
              Explorar negocios <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function PanelPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center" }}>
          Cargando panel...
        </div>
      }
    >
      <PanelContent />
    </Suspense>
  );
}

