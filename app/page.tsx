"use client";
// app/page.tsx

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "../app/componentes/MainLayout";
import { useAuth } from "../app/context/authContext";
import { useCart } from "../app/context/cartContext";
import CategoryIcon from "../app/componentes/cateroryicon";
import { categories } from "../app/lib/db";
import ReportModal from "../app/componentes/reportModal";
import {
  Tag,
  Crown,
  Users,
  MapPin,
  Bell,
  Store,
  TrendingUp,
  Clock,
  Search,
  ShoppingCart,
  Package,
  CheckCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Share2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import "../app/styles/home.css";

const API = "https://new-backend-lovat.vercel.app/api";
const BACKEND_ORIGIN = "https://new-backend-lovat.vercel.app";

interface FlashOffer {
  active: boolean;
  discount: number;
  endDate?: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  category?: string;
  stock?: number;
  _outOfRange?: boolean;
  _isFeatured?: boolean;
  _featuredSource?: "product" | "business";
  cuotaSuscriptor?: boolean;
  flashOffer?: FlashOffer;
  flashOfferSecondsLeft?: number;
  business?: {
    _id: string;
    name: string;
    city: string;
    logo?: string;
    verified?: boolean;
    followers?: string[];
    rating?: number;
    totalRatings?: number;
    phone?: string;
    featuredPaid?: boolean;
    cuotaSuscriptor?: boolean;
    featuredUntil?: string;
  };
}

interface FeaturedBusiness {
  _id: string;
  type: string;
  endDate: string;
  business: {
    _id: string;
    name: string;
    city: string;
    logo?: string;
    verified?: boolean;
    rating?: number;
    totalRatings?: number;
    totalProducts?: number;
    description?: string;
    followers?: string[];
  };
}

interface PublicStats {
  totalProducts: number;
  totalBusinesses: number;
}

const imgUrl = (url?: string) =>
  url || "https://via.placeholder.com/300x200?text=Producto";
const logoUrl = (name: string, url?: string) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&background=f97316&color=fff`;

// URL linda de compartir: https://new-backend-lovat.vercel.app/p/<id>
// El backend arma ahí la preview (imagen + nombre + precio) y redirige
// automáticamente a /negocio/<id>?p=<productId> resaltando el producto.
const shareUrlFor = (productId: string) => `${BACKEND_ORIGIN}/p/${productId}`;

// ─── Utils ─────────────────────────────────────────────────────────────────
// Fisher-Yates: mezcla de verdad, no solo "los primeros N del array".
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatFlashTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Terminando";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

// ─── Stars ───────────────────────────────────────────────────────────────────
function PartialStar({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = `ps-${Math.random().toString(36).slice(2, 7)}`;
  const pct = `${Math.max(0, Math.min(1, fill)) * 100}%`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={pct} stopColor="#f97316" />
          <stop offset={pct} stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={`url(#${id})`}
        stroke={fill > 0.05 ? "#f97316" : "#d1d5db"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRow({ rating = 0, size = 13 }: { rating?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <PartialStar key={s} fill={Math.min(1, Math.max(0, rating - (s - 1)))} size={size} />
      ))}
    </span>
  );
}

// ─── Hero Slider ──────────────────────────────────────────────────────────────
function HeroSlider({ products }: { products: Product[] }) {
  const suscriptorProducts = products.filter((p) => p.business?.cuotaSuscriptor === true);
  const usePool = suscriptorProducts.length > 0 ? suscriptorProducts : products;

  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (usePool.length <= 3) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 3) % usePool.length);
        setFade(true);
      }, 350);
    }, 10_000);
    return () => clearInterval(t);
  }, [usePool.length]);

  useEffect(() => { setIdx(0); }, [suscriptorProducts.length]);

  if (!usePool.length) return null;
  const slice = [0, 1, 2].map((offset) => usePool[(idx + offset) % usePool.length]);

  return (
    <div className="hero-visual" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.35s ease" }}>
      {slice.map((p, i) => {
        const rating = p.business?.rating ?? 0;
        const bizId = p.business?._id;
        const featured = p._isFeatured;
        return (
          <div
            key={`${p._id}-${i}`}
            className="hero-card"
            style={featured ? { outline: "1.5px solid rgba(249,115,22,0.55)", boxShadow: "0 0 0 1px rgba(249,115,22,0.18)" } : undefined}
          >
            {featured && (
              <div style={{ position: "absolute", top: 7, left: 7, zIndex: 2, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.57rem", fontWeight: 800, padding: "2px 6px", borderRadius: 5, display: "flex", alignItems: "center", gap: 2, boxShadow: "0 1px 4px rgba(249,115,22,0.4)" }}>
                <Crown size={7} /> Dest.
              </div>
            )}
            <img src={imgUrl(p.image)} alt={p.name} />
            <div className="hero-card-body">
              <p className="hero-card-name">{p.name}</p>
              <div className="hero-card-stars">
                <StarRow rating={rating} size={11} />
                <span className="hero-card-rating-text">{rating > 0 ? rating.toFixed(1) : "Sin votos"}</span>
              </div>
              <div className="hero-card-footer">
                <div className="hero-card-footer-row">
                  <span className="hero-card-price">${p.price.toLocaleString()}</span>
                  {bizId && <Link href={`/negocio/${bizId}`} className="hero-card-visit">Visitar →</Link>}
                </div>
                {p.business?.cuotaSuscriptor === true && (
                  <div className="hero-card-promo-badge">
                    <Crown size={9} color="#fff" />
                    <span>PROMOCIONADO</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Business Card ────────────────────────────────────────────────────────────
function BusinessCard({ featured }: { featured: FeaturedBusiness }) {
  const b = featured.business;
  const followers = b.followers?.length ?? 0;
  return (
    <div className="biz-card" style={{ border: "1.5px solid rgba(249,115,22,0.4)" }}>
      <Link href={`/negocio/${b._id}`} className="biz-card-banner">
        <img src={logoUrl(b.name, b.logo)} alt={b.name} className="biz-card-banner-img" />
        <div className="biz-card-banner-overlay" />
        <span className="biz-card-featured-badge"><Crown size={10} style={{ marginRight: 3 }} /> Destacado</span>
        {b.verified && <span className="biz-card-verified-dot"><CheckCircle size={13} /></span>}
        <div className="biz-card-banner-name">
          <span className="biz-card-name">{b.name}</span>
          <span className="biz-card-city"><MapPin size={11} />{b.city}</span>
        </div>
      </Link>
      <div className="biz-card-body">
        {b.description && <p className="biz-card-desc">{b.description}</p>}
        <div className="biz-card-stats">
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <StarRow rating={b.rating ?? 0} size={13} />
            <span className="biz-card-stat-text">
              {b.rating && b.rating > 0 ? `${b.rating.toFixed(1)} (${b.totalRatings ?? 0})` : "Sin calificación"}
            </span>
          </div>
          <div className="biz-card-meta-row">
            {followers > 0 && <span className="biz-card-meta-item"><Users size={12} />{followers} seguidores</span>}
            {(b.totalProducts ?? 0) > 0 && <span className="biz-card-meta-item"><Package size={12} />{b.totalProducts} productos</span>}
          </div>
        </div>
        <div className="biz-card-actions">
          <Link href={`/negocio/${b._id}`} className="biz-card-visit-btn"><Store size={13} /> Visitar tienda</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Featured Businesses Slider ───────────────────────────────────────────────
function FeaturedBusinessesSlider({ businesses }: { businesses: FeaturedBusiness[] }) {
  const SHOW = 3;
  const total = businesses.length;
  const [startIdx, setStartIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (total <= SHOW) return;
    const t = setInterval(() => advance(1), 10_000);
    return () => clearInterval(t);
  }, [total, startIdx]);

  const advance = (dir: number) => {
    setFade(false);
    setTimeout(() => {
      setStartIdx((i) => (i + dir + total) % total);
      setFade(true);
    }, 280);
  };

  if (total === 0) return null;
  const visible = Array.from({ length: Math.min(SHOW, total) }, (_, i) => businesses[(startIdx + i) % total]);
  const showDots = total > SHOW && total <= 10;

  return (
    <div className="featured-biz-slider">
      <div className="featured-biz-slider__header">
        <div>
          <h2 className="section-title">
            <span className="section-title-icon"><Store size={20} strokeWidth={2} /></span>
            Negocios destacados
          </h2>
          <p className="section-subtitle">{total} negocio{total !== 1 ? "s" : ""} con plan activo</p>
        </div>
        {total > SHOW && (
          <div className="featured-biz-slider__controls">
            <button className="fbs-nav-btn" onClick={() => advance(-1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
            <button className="fbs-nav-btn" onClick={() => advance(1)} aria-label="Siguiente"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
      <div className="featured-biz-slider__track" style={{ opacity: fade ? 1 : 0 }}>
        {visible.map((f) => <BusinessCard key={`${f._id}-${startIdx}`} featured={f} />)}
      </div>
      {showDots && (
        <div className="fbs-dots">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              className={`fbs-dot ${i === startIdx ? "active" : ""}`}
              onClick={() => { setFade(false); setTimeout(() => { setStartIdx(i); setFade(true); }, 280); }}
              aria-label={`Ir al negocio ${i + 1}`}
            />
          ))}
        </div>
      )}
      <div className="fbs-ver-todos-bottom">
        <Link href="/destacados" className="fbs-ver-todos-link">
          <Crown size={14} />Ver todos los destacados<ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ─── Flash Offer Card (grid) ───────────────────────────────────────────────
function FlashOfferCard({ product }: { product: Product }) {
  const bizId = product.business?._id;
  const discount = product.flashOffer?.discount ?? 0;
  const finalPrice = product.price * (1 - discount / 100);
  const [timeLabel, setTimeLabel] = useState(formatFlashTime(product.flashOfferSecondsLeft));

  useEffect(() => {
    let secs = product.flashOfferSecondsLeft ?? 0;
    const t = setInterval(() => {
      secs -= 60;
      setTimeLabel(formatFlashTime(secs));
    }, 60_000);
    return () => clearInterval(t);
  }, [product.flashOfferSecondsLeft]);

  return (
    <Link href={bizId ? `/negocio/${bizId}?p=${product._id}` : "#"} className="flash-card">
      <span className="flash-card-badge">
        <Zap size={11} fill="#fff" strokeWidth={0} /> -{discount}%
      </span>
      <span className="flash-card-timer">
        <Clock size={10} /> {timeLabel}
      </span>
      <div className="flash-card-img-wrap">
        <img src={imgUrl(product.image)} alt={product.name} className="flash-card-img" />
      </div>
      <div className="flash-card-body">
        {product.business?.name && <p className="flash-card-biz">{product.business.name}</p>}
        <p className="flash-card-name">{product.name}</p>
        <div className="flash-card-prices">
          <span className="flash-card-price-final">
            ${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="flash-card-price-orig">${product.price.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Flash Offers Section (aleatorio, grid) ────────────────────────────────
function FlashOffersSection({ products }: { products: Product[] }) {
  const [randomized, setRandomized] = useState<Product[]>([]);

  useEffect(() => {
    const flashProducts = products.filter((p) => p.flashOffer?.active === true);
    if (flashProducts.length === 0) {
      setRandomized([]);
      return;
    }
    // Mezcla real (Fisher-Yates), no solo "los primeros N" -> aunque haya
    // 150 ofertas activas, cada carga muestra una selección distinta.
    setRandomized(shuffleArray(flashProducts).slice(0, 12));
  }, [products]);

  if (randomized.length === 0) return null;

  return (
    <section className="section flash-section">
      <div className="flash-section-header">
        <div>
          <h2 className="section-title flash-section-title">
            <span className="flash-section-icon">
              <Zap size={20} strokeWidth={0} fill="#fff" />
            </span>
            Ofertas Flash
          </h2>
          <p className="section-subtitle">
            {randomized.length} oferta{randomized.length !== 1 ? "s" : ""} por tiempo limitado
          </p>
        </div>
      </div>
      <div className="flash-grid">
        {randomized.map((p) => (
          <FlashOfferCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

// ─── Flash Offer Overlay Card (mini card del carrusel flotante) ───────────
function FlashOverlayCard({
  product,
  onAdd,
  justAdded,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  justAdded: boolean;
}) {
  const discount = product.flashOffer?.discount ?? 0;
  const finalPrice = product.price * (1 - discount / 100);
  const bizId = product.business?._id;

  return (
    <div className="flash-overlay-card">
      <Link href={bizId ? `/negocio/${bizId}?p=${product._id}` : "#"} className="flash-overlay-card-img-link">
        <img src={imgUrl(product.image)} alt={product.name} className="flash-overlay-card-img" />
        <span className="flash-overlay-card-badge">
          <Zap size={10} fill="#fff" strokeWidth={0} /> -{discount}%
        </span>
        {justAdded && <span className="flash-overlay-added-toast">¡Agregado!</span>}
      </Link>
      <div className="flash-overlay-card-body">
        {product.business?.name && <p className="flash-overlay-card-biz">{product.business.name}</p>}
        <p className="flash-overlay-card-name">{product.name}</p>
        <div className="flash-overlay-card-prices">
          <span className="flash-overlay-card-final">
            ${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="flash-overlay-card-orig">${product.price.toLocaleString()}</span>
        </div>
        <button
          className="flash-overlay-card-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd(product);
          }}
        >
          <ShoppingCart size={13} /> Agregar
        </button>
      </div>
    </div>
  );
}

// ─── Flash Offer Overlay (carrusel flotante, rota cada 3s, agrega al carrito) ──
function FlashOfferOverlay({ products }: { products: Product[] }) {
  const { addToCart } = useCart();
  const [pool, setPool] = useState<Product[]>([]);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [visible, setVisible] = useState(true);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Se oculta por sesión al cerrarlo (no por siempre): no molesta de nuevo
  // hasta que recargue la pestaña o abra una nueva.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("flash_overlay_dismissed") === "true") {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    const flashProducts = products.filter((p) => p.flashOffer?.active === true);
    setPool(shuffleArray(flashProducts));
    setIdx(0);
  }, [products]);

  // Rota de a 3 en 3, cada 3 segundos
  useEffect(() => {
    if (pool.length <= 3) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 3) % pool.length);
        setFade(true);
      }, 250);
    }, 3000);
    return () => clearInterval(t);
  }, [pool.length]);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("flash_overlay_dismissed", "true");
    }
  };

  // Precio flash calculado acá mismo y "congelado" en el carrito al momento
  // de agregar. Si el mismo producto se ve luego en la página del negocio,
  // el precio final sale de la misma lógica (product.flashOffer), así que
  // coincide mientras la oferta siga activa.
  const handleAdd = (product: Product) => {
    const discount = product.flashOffer?.discount ?? 0;
    const finalPrice = product.price * (1 - discount / 100);
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: Number(finalPrice.toFixed(2)),
      originalPrice: product.price,
      discount,
      image: product.image,
      businessId: product.business?._id,
      businessName: product.business?.name,
      businessPhone: product.business?.phone || "",
      stock: product.stock || 99,
    });
    setJustAddedId(product._id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  if (!visible || pool.length === 0) return null;

  const slice = Array.from(
    { length: Math.min(3, pool.length) },
    (_, i) => pool[(idx + i) % pool.length]
  );

  return (
    <div className="flash-overlay">
      <div className="flash-overlay-header">
        <span className="flash-overlay-title">
          <Zap size={14} fill="#fff" strokeWidth={0} /> Ofertas Flash
        </span>
        <button className="flash-overlay-close" onClick={dismiss} aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className="flash-overlay-track" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.25s ease" }}>
        {slice.map((p) => (
          <FlashOverlayCard
            key={p._id}
            product={p}
            onAdd={handleAdd}
            justAdded={justAddedId === p._id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, currentUserId }: { product: Product; currentUserId?: string }) {
  const { addToCart } = useCart();
  const [liked, setLiked] = useState(false);
  const [justShared, setJustShared] = useState(false);

  const isFeatured = product._isFeatured === true;
  const isOutOfRange = product._outOfRange === true;
  const isFlash = product.flashOffer?.active === true;
  const bizId = product.business?._id;
  const bizName = product.business?.name;
  const bizCity = product.business?.city;
  const followers = product.business?.followers?.length ?? 0;
  const rating = product.business?.rating ?? 0;
  const totalRatings = product.business?.totalRatings ?? 0;

  const flashDiscount = product.flashOffer?.discount ?? 0;
  const flashFinalPrice = isFlash ? product.price * (1 - flashDiscount / 100) : product.price;

  const handleCart = () => {
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: isFlash ? Number(flashFinalPrice.toFixed(2)) : product.price,
      originalPrice: isFlash ? product.price : product.originalPrice,
      discount: isFlash ? flashDiscount : product.discount,
      image: product.image,
      businessId: bizId,
      businessName: bizName,
      businessPhone: product.business?.phone || "",
      stock: product.stock || 99,
    });
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({ icon: "info", title: "Iniciá sesión", timer: 2000, showConfirmButton: false });
      return;
    }
    setLiked((v) => !v);
  };

  // ── Compartir producto ────────────────────────────────────────────────────
  // Usa la URL "linda" del backend (/p/<id>) que arma una preview con
  // imagen + nombre + precio (Open Graph) y redirige al negocio resaltando
  // este producto en particular.
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = shareUrlFor(product._id);
    const shareData = {
      title: product.name,
      text: `${product.name} · $${product.price.toLocaleString()}`,
      url,
    };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share(shareData);
      } catch {
        /* usuario canceló el share nativo, no hacemos nada */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setJustShared(true);
      setTimeout(() => setJustShared(false), 1800);
    } catch {
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({ icon: "info", title: "Enlace para compartir", text: url });
    }
  };

  return (
    <div
      className="product-card"
      style={
        isFlash
          ? { border: "1.5px solid rgba(250,204,21,0.6)", boxShadow: "0 0 0 1px rgba(250,204,21,0.18), 0 4px 20px rgba(250,204,21,0.15)" }
          : isFeatured
          ? { border: "1.5px solid rgba(249,115,22,0.5)", boxShadow: "0 0 0 1px rgba(249,115,22,0.12), 0 4px 20px rgba(249,115,22,0.1)" }
          : undefined
      }
    >
      <div className="product-image-wrap">
        <img src={imgUrl(product.image)} alt={product.name} loading="lazy" />
        {!isFlash && product.discount ? <span className="product-discount-badge">-{product.discount}%</span> : null}

        {isFlash && (
          <span className="product-flash-badge">
            <Zap size={10} fill="#111" strokeWidth={0} /> FLASH -{flashDiscount}%
          </span>
        )}

        {!isFlash && isFeatured && (
          <span style={{ position: "absolute", top: 8, left: 8, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 8px rgba(249,115,22,0.5)", zIndex: 2 }}>
            <Crown size={9} /> Destacado
          </span>
        )}

        <button className="product-fav-btn product-fav-btn--always" onClick={handleLike}>
          <span style={{ fontSize: "1.05rem", color: liked ? "#ef4444" : "#9ca3af", transition: "color 0.2s" }}>
            {liked ? "♥" : "♡"}
          </span>
        </button>
        <button
          className="product-fav-btn product-fav-btn--always"
          style={{ right: "2.6rem" }}
          onClick={handleShare}
          aria-label="Compartir producto"
          title="Compartir"
        >
          <Share2 size={15} style={{ color: justShared ? "#22c55e" : "#9ca3af", transition: "color 0.2s" }} />
        </button>
        {justShared && (
          <span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(34,197,94,0.95)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, zIndex: 3 }}>
            ¡Enlace copiado!
          </span>
        )}
      </div>

      {isFlash && (
        <div className="product-flash-strip">
          <Zap size={10} fill="#f59e0b" strokeWidth={0} />
          <span>Oferta por tiempo limitado · {formatFlashTime(product.flashOfferSecondsLeft)} restantes</span>
        </div>
      )}

      {!isFlash && isFeatured && isOutOfRange && (
        <div style={{ background: "linear-gradient(90deg,rgba(249,115,22,0.13),rgba(249,115,22,0.07))", borderBottom: "1px solid rgba(249,115,22,0.2)", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Sparkles size={10} style={{ color: "#f97316", flexShrink: 0 }} />
          <span style={{ fontSize: "0.65rem", color: "#fdba74", fontWeight: 700, lineHeight: 1.3 }}>No está cerca, pero te lo acercamos</span>
        </div>
      )}

      <div className="product-body">
        {bizId ? (
          <Link href={`/negocio/${bizId}`} className="product-business" style={{ textDecoration: "none", color: "inherit" }}>
            {bizName}{bizCity ? ` · ${bizCity}` : ""}
            {product.business?.verified && <span style={{ color: "#f97316", marginLeft: "0.2rem" }}>✓</span>}
          </Link>
        ) : (
          <div className="product-business">{bizName}{bizCity ? ` · ${bizCity}` : ""}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
          <StarRow rating={rating} size={13} />
          <span style={{ fontSize: "0.71rem", color: "#9ca3af", fontWeight: 500 }}>
            {rating > 0 ? `${rating.toFixed(1)} (${totalRatings})` : "Sin calificación"}
          </span>
          {followers > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "0.71rem", color: "#9ca3af" }}>
              <Users size={10} />{followers}
            </span>
          )}
        </div>
        <div className="product-name">{product.name}</div>
        <div className="product-prices">
          {isFlash ? (
            <>
              <span className="product-price product-price--flash">
                ${flashFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="product-original">${product.price.toLocaleString()}</span>
            </>
          ) : (
            <>
              <span className="product-price">${product.price.toLocaleString()}</span>
              {product.originalPrice && <span className="product-original">${product.originalPrice.toLocaleString()}</span>}
            </>
          )}
        </div>
      </div>

      <div className="product-card-footer" style={{ flexDirection: "column", gap: "0.45rem" }}>
        <button className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }} onClick={handleCart}>
          <ShoppingCart size={15} /> Agregar al carrito
        </button>
        <div style={{ display: "flex", gap: "0.4rem", width: "100%" }}>
          {bizId && (
            <Link href={`/negocio/${bizId}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.38rem", borderRadius: "8px", border: "1.5px solid var(--border)", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>
              <Store size={13} style={{ marginRight: "0.25rem" }} /> Visitar negocio
            </Link>
          )}
          <button
            onClick={handleShare}
            style={{ flex: bizId ? undefined : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.38rem 0.7rem", borderRadius: "8px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}
          >
            <Share2 size={13} /> Compartir
          </button>
        </div>
        <ReportModal
          targetType="product"
          targetId={product._id}
          targetName={product.name}
          token={typeof window !== "undefined" ? localStorage.getItem("marketplace_token") || "" : ""}
          onRequireAuth={async () => {
            const Swal = (await import("sweetalert2")).default;
            Swal.fire({ icon: "info", title: "Iniciá sesión para reportar", timer: 2000, showConfirmButton: false });
          }}
        />
      </div>
    </div>
  );
}

// ─── Home Content ─────────────────────────────────────────────────────────────
function HomeContent() {
  const { user, enableLocation, enableNotifications } = useAuth();
  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search") || "";

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [publicStats, setPublicStats] = useState<PublicStats>({ totalProducts: 0, totalBusinesses: 0 });
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportedProductIds, setReportedProductIds] = useState<Set<string>>(new Set());

  // ── Banners persistentes en localStorage ─────────────────────────────────────
  // Se guardan por dispositivo, no por sesión, así no vuelven a aparecer
  // aunque el user haga logout y login de nuevo.
  const [geoBannerDismissed, setGeoBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("geo_banner_dismissed") === "true";
  });
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("notif_banner_dismissed") === "true";
  });

  const dismissGeoBanner = () => {
    localStorage.setItem("geo_banner_dismissed", "true");
    setGeoBannerDismissed(true);
  };

  const dismissNotifBanner = () => {
    localStorage.setItem("notif_banner_dismissed", "true");
    setNotifBannerDismissed(true);
  };

  // ── También ocultar el banner si el permiso ya fue concedido a nivel del navegador ──
  // Aunque el user haga logout, si ya dio permiso en el navegador no tiene sentido mostrarlo.
  const notifAlreadyGranted = typeof window !== "undefined" && Notification.permission === "granted";

  const currentUserId = (user as any)?._id || (user as any)?.id;
  const userLat = (user as any)?.lat;
  const userLng = (user as any)?.lng;
  const userHasLoc = !!(user?.locationEnabled && userLat && userLng);

  const [userRadius] = useState<number>(() => {
    if (typeof window === "undefined") return 3000;
    const saved = localStorage.getItem("nearbyRadius");
    return saved ? parseInt(saved) : 3000;
  });

  const buildLocationParams = (extra: Record<string, string> = {}): string => {
    const p = new URLSearchParams(extra);
    if (userHasLoc) {
      p.set("lat", userLat.toString());
      p.set("lng", userLng.toString());
      p.set("userRadius", userRadius.toString());
    }
    if (currentUserId) p.set("userId", currentUserId);
    return p.toString();
  };

  useEffect(() => {
    fetch(`${API}/products/public-stats`)
      .then((r) => r.json())
      .then(setPublicStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = buildLocationParams({ limit: "60" });
    fetch(`${API}/products/featured?${params}`)
      .then((r) => r.json())
      .then(async (data) => {
        const featured: Product[] = data.products || [];
        if (featured.length === 0) {
          const r2 = await fetch(`${API}/products/random?${buildLocationParams({ limit: "40" })}`);
          const d2 = await r2.json();
          setAllProducts(d2.products || []);
        } else {
          const excludeIds = featured.map((p) => p._id);
          const extra: Record<string, string> = { limit: "40" };
          if (excludeIds.length) extra.excludeIds = JSON.stringify(excludeIds);
          if (activeCategory) extra.category = activeCategory;
          if (searchParam) extra.search = searchParam;
          const r2 = await fetch(`${API}/products/random?${buildLocationParams(extra)}`);
          const d2 = await r2.json();
          setAllProducts([...featured, ...(d2.products || [])]);
        }
      })
      .catch(async () => {
        try {
          const r2 = await fetch(`${API}/products/random?${buildLocationParams({ limit: "40" })}`);
          const d2 = await r2.json();
          setAllProducts(d2.products || []);
        } catch {
          setAllProducts([]);
        }
      })
      .finally(() => setLoading(false));
  }, [currentUserId, userHasLoc, userRadius, activeCategory, searchParam]);

  useEffect(() => {
    if (!allProducts.length) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
    if (!token) { setReportedProductIds(new Set()); return; }
    const productIds = allProducts.filter((p) => !p._isFeatured).map((p) => p._id);
    if (!productIds.length) return;
    fetch(`${API}/reports/batch-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productIds }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.reportedIds) setReportedProductIds(new Set(data.reportedIds as string[])); })
      .catch(() => {});
  }, [allProducts]);

  useEffect(() => {
    fetch(`${API}/products/featured-businesses`)
      .then((r) => r.json())
      .then((data) => setFeaturedBusinesses(Array.isArray(data) ? data : []))
      .catch(() => setFeaturedBusinesses([]));
  }, []);

  const handleRequestGeo = async () => {
    const Swal = (await import("sweetalert2")).default;
    const r = await Swal.fire({
      title: "Activar ubicación",
      icon: "info",
      showCancelButton: true,
      html: "Necesitamos tu ubicación para mostrarte productos <b>cercanos a vos</b>.",
      confirmButtonText: "Activar",
      cancelButtonText: "Ahora no",
      confirmButtonColor: "var(--primary)",
    });
    if (r.isConfirmed) {
      const ok = await enableLocation();
      Swal.fire(
        ok
          ? { icon: "success", title: "¡Ubicación activada!", timer: 2000, showConfirmButton: false }
          : { icon: "error", title: "No se pudo activar", text: "Verificá los permisos de tu navegador." }
      );
    }
    dismissGeoBanner();
  };

  const handleRequestNotifications = async () => {
    const Swal = (await import("sweetalert2")).default;
    const r = await Swal.fire({
      title: "Activar notificaciones",
      icon: "info",
      showCancelButton: true,
      html: "Recibí alertas de <b>ofertas exclusivas</b> de tus negocios favoritos.",
      confirmButtonText: "Activar",
      cancelButtonText: "Ahora no",
      confirmButtonColor: "var(--primary)",
    });
    if (r.isConfirmed) {
      const ok = await enableNotifications();
      if (!ok) Swal.fire({ icon: "warning", title: "Permisos denegados", text: "Habilitá las notificaciones desde la configuración." });
    }
    // Siempre dismissar aunque haya cancelado — si lo cerró una vez, no volvemos a molestar
    dismissNotifBanner();
  };

  const radiusLabel =
    userRadius === 0 ? "todo el país"
    : userRadius >= 1000 ? `${userRadius / 1000} km`
    : `${userRadius} m`;

  const sectionTitle = searchParam
    ? `Resultados para "${searchParam}"`
    : activeCategory
      ? (categories.find((c) => c.slug === activeCategory)?.name || activeCategory) + " — Ofertas"
      : userHasLoc ? `Ofertas en ${radiusLabel}` : "Ofertas del día";

  const heroProducts = allProducts.slice(0, 9);
  const hasFeatured = allProducts.some((p) => p._isFeatured);
  const gridProducts = allProducts.filter((p) => !reportedProductIds.has(p._id));

  // ── El banner de notificaciones se oculta si:
  //    1. Ya fue dismissado (localStorage)
  //    2. El permiso del navegador ya es "granted" (ya activó antes)
  //    3. No hay usuario logueado
  const showNotifBanner = !!user && !notifBannerDismissed && !notifAlreadyGranted;

  return (
    <MainLayout>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-tag">Ofertas exclusivas hoy</div>
            <h1>Las mejores<br /><em>ofertas</em> cerca tuyo</h1>
            <p className="hero-desc">Descubrí productos increíbles de negocios verificados. Filtrá por categoría y ubicación.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" style={{ fontSize: "0.95rem", padding: "0.75rem 1.75rem" }} onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}>
                Ver ofertas
              </button>
              {!user && <a href="/register" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}>Registrarse gratis</a>}
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">{publicStats.totalProducts > 0 ? `+${publicStats.totalProducts.toLocaleString()}` : "—"}</span>
                <span className="hero-stat-label">Productos</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">{publicStats.totalBusinesses > 0 ? `+${publicStats.totalBusinesses.toLocaleString()}` : "—"}</span>
                <span className="hero-stat-label">Negocios</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">98%</span>
                <span className="hero-stat-label">Satisfacción</span>
              </div>
            </div>
          </div>
          {heroProducts.length > 0 && <HeroSlider products={heroProducts} />}
        </div>
      </section>

      {/* ─── Banner geo ───────────────────────────────────────────────────── */}
      {!user?.locationEnabled && !geoBannerDismissed && (
        <div style={{ padding: "1.5rem 1.5rem 0" }}>
          <div className="geo-banner">
            <span className="geo-banner-icon"><MapPin size={26} strokeWidth={1.75} /></span>
            <div className="geo-banner-text">
              <h3>¿Querés ver ofertas cerca tuyo?</h3>
              <p>Activá tu ubicación y te mostramos los mejores productos de tu zona.</p>
            </div>
            <div className="geo-banner-actions">
              <button className="btn btn-primary" onClick={handleRequestGeo}>Activar ubicación</button>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={dismissGeoBanner}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Banner notificaciones ─────────────────────────────────────────── */}
      {showNotifBanner && (
        <div style={{ padding: "1rem 1.5rem 0" }}>
          <div className="geo-banner" style={{ borderColor: "rgba(249,115,22,0.3)" }}>
            <span className="geo-banner-icon"><Bell size={26} strokeWidth={1.75} /></span>
            <div className="geo-banner-text">
              <h3>Activá las notificaciones</h3>
              <p>Hola {user.name.split(" ")[0]}, no te pierdas ofertas exclusivas de tus favoritos.</p>
            </div>
            <div className="geo-banner-actions">
              <button className="btn btn-primary" onClick={handleRequestNotifications}>Activar</button>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={dismissNotifBanner}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Ofertas Flash (grid, aleatorio) ───────────────────────────────── */}
      <FlashOffersSection products={allProducts} />

      {/* ─── Negocios destacados ───────────────────────────────────────────── */}
      {featuredBusinesses.length > 0 && (
        <section className="section">
          <FeaturedBusinessesSlider businesses={featuredBusinesses} />
        </section>
      )}

      {/* ─── Categorías ───────────────────────────────────────────────────── */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Categorías</h2>
            <p className="section-subtitle">Explorá por rubro</p>
          </div>
        </div>
        <div className="categories-grid">
          <div className={`category-card ${!activeCategory ? "active" : ""}`} onClick={() => setActiveCategory("")}>
            <Tag size={30} strokeWidth={2.5} />
            <span className="category-name">Todas</span>
          </div>
          {categories.map((cat) => (
            <div key={cat.slug} className={`category-card ${activeCategory === cat.slug ? "active" : ""}`} onClick={() => setActiveCategory(cat.slug)}>
              <CategoryIcon name={cat.iconName} size={24} strokeWidth={1.75} />
              <span className="category-name">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Grid de ofertas ──────────────────────────────────────────────── */}
      <section className="section" id="offers">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <span className="section-title-icon">
                {hasFeatured ? <Crown size={20} strokeWidth={2} style={{ color: "#f97316" }} />
                  : userHasLoc ? <MapPin size={20} strokeWidth={2} />
                  : <TrendingUp size={20} strokeWidth={2} />}
              </span>
              {sectionTitle}
            </h2>
            <p className="section-subtitle">
              {gridProducts.length} productos
              {hasFeatured && <span style={{ marginLeft: "0.5rem", color: "#f97316", fontSize: "0.75rem", fontWeight: 600 }}>· incluye destacados</span>}
              {userHasLoc && !hasFeatured && <span style={{ marginLeft: "0.5rem", color: "#4ade80", fontSize: "0.75rem", fontWeight: 600 }}>· {radiusLabel}</span>}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <Clock size={32} style={{ opacity: 0.4, display: "block", margin: "0 auto 1rem" }} />
            <p>Cargando ofertas...</p>
          </div>
        ) : gridProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <Search size={48} strokeWidth={1} style={{ opacity: 0.3, display: "block", margin: "0 auto 1rem" }} />
            <h3>No encontramos resultados</h3>
            <p>{userHasLoc ? `No hay productos en ${radiusLabel}. Probá con un radio más amplio.` : "Probá con otra búsqueda o categoría."}</p>
          </div>
        ) : (
          <div className="products-grid">
            {gridProducts.map((p, i) => (
              <ProductCard key={`${p._id}-${i}`} product={p} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Banner CTA ────────────────────────────────────────────────────── */}
      <div className="banner" style={{ margin: "0 1.5rem" }}>
        <div>
          <h2>¿Tenés un negocio?</h2>
          <p>Publicá tus productos y llegá a miles de clientes cerca tuyo.</p>
        </div>
        <a href="/register" className="btn btn-white">Empezar gratis</a>
      </div>

      {/* ─── Overlay flotante de ofertas flash (carrusel, agrega al carrito) ── */}
      <FlashOfferOverlay products={allProducts} />
    </MainLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Clock size={32} style={{ opacity: 0.3, display: "block", margin: "0 auto 1rem" }} />
            <p>Cargando...</p>
          </div>
        </MainLayout>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
