"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "../../componentes/MainLayout";
import { useAuth } from "../../context/authContext";
import { useCart } from "../../context/cartContext";
import ReportModal from "../../componentes/reportModal";
import { useTracking } from "../../context/TrackingContext";
import {
  MapPin, Package, Star, CheckCircle, ShoppingBag,
  UserPlus, MessageCircle, Heart, Tag, ShoppingCart,
  ArrowLeft, Share2, Users, TrendingUp, ChevronLeft, ChevronRight, Navigation,
  Locate, LocateOff, RefreshCw, Phone, X, BarChart3,
} from "lucide-react";
import "../../styles/negocioId.css";

const API = "https://new-backend-lovat.vercel.app/api";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Business {
  _id: string; name: string; description: string; city: string;
  logo?: string; rating?: number; totalRatings?: number;
  verified?: boolean; owner?: string; followers?: string[];
  phone?: string;
  address?: string;
  location?: { type: string; coordinates: [number, number] };
}
interface Product {
  _id: string; name: string; description?: string; price: number;
  discount?: number; stock?: number; image?: string; category: string;
}
interface SocialStatus {
  following: boolean; saved: boolean; myRating: number;
  followersCount: number; rating: number; totalRatings: number;
}

// ── GPS status ───────────────────────────────────────────────────────────────
type GpsStatus = "idle" | "loading" | "ok" | "denied" | "error";

interface GpsState {
  lat: number | null;
  lng: number | null;
  status: GpsStatus;
  updatedAt: Date | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getRankInfo(rating: number, total: number) {
  if (total < 3)     return { label: "Nueva tienda",        color: "#6b7280", bg: "#f3f4f6" };
  if (rating >= 4.5) return { label: "🏆 Top vendedor",     color: "#92400e", bg: "#fef3c7" };
  if (rating >= 4.0) return { label: "⭐ Muy valorado",     color: "#065f46", bg: "#d1fae5" };
  if (rating >= 3.0) return { label: "👍 Buena reputación", color: "#1e40af", bg: "#dbeafe" };
  return { label: "En desarrollo", color: "#6b7280", bg: "#f3f4f6" };
}

function formatPhoneForWhatsApp(phone?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("54")) {
    if (!digits.startsWith("549")) {
      digits = "549" + digits.slice(2);
    }
    return digits;
  }
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("15")) digits = digits.slice(2);
  return `549${digits}`;
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

const GPS_MIN_INTERVAL_MS = 30_000;
const GPS_MIN_DISTANCE_M  = 100;

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useDynamicGps() {
  const [gps, setGps] = useState<GpsState>({
    lat: null, lng: null, status: "idle", updatedAt: null,
  });
  const watchRef        = useRef<number | null>(null);
  const lastAcceptedRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setGps(prev => ({ ...prev, status: "error" }));
      return;
    }
    setGps(prev => ({ ...prev, status: "loading" }));
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const now  = Date.now();
        const last = lastAcceptedRef.current;
        if (!last) {
          lastAcceptedRef.current = { lat, lng, time: now };
          setGps({ lat, lng, status: "ok", updatedAt: new Date() });
          return;
        }
        const elapsed = now - last.time;
        const moved   = distanceMeters(last.lat, last.lng, lat, lng);
        if (elapsed < GPS_MIN_INTERVAL_MS || moved < GPS_MIN_DISTANCE_M) {
          return;
        }
        lastAcceptedRef.current = { lat, lng, time: now };
        setGps({ lat, lng, status: "ok", updatedAt: new Date() });
      },
      (err) => {
        const status: GpsStatus = err.code === 1 ? "denied" : "error";
        setGps(prev => ({ ...prev, status, lat: null, lng: null }));
      },
      {
        enableHighAccuracy: false,
        maximumAge:         30_000,
        timeout:            15_000,
      }
    );
  }, []);
  useEffect(() => {
    startWatch();
    return () => {
      if (watchRef.current !== null)
        navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [startWatch]);
  const refresh = useCallback(() => {
    if (watchRef.current !== null)
      navigator.geolocation.clearWatch(watchRef.current);
    lastAcceptedRef.current = null;
    startWatch();
  }, [startWatch]);
  return { gps, refresh };
}

function GpsBadge({ gps, onRefresh, profileHasLoc }: {
  gps: GpsState;
  onRefresh: () => void;
  profileHasLoc: boolean;
}) {
  const timeStr = gps.updatedAt
    ? gps.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;
  if (gps.status === "loading")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#6b7280", background: "#f3f4f6", padding: "3px 10px", borderRadius: 20 }}>
        <div style={{ width: 8, height: 8, border: "2px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        Obteniendo ubicación…
      </span>
    );
  if (gps.status === "ok")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#059669", background: "#d1fae5", padding: "3px 10px", borderRadius: 20 }}>
        <Locate size={11} />
        GPS activo · {timeStr}
        <button onClick={onRefresh} title="Actualizar ubicación" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "#059669" }}>
          <RefreshCw size={11} />
        </button>
      </span>
    );
  if (gps.status === "denied")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#b45309", background: "#fef3c7", padding: "3px 10px", borderRadius: 20 }}>
        <LocateOff size={11} />
        {profileHasLoc ? "GPS bloqueado · usando dirección guardada" : "GPS bloqueado · sin filtro de distancia"}
        <button onClick={onRefresh} title="Reintentar" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "#b45309" }}>
          <RefreshCw size={11} />
        </button>
      </span>
    );
  return null;
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function NegocioPublicoPage() {
  const { id }        = useParams<{ id: string }>();
  const { user }      = useAuth();
  const { addToCart } = useCart();
  const router        = useRouter();
  const isMobile      = useIsMobile();
  const searchParams  = useSearchParams();
  const { track } = useTracking(); // <-- TRACKING
  const productViewStartRef = useRef<Record<string, number>>({}); // <-- TRACKING
  const pageEnterRef = useRef<number>(Date.now()); // <-- TRACKING

  const highlightProductId = searchParams.get("p");
  const { gps, refresh: refreshGps } = useDynamicGps();
  const [business,        setBusiness]        = useState<Business | null>(null);
  const [products,        setProducts]        = useState<Product[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [contactLoading,  setContactLoading]  = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [spotlightProduct, setSpotlightProduct] = useState<Product | null>(null);
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const [highlightActive,  setHighlightActive]  = useState(false);
  const [social, setSocial] = useState<SocialStatus>({
    following: false, saved: false, myRating: 0,
    followersCount: 0, rating: 0, totalRatings: 0,
  });
  const token         = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
  const currentUserId = (user as any)?._id || (user as any)?.id;
  const profileLat    = (user as any)?.lat;
  const profileLng    = (user as any)?.lng;
  const profileHasLoc = !!(user?.locationEnabled && profileLat && profileLng);
  const activeLat: number | null =
    gps.status === "ok"     ? gps.lat :
    gps.status === "denied" && profileHasLoc ? profileLat :
    null;
  const activeLng: number | null =
    gps.status === "ok"     ? gps.lng :
    gps.status === "denied" && profileHasLoc ? profileLng :
    null;
  const hasActiveLoc = activeLat !== null && activeLng !== null;
  const ITEMS_PER_PAGE = isMobile ? 4 : 12;
  const totalPages     = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProds = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // <-- TRACKING: helpers de tracking
  const isOwner = !!(business && currentUserId && (typeof business.owner === 'object' ? (business.owner as any)?._id : business.owner) === currentUserId);

  const handleProductView = (p: Product) => {
    if (isOwner) return;
    productViewStartRef.current[p._id] = Date.now();
    track('product_view', {
      businessId: id,
      product_id: p._id,
      product_name: p.name,
      category: p.category,
    });
  };

  const handleProductLeave = (p: Product) => {
    if (isOwner) return;
    const start = productViewStartRef.current[p._id];
    if (!start) return;
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds > 2) {
      track('dwell_time', {
        businessId: id,
        product_id: p._id,
        seconds
      });
    }
    delete productViewStartRef.current[p._id];
  };

  useEffect(() => { setCurrentPage(1); }, [isMobile]);

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

  // <-- TRACKING: page_enter cuando carga el negocio
  useEffect(() => {
    if (!business || !id || isOwner) return;
    pageEnterRef.current = Date.now();
    track('page_enter', { businessId: id, business_name: business.name });

    return () => {
      const seconds = Math.round((Date.now() - pageEnterRef.current) / 1000);
      if (seconds > 3) {
        track('page_leave', { businessId: id, total_seconds: seconds });
      }
    };
  }, [business, id, isOwner]);

  useEffect(() => {
    if (!id) return;
    if (gps.status === "idle" || gps.status === "loading") return;
    const params = new URLSearchParams({ businessId: id, limit: "40" });
    if (hasActiveLoc) {
      params.set("lat", activeLat!.toString());
      params.set("lng", activeLng!.toString());
    }
    if (currentUserId) params.set("userId", currentUserId);
    setProductsLoading(true);
    fetch(`${API}/products?${params}`)
      .then(r => r.json())
      .then(data => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [id, activeLat, activeLng, currentUserId, gps.status]);

  useEffect(() => {
    if (!highlightProductId || products.length === 0) return;
    const idx = products.findIndex(p => p._id === highlightProductId);
    if (idx === -1) return;
    setSpotlightProduct(products[idx]);
    setSpotlightVisible(true);
    setHighlightActive(true);
    setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
    // <-- TRACKING: vista desde link compartido
    if (!isOwner) {
      track('product_view_shared', { businessId: id, product_id: highlightProductId });
    }
  }, [products, highlightProductId, ITEMS_PER_PAGE]);

  useEffect(() => {
    if (!highlightActive) return;
    const t = setTimeout(() => setHighlightActive(false), 4500);
    return () => clearTimeout(t);
  }, [highlightActive]);

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
        if (!isOwner && !isFollowing) track('lead_interaction', { businessId: id, action: 'follow' }); // <-- TRACKING
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
        toast("success", !isSaved ? "❤ Guardado en favoritos" : "Quitado de favoritos");
        if (!isOwner && !isSaved) track('lead_interaction', { businessId: id, action: 'favorite' }); // <-- TRACKING
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
        if (!isOwner) track('lead_interaction', { businessId: id, action: 'rate', value: rating }); // <-- TRACKING
      }
    } catch { toast("error", "Error al calificar"); }
  };

  const handleContact = async () => {
    if (!user) { requireAuth(); return; }
    setContactLoading(true);
    if (!isOwner) track('lead_conversion', { businessId: id, action: 'chat_click' }); // <-- TRACKING
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

  const handleWhatsapp = () => {
    const waPhone = formatPhoneForWhatsApp(business?.phone);
    if (!waPhone) {
      toast("error", "Este negocio no tiene WhatsApp cargado");
      return;
    }
    if (!isOwner) track('lead_conversion', { businessId: id, action: 'whatsapp_click' }); // <-- TRACKING
    const message = "Vi tu negocio en MercadoRosario, la web de Rosario, quiero saber qué otros productos tenés, gracias";
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
    if (!isOwner) track('lead_conversion', { businessId: id, action: 'add_to_cart', product_id: product._id }); // <-- TRACKING
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast("info", "🔗 Enlace copiado");
    if (!isOwner) track('product_share', { businessId: id }); // <-- TRACKING
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.querySelector(".nid-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const closeSpotlight = () => {
    setSpotlightVisible(false);
    router.replace(`/negocio/${id}`, { scroll: false });
  };

  const goToProductInGrid = () => {
    const targetId = highlightProductId;
    setSpotlightVisible(false);
    router.replace(`/negocio/${id}`, { scroll: false });
    setTimeout(() => {
      document.getElementById(`product-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  const rankInfo            = getRankInfo(social.rating, social.totalRatings);
  const businessAddress     = business?.address || business?.city || "Dirección no disponible";
  const hasVerifiedLocation = !!(business?.location?.coordinates?.length);
  const hasWhatsapp         = !!formatPhoneForWhatsApp(business?.phone);

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
      {spotlightProduct && spotlightVisible && (
        <div className="nid-spotlight-overlay" onClick={closeSpotlight}>
          <div className="nid-spotlight-card" onClick={(e) => e.stopPropagation()}>
            <button className="nid-spotlight-close" onClick={closeSpotlight} aria-label="Cerrar">
              <X size={18} />
            </button>
            <div className="nid-spotlight-img-wrap">
              <img
                src={spotlightProduct.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(spotlightProduct.name)}&size=400&background=f97316&color=fff`}
                alt={spotlightProduct.name}
                className="nid-spotlight-img"
              />
              <DiscountBadge discount={spotlightProduct.discount} />
              {(spotlightProduct.stock ?? 0) === 0 && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>Sin stock</span>
                </div>
              )}
            </div>
            <div className="nid-spotlight-body">
              <span className="nid-spotlight-tag">El producto que buscabas</span>
              <h3 className="nid-spotlight-name">{spotlightProduct.name}</h3>
              {spotlightProduct.description && (
                <p className="nid-spotlight-desc">{spotlightProduct.description}</p>
              )}
              <div className="nid-spotlight-footer">
                <ProductPrice price={spotlightProduct.price} discount={spotlightProduct.discount} />
                <button
                  onClick={() => handleAddToCart(spotlightProduct)}
                  disabled={(spotlightProduct.stock ?? 0) === 0}
                  className="nid-add-btn"
                  style={{
                    background: (spotlightProduct.stock ?? 0) === 0 ? "#e5e7eb" : "#f97316",
                    color:      (spotlightProduct.stock ?? 0) === 0 ? "#9ca3af" : "#fff",
                    cursor:     (spotlightProduct.stock ?? 0) === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <ShoppingCart size={13} /> Agregar
                </button>
              </div>
              <button className="nid-spotlight-viewgrid" onClick={goToProductInGrid}>
                Ver en el catálogo del negocio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="nid-topbar">
        <button className="nid-back-btn" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="nid-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* BOTÓN ESTADÍSTICAS - solo dueño antes del redirect */}
          {isOwner && (
            <Link href={`/negocio/${id}/estadisticas`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111827', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
              <BarChart3 size={14} /> Mis estadísticas
            </Link>
          )}
          <GpsBadge gps={gps} onRefresh={refreshGps} profileHasLoc={profileHasLoc} />
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
              <span className="nid-meta-item">
                <MapPin size={13} />
                {businessAddress}
              </span>
              {hasVerifiedLocation && (
                <a
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
                  : <><MessageCircle size={15} /> Msj en la web</>
                }
              </button>
              {hasWhatsapp && (
                <button
                  className="nid-social-btn"
                  onClick={handleWhatsapp}
                  style={{
                    border:     "1.5px solid #25D366",
                    background: "rgba(37,211,102,0.08)",
                    color:      "#128C4A",
                    fontWeight: 600,
                  }}
                >
                  <Phone size={15} /> WhatsApp
                </button>
              )}
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
        {(gps.status === "idle" || gps.status === "loading") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef9f0", border: "1px solid #fed7aa", borderRadius: 8, marginBottom: 12, fontSize: "0.8rem", color: "#92400e" }}>
            <div style={{ width: 14, height: 14, border: "2px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
            Obteniendo tu ubicación actual para mostrarte los productos disponibles en tu zona…
          </div>
        )}
        {gps.status === "denied" && !profileHasLoc && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, marginBottom: 12, fontSize: "0.8rem", color: "#92400e" }}>
            <LocateOff size={14} style={{ flexShrink: 0 }} />
            GPS bloqueado. Se muestran todos los productos sin filtro de distancia.
            <button onClick={refreshGps} style={{ marginLeft: "auto", background: "none", border: "1px solid #f97316", color: "#f97316", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
              Reintentar
            </button>
          </div>
        )}
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
              {hasActiveLoc
                ? "Este negocio no tiene productos disponibles en tu zona actual."
                : "Este negocio aún no tiene productos publicados."}
            </p>
          </div>
        ) : (
          <>
            <div className="nid-products-grid">
              {paginatedProds.map((p, i) => (
                <div
                  key={p._id}
                  id={`product-${p._id}`}
                  className={`nid-product-card${highlightActive && p._id === highlightProductId ? " nid-product-card--highlight" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onMouseEnter={() => handleProductView(p)} // <-- TRACKING
                  onMouseLeave={() => handleProductLeave(p)} // <-- TRACKING
                  onClick={() => { if (!isOwner) track('product_click', { businessId: id, product_id: p._id }); }} // <-- TRACKING
                >
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
