"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "../../componentes/MainLayout";
import { useAuth } from "../../context/authContext";
import { useCart } from "../../context/cartContext";
import ReportModal from "../../componentes/reportModal";

import {
  MapPin, Package, Star, CheckCircle, ShoppingBag,
  UserPlus, MessageCircle, Heart, Tag, ShoppingCart,
  ArrowLeft, Share2, Users, TrendingUp, ChevronLeft, ChevronRight, Navigation,
} from "lucide-react";
import "../../styles/negocioId.css";

const API = "https://new-backend-lovat.vercel.app/api";

interface Business {
  _id: string; name: string; description: string; city: string;
  logo?: string; rating?: number; totalRatings?: number;
  verified?: boolean; owner?: string; followers?: string[];
  phone?: string;
  address?: string;                                              // ← dirección de Google Maps
  location?: { type: string; coordinates: [number, number] };  // ← coords GeoJSON
}
interface Product {
  _id: string; name: string; description?: string; price: number;
  discount?: number; stock?: number; image?: string; category: string;
}
interface SocialStatus {
  following: boolean; saved: boolean; myRating: number;
  followersCount: number; rating: number; totalRatings: number;
}

function getRankInfo(rating: number, total: number) {
  if (total < 3)     return { label: "Nueva tienda",        color: "#6b7280", bg: "#f3f4f6" };
  if (rating >= 4.5) return { label: "🏆 Top vendedor",     color: "#92400e", bg: "#fef3c7" };
  if (rating >= 4.0) return { label: "⭐ Muy valorado",     color: "#065f46", bg: "#d1fae5" };
  if (rating >= 3.0) return { label: "👍 Buena reputación", color: "#1e40af", bg: "#dbeafe" };
  return { label: "En desarrollo", color: "#6b7280", bg: "#f3f4f6" };
}

function DiscountBadge({ discount }: { discount?: number }) {
  if (!discount) return null;
  return (
    <span style={{ position: "absolute", top: 10, left: 10, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
      <Tag size={10} />-{discount}%
    </span>
  );
}

function ProductPrice({ price, discount }: { price: number; discount?: number }) {
  if (!discount)
    return <span style={{ fontWeight: 700, color: "var(--primary,#f97316)", fontSize: "1.05rem" }}>${price.toLocaleString()}</span>;
  const final = (price * (1 - discount / 100)).toFixed(2);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontWeight: 700, color: "var(--primary,#f97316)", fontSize: "1.05rem" }}>${Number(final).toLocaleString()}</span>
      <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: "0.8rem" }}>${price.toLocaleString()}</span>
    </div>
  );
}

function StarRating({ current, total, myRating, onRate, interactive = true }: {
  current: number; total: number; myRating: number;
  onRate?: (n: number) => void; interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const active = interactive ? hovered || myRating : current;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={18}
            style={{ cursor: interactive ? "pointer" : "default", transition: "transform 0.1s" }}
            fill={active >= s ? "#f97316" : "none"}
            stroke={active >= s ? "#f97316" : "#d1d5db"}
            onMouseEnter={() => interactive && setHovered(s)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onRate?.(s)}
          />
        ))}
      </div>
      <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
        {interactive && myRating ? `Tu voto: ${myRating}★ · ` : ""}
        {current.toFixed(1)} ({total} {total === 1 ? "voto" : "votos"})
      </span>
    </div>
  );
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

export default function NegocioPublicoPage() {
  const { id }        = useParams<{ id: string }>();
  const { user }      = useAuth();
  const { addToCart } = useCart();
  const router        = useRouter();
  const isMobile      = useIsMobile();

  const [business,        setBusiness]        = useState<Business | null>(null);
  const [products,        setProducts]        = useState<Product[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [contactLoading,  setContactLoading]  = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);

  const [social, setSocial] = useState<SocialStatus>({
    following: false, saved: false, myRating: 0,
    followersCount: 0, rating: 0, totalRatings: 0,
  });

  const token         = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
  const currentUserId = (user as any)?._id || (user as any)?.id;
  const userLat       = (user as any)?.lat;
  const userLng       = (user as any)?.lng;
  const userHasLoc    = !!(user?.locationEnabled && userLat && userLng);

  const ITEMS_PER_PAGE = isMobile ? 4 : 12;
  const totalPages     = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProds = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => { setCurrentPage(1); }, [isMobile]);

  // ── Fetch negocio ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetch(`${API}/business/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: Business | null) => {
        if (!data) return;
        setBusiness(data);
        setSocial(prev => ({
          ...prev,
          followersCount: data.followers?.length ?? 0,
          rating:         data.rating      ?? 0,
          totalRatings:   data.totalRatings ?? 0,
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // ── Fetch productos — con lat/lng/userId para filtrado por radio ──────────
  useEffect(() => {
    if (!id) return;

    const params = new URLSearchParams({ businessId: id, limit: "40" });
    if (userHasLoc) {
      params.set("lat", userLat.toString());
      params.set("lng", userLng.toString());
    }
    if (currentUserId) params.set("userId", currentUserId);

    setProductsLoading(true);
    fetch(`${API}/products?${params}`)
      .then(r => r.json())
      .then(data => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [id, currentUserId, userHasLoc]);

  // ── Social status ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !token) return;
    fetch(`${API}/business/${id}/social`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((data: SocialStatus | null) => {
        if (!data) return;
        setSocial(prev => ({
          ...prev,
          following:      data.following,
          saved:          data.saved,
          myRating:       data.myRating,
          followersCount: data.followersCount || prev.followersCount,
          rating:         data.rating         || prev.rating,
          totalRatings:   data.totalRatings   || prev.totalRatings,
        }));
      })
      .catch(console.error);
  }, [id, token]);

  // ── Redirigir si es el dueño ─────────────────────────────────────────────
  useEffect(() => {
    if (!business || !user) return;
    const userId  = (user as any)._id || (user as any).id;
    const ownerId = typeof business.owner === "object" ? (business.owner as any)?._id : business.owner;
    if (userId && ownerId && userId === ownerId) router.replace("/negocio");
  }, [business, user]);

  const requireAuth = async () => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      icon: "info", title: "Necesitás una cuenta",
      text: "Iniciá sesión para realizar esta acción.",
      showCancelButton: true, confirmButtonText: "Iniciar sesión",
      cancelButtonText: "Cancelar", confirmButtonColor: "#f97316",
    });
    if (isConfirmed) router.push("/login");
  };

  const toast = async (icon: "success" | "info" | "error", title: string) => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon, title, timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
  };

  const handleFollow = async () => {
    if (!user || !token) { requireAuth(); return; }
    const isFollowing = social.following;
    try {
      const res = await fetch(`${API}/business/${id}/${isFollowing ? "unfollow" : "follow"}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSocial(prev => ({ ...prev, following: !isFollowing, followersCount: data.followersCount }));
        toast("success", !isFollowing ? `✅ Siguiendo a ${business?.name}` : "Dejaste de seguir");
      }
    } catch { toast("error", "Error al seguir"); }
  };

  const handleLike = async () => {
    if (!user || !token) { requireAuth(); return; }
    const isSaved = social.saved;
    try {
      const res = await fetch(`${API}/business/${id}/${isSaved ? "unfavorite" : "favorite"}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSocial(prev => ({ ...prev, saved: !isSaved }));
        toast("success", !isSaved ? "❤️ Guardado en favoritos" : "Quitado de favoritos");
      }
    } catch { toast("error", "Error al guardar"); }
  };

  const handleRate = async (rating: number) => {
    if (!user || !token) { requireAuth(); return; }
    try {
      const res = await fetch(`${API}/business/${id}/rate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        const data = await res.json();
        setSocial(prev => ({ ...prev, myRating: rating, rating: data.rating, totalRatings: data.totalRatings }));
        toast("success", `⭐ Votaste con ${rating} estrellas`);
      }
    } catch { toast("error", "Error al calificar"); }
  };

  const handleContact = async () => {
    if (!user) { requireAuth(); return; }
    setContactLoading(true);
    try {
      const convRes = await fetch(`${API}/chat/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: typeof business?.owner === "object"
            ? (business.owner as any)?._id : business?.owner,
        }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json();
      router.push(`/chatpage?conversationId=${conv._id}`);
    } catch {
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({ icon: "error", title: "Error al abrir el chat", text: "Intentá de nuevo.", confirmButtonColor: "#f97316" });
    } finally {
      setContactLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!user) { requireAuth(); return; }
    addToCart({
      _id:           product._id,
      productId:     product._id,
      name:          product.name,
      price:         product.price,
      discount:      product.discount,
      image:         product.image,
      businessId:    business?._id,
      businessName:  business?.name,
      businessPhone: business?.phone || "",
      stock:         product.stock   ?? 99,
    });
    toast("success", `🛒 ${product.name} agregado al carrito`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast("info", "🔗 Enlace copiado");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.querySelector(".nid-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const rankInfo            = getRankInfo(social.rating, social.totalRatings);
  const businessAddress     = business?.address || business?.city || "Dirección no disponible";
  const hasVerifiedLocation = !!(business?.location?.coordinates?.length);

  if (loading) return (
    <MainLayout>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, color: "#6b7280" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <p>Cargando negocio...</p>
      </div>
    </MainLayout>
  );

  if (!business) return (
    <MainLayout>
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <ShoppingBag size={56} strokeWidth={1} style={{ color: "#d1d5db", marginBottom: 16 }} />
        <h2 style={{ color: "#374151", marginBottom: 8 }}>Negocio no encontrado</h2>
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>El negocio que buscás no existe o fue eliminado.</p>
        <Link href="/" style={{ background: "#f97316", color: "#fff", padding: "10px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 600 }}>
          Volver al inicio
        </Link>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="nid-topbar">
        <button className="nid-back-btn" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="nid-topbar-actions">
          <button className="nid-share-btn" onClick={handleShare}>
            <Share2 size={15} /> Compartir
          </button>
        </div>
      </div>

      <div className="nid-hero">
        <div className="nid-hero-inner">
          <div className="nid-logo-wrap">
            <img
              src={business.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&size=400&background=f97316&color=fff`}
              alt={business.name}
              className="nid-logo"
            />
            <span className="nid-name" aria-hidden="true">{business.name}</span>
            {business.verified && (
              <span className="nid-verified-dot" title="Verificado"><CheckCircle size={14} /></span>
            )}
          </div>

          <div className="nid-info">
            <div className="nid-name-row">
              <h1 className="nid-name">{business.name}</h1>
              {business.verified ? (
                <span className="nid-badge nid-badge--verified"><CheckCircle size={11} /> Verificado</span>
              ) : (
                <span className="nid-badge nid-badge--unverified">No verificado</span>
              )}
              <span className="nid-badge nid-badge--rank" style={{ background: rankInfo.bg, color: rankInfo.color }}>
                <TrendingUp size={11} /> {rankInfo.label}
              </span>
            </div>

            {business.description && <p className="nid-desc">{business.description}</p>}

            <div className="nid-meta">
              {/* Dirección de Google Maps o ciudad como fallback */}
              <span className="nid-meta-item">
                <MapPin size={13} />
                {businessAddress}
              </span>

              {/* Badge de ubicación verificada con Google */}
         {hasVerifiedLocation && (
  
    href={`https://www.google.com/maps?q=${business?.location?.coordinates[1]},${business?.location?.coordinates[0]}`}
    target="_blank"
    rel="noopener noreferrer"
    className="nid-meta-item"
    style={{ color: "#4ade80", fontWeight: 600, fontSize: "0.75rem", textDecoration: "none", cursor: "pointer" }}
  >
    <Navigation size={11} /> Ubicación verificada
  </a>
)}
              <span className="nid-meta-item nid-meta-item--bold">
                <Users size={13} />
                {social.followersCount} {social.followersCount === 1 ? "seguidor" : "seguidores"}
              </span>

              <span className="nid-meta-item">
                <Package size={13} /> {products.length} productos
              </span>
            </div>
          </div>

          <div className="nid-actions-col">
            <div className="nid-actions-row">
              <button
                className="nid-social-btn"
                onClick={handleFollow}
                style={{
                  border:     `1.5px solid ${social.following ? "#f97316" : "var(--border,#e5e7eb)"}`,
                  background: social.following ? "rgba(249,115,22,0.08)" : "transparent",
                  color:      social.following ? "#f97316" : "#6b7280",
                }}
              >
                <UserPlus size={15} /> {social.following ? "Siguiendo" : "Seguir"}
              </button>

              <button
                className="nid-social-btn"
                onClick={handleLike}
                style={{
                  border:     `1.5px solid ${social.saved ? "#ef4444" : "var(--border,#e5e7eb)"}`,
                  background: social.saved ? "rgba(239,68,68,0.07)" : "transparent",
                  color:      social.saved ? "#ef4444" : "#6b7280",
                }}
              >
                <Heart size={15} fill={social.saved ? "#ef4444" : "none"} />
                {social.saved ? "Guardado" : "Favorito"}
              </button>

              <button className="nid-contact-btn" onClick={handleContact} disabled={contactLoading}>
                {contactLoading
                  ? <><div className="nid-spinner" /> Enviando...</>
                  : <><MessageCircle size={15} /> Contactar</>
                }
              </button>
            </div>

            <div className="nid-star-wrap">
              <StarRating
                current={social.rating}
                total={social.totalRatings}
                myRating={social.myRating}
                onRate={handleRate}
                interactive={!!user}
              />
              {!user && (
                <span style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", textAlign: "right", marginTop: 2 }}>
                  Iniciá sesión para votar
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección productos ── */}
      <div className="nid-products">
        <div className="nid-products-header">
          <h2 className="nid-products-title">
            <ShoppingBag size={18} /> Productos del negocio
          </h2>
          {!productsLoading && products.length > 0 && (
            <span className="nid-products-count">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, products.length)} de {products.length}
            </span>
          )}
        </div>

        {productsLoading ? (
          <div className="nid-products-grid">
            {[...Array(isMobile ? 4 : 12)].map((_, i) => (
              <div key={i} className="nid-skeleton" style={{ height: 280 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="nid-empty">
            <ShoppingBag size={52} strokeWidth={1} />
            <p style={{ marginTop: 12 }}>
              {userHasLoc
                ? "Este negocio no tiene productos disponibles en tu zona."
                : "Este negocio aún no tiene productos publicados."}
            </p>
          </div>
        ) : (
          <>
            <div className="nid-products-grid">
              {paginatedProds.map((p, i) => (
                <div key={p._id} className="nid-product-card" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="nid-product-img-wrap">
                    <img
                      src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=400&background=f97316&color=fff`}
                      alt={p.name}
                      className="nid-product-img"
                    />
                    <DiscountBadge discount={p.discount} />
                    {(p.stock ?? 0) < 5 && (p.stock ?? 0) > 0 && (
                      <span style={{ position: "absolute", top: 10, right: 10, background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>
                        ¡Últimas {p.stock}!
                      </span>
                    )}
                    {(p.stock ?? 0) === 0 && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>Sin stock</span>
                      </div>
                    )}
                  </div>
                  <div className="nid-product-body">
                    <h3 className="nid-product-name">{p.name}</h3>
                    {p.description && (
                      <p className="nid-product-desc">
                        {p.description.slice(0, 60)}{p.description.length > 60 ? "…" : ""}
                      </p>
                    )}
                    <div className="nid-product-footer">
                      <ProductPrice price={p.price} discount={p.discount} />
                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={(p.stock ?? 0) === 0}
                        className="nid-add-btn"
                        style={{
                          background: (p.stock ?? 0) === 0 ? "#e5e7eb" : "#f97316",
                          color:      (p.stock ?? 0) === 0 ? "#9ca3af" : "#fff",
                          cursor:     (p.stock ?? 0) === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        <ShoppingCart size={13} /> Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="nid-pagination">
                <button
                  className="nid-page-btn nid-page-btn--arrow"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const show = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                  const showEllipsisAfter  = page === currentPage + 2 && currentPage < totalPages - 2;
                  if (!show) return null;
                  return (
                    <span key={page}>
                      {showEllipsisBefore && <span className="nid-page-ellipsis">…</span>}
                      <button
                        className={`nid-page-btn${currentPage === page ? " nid-page-btn--active" : ""}`}
                        onClick={() => handlePageChange(page)}
                        aria-label={`Página ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                      {showEllipsisAfter && <span className="nid-page-ellipsis">…</span>}
                    </span>
                  );
                })}

                <button
                  className="nid-page-btn nid-page-btn--arrow"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </MainLayout>
  );
}
