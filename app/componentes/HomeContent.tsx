"use client";

// app/componentes/HomeContent.tsx
// Antes vivía en app/page.tsx. Se movió acá para que app/page.tsx pueda ser
// un server component con metadata + JSON-LD para SEO, sin tocar nada de
// la lógica ni la UI de este archivo.

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "./MainLayout";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import CategoryIcon from "./cateroryicon";
import { categories } from "../lib/db";
import ReportModal from "./reportModal";
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
  Navigation,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import "../styles/home.css";

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

// ── Negocios cerca tuyo (home) ────────────────────────────────────────────
// Mismo shape que devuelve GET /api/business/nearby (el que ya usa el panel
// de perfil), reutilizado acá para no depender de estar logueado ni de
// tener la ubicación guardada en la cuenta.
interface NearbyHomeBusiness {
  _id: string;
  name: string;
  logo?: string;
  city?: string;
  address?: string;
  rating?: number;
  totalRatings?: number;
  verified?: boolean;
  categories?: string[];
  distanceMeters: number;
  distanceLabel: string;
  // Coordenadas del negocio (si el backend las manda) — se usan para
  // recalcular la distancia en vivo con Haversine sin volver a pegarle a la API.
  location?: { type: string; coordinates: [number, number] };
}

type NearbyGeoStatus = "idle" | "loading" | "ok" | "denied" | "error";

const HOME_RADIUS_OPTIONS = [
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "Todo el país", value: 0 },
];

// Distancia mínima en metros para volver a pedirle negocios cercanos al
// backend. El usuario tiene que moverse al menos esto antes de refrescar
// la lista; mientras tanto, las distancias en pantalla igual se actualizan
// en vivo (ver liveNearbyBizList).
const NEARBY_FETCH_THRESHOLD_METERS = 100;

const imgUrl = (url?: string) =>
  url || "https://via.placeholder.com/300x200?text=Producto";
const logoUrl = (name: string, url?: string) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&background=f97316&color=fff`;

const shareUrlFor = (productId: string) => `${BACKEND_ORIGIN}/p/${productId}`;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dedupeById<T extends { _id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((it) => map.set(it._id, it));
  return Array.from(map.values());
}

// ── Haversine: distancia en metros entre dos coordenadas ─────────────────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function flashBasePrice(product: Product): number {
  return product.originalPrice ?? product.price;
}

function computeFlashFinalPrice(product: Product): number {
  const discount = product.flashOffer?.discount ?? 0;
  return flashBasePrice(product) * (1 - discount / 100);
}

function formatFlashTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Terminando";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

function formatClockCountdown(seconds?: number): string {
  const s = Math.max(0, Math.floor(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

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

  useEffect(() => {
    setIdx(0);
  }, [suscriptorProducts.length]);

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
            <button key={i} className={`fbs-dot ${i === startIdx ? "active" : ""}`} onClick={() => { setFade(false); setTimeout(() => { setStartIdx(i); setFade(true); }, 280); }} aria-label={`Ir al negocio ${i + 1}`} />
          ))}
        </div>
      )}
      <div className="fbs-ver-todos-bottom">
        <Link href="/destacados" className="fbs-ver-todos-link"><Crown size={14} />Ver todos los destacados<ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}

function FlashOfferCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const discount = product.flashOffer?.discount ?? 0;
  const finalPrice = computeFlashFinalPrice(product);
  const basePrice = flashBasePrice(product);
  const [secondsLeft, setSecondsLeft] = useState<number>(product.flashOfferSecondsLeft ?? 0);
  useEffect(() => { setSecondsLeft(product.flashOfferSecondsLeft ?? 0); }, [product.flashOfferSecondsLeft]);
  useEffect(() => {
    const t = setInterval(() => { setSecondsLeft((s) => (s > 0 ? s - 1 : 0)); }, 1000);
    return () => clearInterval(t);
  }, []);
  const isUrgent = secondsLeft > 0 && secondsLeft <= 300;
  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: Number(finalPrice.toFixed(2)),
      originalPrice: basePrice,
      discount,
      image: product.image,
      businessId: product.business?._id,
      businessName: product.business?.name,
      businessPhone: product.business?.phone || "",
      stock: product.stock || 99,
      isFlashOffer: true,
    } as any);
  };
  return (
    <div className="flash-card">
      <div className="flash-card-content">
        <span className="flash-card-badge"><Zap size={11} fill="#fff" strokeWidth={0} /> -{discount}%</span>
        <span className={`flash-card-timer ${isUrgent ? "urgent" : ""}`}><Clock size={10} /> {formatClockCountdown(secondsLeft)}</span>
        <div className="flash-card-img-wrap"><img src={imgUrl(product.image)} alt={product.name} className="flash-card-img" /></div>
        <div className="flash-card-body">
          {product.business?.name && <p className="flash-card-biz">{product.business.name}</p>}
          <p className="flash-card-name">{product.name}</p>
          <div className="flash-card-prices">
            <span className="flash-card-price-final">${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="flash-card-price-orig">${basePrice.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="flash-card-footer">
        <button className="flash-card-cart-btn" onClick={handleCart}><ShoppingCart size={14} /> Agregar al carrito</button>
      </div>
    </div>
  );
}

function FlashOffersSection({ products }: { products: Product[] }) {
  const [randomized, setRandomized] = useState<Product[]>([]);
  useEffect(() => {
    const flashProducts = dedupeById(products.filter((p) => p.flashOffer?.active === true));
    if (flashProducts.length === 0) { setRandomized([]); return; }
    setRandomized(shuffleArray(flashProducts).slice(0, 12));
  }, [products]);
  if (randomized.length === 0) return null;
  return (
    <section className="section flash-section">
      <div className="flash-section-header">
        <div>
          <h2 className="section-title flash-section-title"><span className="flash-section-icon"><Zap size={20} strokeWidth={0} fill="#fff" /></span>Ofertas Flash</h2>
          <p className="section-subtitle">{randomized.length} oferta{randomized.length !== 1 ? "s" : ""} por tiempo limitado</p>
        </div>
      </div>
      <div className="flash-grid">
        {randomized.map((p) => (<FlashOfferCard key={p._id} product={p} />))}
      </div>
    </section>
  );
}

function FlashOverlayCard({
  product,
  secondsLeft,
  onAdd,
  justAdded,
}: {
  product: Product;
  secondsLeft: number;
  onAdd: (p: Product) => void;
  justAdded: boolean;
}) {
  const discount = product.flashOffer?.discount ?? 0;
  const finalPrice = computeFlashFinalPrice(product);
  const basePrice = flashBasePrice(product);
  const isUrgent = secondsLeft > 0 && secondsLeft <= 300;
  return (
    <div className="flash-overlay-card" style={{ display: "flex", width: "100%", minWidth: "100%", gap: "1.2rem", alignItems: "center", background: "#111", borderRadius: "16px", padding: "1rem", flex: 1, boxSizing: "border-box" }}>
      <div className="flash-overlay-card-media" style={{ position: "relative", width: "160px", height: "160px", flexShrink: 0 }}>
        <img src={imgUrl(product.image)} alt={product.name} className="flash-overlay-card-img" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
        <span className="flash-overlay-card-badge" style={{ position: "absolute", top: 6, left: 6, background: "#f97316", color: "#fff", padding: "2px 6px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 2 }}>
          <Zap size={10} fill="#fff" strokeWidth={0} /> -{discount}%
        </span>
        {justAdded && (<span className="flash-overlay-added-toast" style={{ position: "absolute", bottom: 6, left: 6, right: 6, background: "#22c55e", color: "#fff", textAlign: "center", borderRadius: "6px", fontSize: "0.7rem", padding: "2px" }}>¡Agregado!</span>)}
      </div>
      <div className="flash-overlay-card-body" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: 0 }}>
        {product.business?.name && (<p className="flash-overlay-card-biz" style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>{product.business.name}</p>)}
        <p className="flash-overlay-card-name" style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</p>
        <span className={`flash-overlay-card-timer ${isUrgent ? "urgent" : ""}`} style={{ color: isUrgent ? "#ef4444" : "#fbbf24", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {formatClockCountdown(secondsLeft)} restantes</span>
        <div className="flash-overlay-card-prices" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.3rem" }}>
          <span className="flash-overlay-card-final" style={{ color: "#f97316", fontWeight: 900, fontSize: "1.4rem" }}>${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="flash-overlay-card-orig" style={{ color: "#6b7280", textDecoration: "line-through", fontSize: "0.9rem" }}>${basePrice.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", flexShrink: 0 }}>
        <button className="flash-overlay-card-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(product); }} style={{ background: "#f97316", color: "#fff", border: 0, borderRadius: "999px", padding: "0.8rem 1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
          <ShoppingCart size={16} /> Agregar al carrito
        </button>
      </div>
    </div>
  );
}

function FlashOfferOverlay({ products }: { products: Product[] }) {
  const { addToCart } = useCart();
  const [pool, setPool] = useState<Product[]>([]);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [visible, setVisible] = useState(true);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const dismiss = () => { setVisible(false); };

  useEffect(() => {
    const flashProducts = products.filter((p) => p.flashOffer?.active === true);
    const unique = dedupeById(flashProducts);
    setPool(shuffleArray(unique));
    setIdx(0);
    setCountdowns((prev) => {
      const next: Record<string, number> = {};
      unique.forEach((p) => { next[p._id] = prev[p._id] ?? (p.flashOfferSecondsLeft ?? 0); });
      return next;
    });
  }, [products]);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdowns((prev) => {
        const next: Record<string, number> = {};
        for (const id in prev) { next[id] = prev[id] > 0 ? prev[id] - 1 : 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const goTo = useCallback((dir: number) => {
    setFade(false);
    setTimeout(() => { setIdx((i) => i + dir); setFade(true); }, 250);
  }, []);

  const total = pool.length;
  const safeIdx = total > 0 ? ((idx % total) + total) % total : 0;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => goTo(1), 4000);
    return () => clearInterval(t);
  }, [total, safeIdx, goTo]);

  const handleAdd = (product: Product) => {
    const discount = product.flashOffer?.discount ?? 0;
    const finalPrice = computeFlashFinalPrice(product);
    const basePrice = flashBasePrice(product);
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: Number(finalPrice.toFixed(2)),
      originalPrice: basePrice,
      discount,
      image: product.image,
      businessId: product.business?._id,
      businessName: product.business?.name,
      businessPhone: product.business?.phone || "",
      stock: product.stock || 99,
      isFlashOffer: true,
    } as any);
    setJustAddedId(product._id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  if (!visible || total === 0) return null;
  const current = pool[safeIdx];

  return (
    <div className="flash-overlay" style={{ width: "100%", minWidth: "100%", background: "linear-gradient(90deg,#f97316 0%,#ea580c 100%)", borderRadius: "18px", padding: "0.6rem", display: "flex", flexDirection: "column", gap: "0.5rem", boxSizing: "border-box" }}>
      <div className="flash-overlay-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", padding: "0 0.4rem" }}>
        <span className="flash-overlay-title" style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}><Zap size={14} fill="#fff" strokeWidth={0} /> Ofertas Flash</span>
        <button className="flash-overlay-close" onClick={dismiss} aria-label="Cerrar" style={{ background: "rgba(0,0,0,0.2)", border: 0, color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}>✕</button>
      </div>
      <div className="flash-overlay-body" style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", minWidth: "100%" }}>
        {total > 1 && (<button className="flash-overlay-nav-btn" onClick={() => goTo(-1)} aria-label="Anterior" style={{ background: "rgba(0,0,0,0.3)", border: 0, color: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><ChevronLeft size={18} /></button>)}
        <div className="flash-overlay-slide" style={{ flex: 1, opacity: fade ? 1 : 0, transition: "opacity 0.25s", minWidth: 0, width: "100%" }}>
          <FlashOverlayCard key={current._id} product={current} secondsLeft={countdowns[current._id] ?? current.flashOfferSecondsLeft ?? 0} onAdd={handleAdd} justAdded={justAddedId === current._id} />
        </div>
        {total > 1 && (<button className="flash-overlay-nav-btn" onClick={() => goTo(1)} aria-label="Siguiente" style={{ background: "rgba(0,0,0,0.3)", border: 0, color: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><ChevronRight size={18} /></button>)}
      </div>
      {total > 1 && (
        <div className="flash-overlay-dots" style={{ display: "flex", justifyContent: "center", gap: 6, paddingBottom: 4 }}>
          {pool.map((p, i) => (<span key={p._id} className={`flash-overlay-dot ${i === safeIdx ? "active" : ""}`} style={{ width: i === safeIdx ? 20 : 8, height: 8, borderRadius: 999, background: i === safeIdx ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }} />))}
        </div>
      )}
    </div>
  );
}

// ── Negocios cerca tuyo (home) ────────────────────────────────────────────

function NearbyBusinessCard({ biz }: { biz: NearbyHomeBusiness }) {
  return (
    <Link href={`/negocio/${biz._id}`} className="nearby-home-card">
      <img
        src={logoUrl(biz.name, biz.logo)}
        alt={biz.name}
        className="nearby-home-card-logo"
      />
      <div className="nearby-home-card-info">
        <div className="nearby-home-card-name-row">
          <span className="nearby-home-card-name">{biz.name}</span>
          {biz.verified && <CheckCircle size={12} className="nearby-home-card-verified" />}
        </div>
        <div className="nearby-home-card-distance">
          <Navigation size={11} /> {biz.distanceLabel}
        </div>
        <div className="nearby-home-card-rating">
          <StarRow rating={biz.rating ?? 0} size={11} />
          <span className="nearby-home-card-rating-text">
            {(biz.rating ?? 0) > 0 ? biz.rating!.toFixed(1) : "Sin votos"}
          </span>
        </div>
      </div>
      <ArrowRight size={16} className="nearby-home-card-arrow" />
    </Link>
  );
}

function NearbyBusinessesSection({
  geoStatus,
  businesses,
  loading,
  error,
  radius,
  onRadiusChange,
  onRequestLocation,
  live,
}: {
  geoStatus: NearbyGeoStatus;
  businesses: NearbyHomeBusiness[];
  loading: boolean;
  error: string;
  radius: number;
  onRadiusChange: (v: number) => void;
  onRequestLocation: () => void;
  live?: boolean;
}) {
  const radiusLabel = HOME_RADIUS_OPTIONS.find((o) => o.value === radius)?.label || "3 km";
  const showPrompt = geoStatus === "idle" || geoStatus === "denied" || geoStatus === "error";

  return (
    <section className="section" id="negocios-cerca">
      <div className="nearby-section-header">
        <div className="nearby-section-header-text">
          <h2 className="section-title">
            <span className="section-title-icon"><Navigation size={20} strokeWidth={2} /></span>
            Negocios cerca tuyo
          </h2>
          <p className="section-subtitle">
            {geoStatus === "ok" ? (
              <>
                {businesses.length} negocio{businesses.length !== 1 ? "s" : ""} en {radiusLabel}
                {live && (
                  <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 4, color: "#4ade80", fontSize: "0.7rem", fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                    en vivo
                  </span>
                )}
              </>
            ) : (
              "Descubrí negocios cerca de tu ubicación, sin entrar a tu perfil"
            )}
          </p>
        </div>
        {geoStatus === "ok" && (
          <div className="nearby-radius-group">
            {HOME_RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onRadiusChange(opt.value)}
                className={`nearby-radius-btn ${opt.value === radius ? "active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={onRequestLocation}
              title="Actualizar ubicación"
              style={{ background: "none", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, padding: "0.35rem 0.55rem", color: "#f97316", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        )}
      </div>

      {showPrompt ? (
        <div className="nearby-prompt">
          <div className="nearby-prompt-icon">
            <MapPin size={24} />
          </div>
          <div>
            <p className="nearby-prompt-title">
              {geoStatus === "denied" ? "Ubicación bloqueada" : "Descubrí lo que tenés cerca"}
            </p>
            <p className="nearby-prompt-desc">
              {geoStatus === "denied"
                ? "Habilitá el permiso de ubicación desde tu navegador para ver negocios cercanos."
                : "Activá tu ubicación y te mostramos, con distancia incluida, los negocios más cercanos a vos."}
            </p>
          </div>
          {geoStatus !== "denied" && (
            <button className="btn btn-primary nearby-prompt-btn" onClick={onRequestLocation}>
              <Navigation size={15} /> Ver negocios cerca tuyo
            </button>
          )}
        </div>
      ) : geoStatus === "loading" ? (
        <div className="nearby-home-list">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="nearby-home-skeleton" />
          ))}
        </div>
      ) : loading ? (
        <div className="nearby-home-list">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="nearby-home-skeleton" />
          ))}
        </div>
      ) : error ? (
        <p className="nearby-error-text">{error}</p>
      ) : businesses.length === 0 ? (
        <div className="nearby-empty">
          <Store size={32} strokeWidth={1} className="nearby-empty-icon" />
          <p>No encontramos negocios en {radiusLabel}. Probá con un radio más amplio.</p>
        </div>
      ) : (
        <div className="nearby-home-list">
          {businesses.map((biz) => (
            <NearbyBusinessCard key={biz._id} biz={biz} />
          ))}
        </div>
      )}
    </section>
  );
}

function HomePageBody() {
  const { user, enableLocation, enableNotifications } = useAuth();
  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search") || "";
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [publicStats, setPublicStats] = useState<PublicStats>({ totalProducts: 0, totalBusinesses: 0 });
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportedProductIds, setReportedProductIds] = useState<Set<string>>(new Set());
  const [geoBannerDismissed, setGeoBannerDismissed] = useState<boolean>(() => { if (typeof window === "undefined") return false; return localStorage.getItem("geo_banner_dismissed") === "true"; });
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(() => { if (typeof window === "undefined") return false; return localStorage.getItem("notif_banner_dismissed") === "true"; });
  const dismissGeoBanner = () => { localStorage.setItem("geo_banner_dismissed", "true"); setGeoBannerDismissed(true); };
  const dismissNotifBanner = () => { localStorage.setItem("notif_banner_dismissed", "true"); setNotifBannerDismissed(true); };
  // FIX: en iOS Safari (y navegadores in-app como el de WhatsApp) el objeto global
  // "Notification" directamente no existe. Acceder a Notification.permission sin
  // chequear antes tira un ReferenceError que rompe toda la app ("client-side exception").
  const notifAlreadyGranted =
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted";
  const currentUserId = (user as any)?._id || (user as any)?.id;
  const userLat = (user as any)?.lat;
  const userLng = (user as any)?.lng;
  const userHasLoc = !!(user?.locationEnabled && userLat && userLng);
  const [userRadius] = useState<number>(() => { if (typeof window === "undefined") return 3000; const saved = localStorage.getItem("nearbyRadius"); return saved ? parseInt(saved) : 3000; });
  const buildLocationParams = (extra: Record<string, string> = {}): string => {
    const p = new URLSearchParams(extra);
    if (userHasLoc) { p.set("lat", userLat.toString()); p.set("lng", userLng.toString()); p.set("userRadius", userRadius.toString()); }
    if (currentUserId) p.set("userId", currentUserId);
    return p.toString();
  };

  // ── Negocios cerca tuyo (home) ──────────────────────────────────────────
  // Antes se pedía la ubicación una sola vez (getCurrentPosition) y quedaba
  // fija para siempre, aunque el usuario se moviera. Ahora seguimos el GPS
  // con watchPosition: las distancias se recalculan en vivo (Haversine) y
  // el listado se vuelve a pedir al backend solo cuando el usuario se movió
  // NEARBY_FETCH_THRESHOLD_METERS o más (o cambió el radio), para no
  // sobrecargar la API en cada tick del GPS.
  const [nearbyGeoStatus, setNearbyGeoStatus] = useState<NearbyGeoStatus>("idle");
  const [nearbyLat, setNearbyLat] = useState<number | null>(null);
  const [nearbyLng, setNearbyLng] = useState<number | null>(null);
  const [nearbyBizList, setNearbyBizList] = useState<NearbyHomeBusiness[]>([]);
  const [nearbyBizLoading, setNearbyBizLoading] = useState(false);
  const [nearbyBizError, setNearbyBizError] = useState("");
  const [nearbyBizRadius, setNearbyBizRadius] = useState<number>(() => {
    if (typeof window === "undefined") return 3000;
    const saved = localStorage.getItem("nearbyRadius");
    return saved ? parseInt(saved) : 3000;
  });

  const nearbyWatchIdRef = useRef<number | null>(null);
  const lastFetchedNearbyCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const startNearbyWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (userHasLoc) { setNearbyLat(userLat); setNearbyLng(userLng); setNearbyGeoStatus("ok"); }
      else setNearbyGeoStatus("error");
      return;
    }
    setNearbyGeoStatus((prev) => (prev === "ok" ? prev : "loading"));
    if (nearbyWatchIdRef.current !== null) navigator.geolocation.clearWatch(nearbyWatchIdRef.current);
    nearbyWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setNearbyLat(pos.coords.latitude);
        setNearbyLng(pos.coords.longitude);
        setNearbyGeoStatus("ok");
      },
      (err) => {
        // Si la cuenta ya tenía una ubicación guardada, la usamos como respaldo
        // en vez de dejar la sección vacía por un permiso denegado o un timeout.
        if (userHasLoc) { setNearbyLat(userLat); setNearbyLng(userLng); setNearbyGeoStatus("ok"); }
        else setNearbyGeoStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );
  }, [userHasLoc, userLat, userLng]);

  // Si la cuenta ya tiene la ubicación activada, arrancamos el GPS en vivo
  // apenas carga la página, sin esperar a que el usuario toque el botón.
  useEffect(() => {
    if (userHasLoc && nearbyGeoStatus === "idle") startNearbyWatch();
  }, [userHasLoc, nearbyGeoStatus, startNearbyWatch]);

  useEffect(() => {
    return () => {
      if (nearbyWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(nearbyWatchIdRef.current);
      }
    };
  }, []);

  const requestNearbyLocation = useCallback(() => { startNearbyWatch(); }, [startNearbyWatch]);

  const handleNearbyRadiusChange = (value: number) => {
    setNearbyBizRadius(value);
    localStorage.setItem("nearbyRadius", String(value));
    lastFetchedNearbyCoordsRef.current = null; // forzar refetch con el nuevo radio
  };

  useEffect(() => {
    if (nearbyLat === null || nearbyLng === null) return;
    const last = lastFetchedNearbyCoordsRef.current;
    const moved = !last || haversineMeters(last.lat, last.lng, nearbyLat, nearbyLng) >= NEARBY_FETCH_THRESHOLD_METERS;
    if (!moved) return;
    setNearbyBizLoading(true);
    setNearbyBizError("");
    const effectiveRadius = nearbyBizRadius === 0 ? 999999999 : nearbyBizRadius;
    fetch(`${API}/business/nearby?lat=${nearbyLat}&lng=${nearbyLng}&radius=${effectiveRadius}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: NearbyHomeBusiness[]) => {
        setNearbyBizList(Array.isArray(data) ? data : []);
        lastFetchedNearbyCoordsRef.current = { lat: nearbyLat, lng: nearbyLng };
      })
      .catch(() => setNearbyBizError("No pudimos cargar los negocios cercanos."))
      .finally(() => setNearbyBizLoading(false));
  }, [nearbyLat, nearbyLng, nearbyBizRadius]);

  // Distancia en vivo: recalcula con Haversine en cada tick del GPS sin
  // volver a pegarle al backend. La lista sigue refrescándose por fetch
  // (arriba) para traer negocios nuevos que entraron al radio.
  const liveNearbyBizList = nearbyBizList.map((biz) => {
    if (nearbyGeoStatus !== "ok" || nearbyLat === null || nearbyLng === null || !biz.location?.coordinates) {
      return biz;
    }
    const [bizLng, bizLat] = biz.location.coordinates;
    const distanceMeters = haversineMeters(nearbyLat, nearbyLng, bizLat, bizLng);
    const distanceLabel = distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`;
    return { ...biz, distanceMeters, distanceLabel };
  });

  useEffect(() => { fetch(`${API}/products/public-stats`).then((r) => r.json()).then(setPublicStats).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = buildLocationParams({ limit: "60" });
    fetch(`${API}/products/featured?${params}`).then((r) => r.json()).then(async (data) => {
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
    }).catch(async () => {
      try {
        const r2 = await fetch(`${API}/products/random?${buildLocationParams({ limit: "40" })}`);
        const d2 = await r2.json();
        setAllProducts(d2.products || []);
      } catch { setAllProducts([]); }
    }).finally(() => setLoading(false));
  }, [currentUserId, userHasLoc, userRadius, activeCategory, searchParam]);

  useEffect(() => {
    if (!allProducts.length) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
    if (!token) { setReportedProductIds(new Set()); return; }
    const productIds = allProducts.filter((p) => !p._isFeatured).map((p) => p._id);
    if (!productIds.length) return;
    fetch(`${API}/reports/batch-check`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ productIds }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.reportedIds) setReportedProductIds(new Set(data.reportedIds as string[])); }).catch(() => {});
  }, [allProducts]);

  useEffect(() => { fetch(`${API}/products/featured-businesses`).then((r) => r.json()).then((data) => setFeaturedBusinesses(Array.isArray(data) ? data : [])).catch(() => setFeaturedBusinesses([])); }, []);

  const handleRequestGeo = async () => {
    const Swal = (await import("sweetalert2")).default;
    const r = await Swal.fire({ title: "Activar ubicación", icon: "info", showCancelButton: true, html: "Necesitamos tu ubicación para mostrarte productos <b>cercanos a vos</b>.", confirmButtonText: "Activar", cancelButtonText: "Ahora no", confirmButtonColor: "var(--primary)" });
    if (r.isConfirmed) {
      const ok = await enableLocation();
      Swal.fire(ok ? { icon: "success", title: "¡Ubicación activada!", timer: 2000, showConfirmButton: false } : { icon: "error", title: "No se pudo activar", text: "Verificá los permisos de tu navegador." });
    }
    dismissGeoBanner();
  };

  const handleRequestNotifications = async () => {
    const Swal = (await import("sweetalert2")).default;
    // FIX: mismo caso que arriba - antes de ofrecer la acción, si el navegador
    // no soporta Notification (iOS Safari, in-app browsers) avisamos en vez de
    // dejar que explote al llamar enableNotifications().
    if (typeof Notification === "undefined") {
      Swal.fire({ icon: "info", title: "No disponible", text: "Tu navegador no soporta notificaciones push." });
      dismissNotifBanner();
      return;
    }
    const r = await Swal.fire({ title: "Activar notificaciones", icon: "info", showCancelButton: true, html: "Recibí alertas de <b>ofertas exclusivas</b> de tus negocios favoritos.", confirmButtonText: "Activar", cancelButtonText: "Ahora no", confirmButtonColor: "var(--primary)" });
    if (r.isConfirmed) {
      const ok = await enableNotifications();
      if (!ok) Swal.fire({ icon: "warning", title: "Permisos denegados", text: "Habilitá las notificaciones desde la configuración." });
    }
    dismissNotifBanner();
  };

  const radiusLabel = userRadius === 0 ? "todo el país" : userRadius >= 1000 ? `${userRadius / 1000} km` : `${userRadius} m`;

  // FIX: Turbopack no soportaba el ternario con template string + —, lo separamos
  const categoryName = categories.find((c) => c.slug === activeCategory)?.name || activeCategory;
  const sectionTitle = searchParam
    ? `Resultados para "${searchParam}"`
    : activeCategory
      ? `${categoryName} - Ofertas`
      : userHasLoc
        ? `Ofertas en ${radiusLabel}`
        : "Ofertas del día";

  const heroProducts = allProducts.slice(0, 9);
  const hasFeatured = allProducts.some((p) => p._isFeatured);
  const gridProducts = allProducts.filter((p) => !reportedProductIds.has(p._id));
  const showNotifBanner = !!user && !notifBannerDismissed && !notifAlreadyGranted;

  return (
    <MainLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-tag">Ofertas exclusivas hoy</div>
            <h1>Las mejores<br /><em>ofertas</em> cerca tuyo</h1>
            <p className="hero-desc">Descubrí productos increíbles de negocios verificados. Filtrá por categoría y ubicación.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" style={{ fontSize: "0.95rem", padding: "0.75rem 1.75rem" }} onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}>Ver ofertas</button>
              {!user && <a href="/register" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}>Registrarse gratis</a>}
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span className="hero-stat-num">{publicStats.totalProducts > 0 ? `+${publicStats.totalProducts.toLocaleString()}` : "—"}</span><span className="hero-stat-label">Productos</span></div>
              <div className="hero-stat"><span className="hero-stat-num">{publicStats.totalBusinesses > 0 ? `+${publicStats.totalBusinesses.toLocaleString()}` : "—"}</span><span className="hero-stat-label">Negocios</span></div>
              <div className="hero-stat"><span className="hero-stat-num">98%</span><span className="hero-stat-label">Satisfacción</span></div>
            </div>
          </div>
          {heroProducts.length > 0 && <HeroSlider products={heroProducts} />}
        </div>
      </section>

      <NearbyBusinessesSection
        geoStatus={nearbyGeoStatus}
        businesses={liveNearbyBizList}
        loading={nearbyBizLoading}
        error={nearbyBizError}
        radius={nearbyBizRadius}
        onRadiusChange={handleNearbyRadiusChange}
        onRequestLocation={requestNearbyLocation}
        live={nearbyGeoStatus === "ok"}
      />

      {!user?.locationEnabled && !geoBannerDismissed && (
        <div style={{ padding: "1.5rem 1.5rem 0" }}>
          <div className="geo-banner">
            <span className="geo-banner-icon"><MapPin size={26} strokeWidth={1.75} /></span>
            <div className="geo-banner-text"><h3>¿Querés ver ofertas cerca tuyo?</h3><p>Activá tu ubicación y te mostramos los mejores productos de tu zona.</p></div>
            <div className="geo-banner-actions">
              <button className="btn btn-primary" onClick={handleRequestGeo}>Activar ubicación</button>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={dismissGeoBanner}>✕</button>
            </div>
          </div>
        </div>
      )}

      {showNotifBanner && (
        <div style={{ padding: "1rem 1.5rem 0" }}>
          <div className="geo-banner" style={{ borderColor: "rgba(249,115,22,0.3)" }}>
            <span className="geo-banner-icon"><Bell size={26} strokeWidth={1.75} /></span>
            <div className="geo-banner-text"><h3>Activá las notificaciones</h3><p>Hola {user.name.split(" ")[0]}, no te pierdas ofertas exclusivas de tus favoritos.</p></div>
            <div className="geo-banner-actions">
              <button className="btn btn-primary" onClick={handleRequestNotifications}>Activar</button>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={dismissNotifBanner}>✕</button>
            </div>
          </div>
        </div>
      )}

      <FlashOffersSection products={allProducts} />

      {featuredBusinesses.length > 0 && (<section className="section"><FeaturedBusinessesSlider businesses={featuredBusinesses} /></section>)}

      <section className="section">
        <div className="section-header">
          <div><h2 className="section-title">Categorías</h2><p className="section-subtitle">Explorá por rubro</p></div>
        </div>
        <div className="categories-grid">
          <div className={`category-card ${!activeCategory ? "active" : ""}`} onClick={() => setActiveCategory("")}><Tag size={30} strokeWidth={2.5} /><span className="category-name">Todas</span></div>
          {categories.map((cat) => (<div key={cat.slug} className={`category-card ${activeCategory === cat.slug ? "active" : ""}`} onClick={() => setActiveCategory(cat.slug)}><CategoryIcon name={cat.iconName} size={24} strokeWidth={1.75} /><span className="category-name">{cat.name}</span></div>))}
        </div>
      </section>

      <section className="section" id="offers">
        <div className="section-header">
          <div>
            <h2 className="section-title"><span className="section-title-icon">{hasFeatured ? <Crown size={20} strokeWidth={2} style={{ color: "#f97316" }} /> : userHasLoc ? <MapPin size={20} strokeWidth={2} /> : <TrendingUp size={20} strokeWidth={2} />}</span>{sectionTitle}</h2>
            <p className="section-subtitle">{gridProducts.length} productos{hasFeatured && <span style={{ marginLeft: "0.5rem", color: "#f97316", fontSize: "0.75rem", fontWeight: 600 }}>· incluye destacados</span>}{userHasLoc && !hasFeatured && <span style={{ marginLeft: "0.5rem", color: "#4ade80", fontSize: "0.75rem", fontWeight: 600 }}>· {radiusLabel}</span>}</p>
          </div>
        </div>
        {loading ? (<div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}><Clock size={32} style={{ opacity: 0.4, display: "block", margin: "0 auto 1rem" }} /><p>Cargando ofertas...</p></div>) : gridProducts.length === 0 ? (<div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}><Search size={48} strokeWidth={1} style={{ opacity: 0.3, display: "block", margin: "0 auto 1rem" }} /><h3>No encontramos resultados</h3><p>{userHasLoc ? `No hay productos en ${radiusLabel}. Probá con un radio más amplio.` : "Probá con otra búsqueda o categoría."}</p></div>) : (<div className="products-grid">{gridProducts.map((p, i) => (<ProductCard key={`${p._id}-${i}`} product={p} currentUserId={currentUserId} />))}</div>)}
      </section>

      <div className="banner" style={{ margin: "0 1.5rem" }}>
        <div><h2>¿Tenés un negocio?</h2><p>Publicá tus productos y llegá a miles de clientes cerca tuyo.</p></div>
        <a href="/register" className="btn btn-white">Empezar gratis</a>
      </div>

      <FlashOfferOverlay products={allProducts} />
    </MainLayout>
  );
}

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
  const flashBase = flashBasePrice(product);
  const flashFinalPrice = isFlash ? computeFlashFinalPrice(product) : product.price;

  const handleCart = () => {
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: isFlash ? Number(flashFinalPrice.toFixed(2)) : product.price,
      originalPrice: isFlash ? flashBase : product.originalPrice,
      discount: isFlash ? flashDiscount : product.discount,
      image: product.image,
      businessId: bizId,
      businessName: bizName,
      businessPhone: product.business?.phone || "",
      stock: product.stock || 99,
      isFlashOffer: isFlash,
    } as any);
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

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = shareUrlFor(product._id);
    const shareData = { title: product.name, text: `${product.name} - $${product.price.toLocaleString()}`, url };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share(shareData); } catch {}
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
    <div className="product-card" style={isFlash ? { border: "1.5px solid rgba(250,204,21,0.6)", boxShadow: "0 0 0 1px rgba(250,204,21,0.18), 0 4px 20px rgba(250,204,21,0.15)" } : isFeatured ? { border: "1.5px solid rgba(249,115,22,0.5)", boxShadow: "0 0 0 1px rgba(249,115,22,0.12), 0 4px 20px rgba(249,115,22,0.1)" } : undefined}>
      <div className="product-image-wrap">
        <img src={imgUrl(product.image)} alt={product.name} loading="lazy" />
        {!isFlash && product.discount ? <span className="product-discount-badge">-{product.discount}%</span> : null}
        {isFlash && (<span className="product-flash-badge"><Zap size={10} fill="#111" strokeWidth={0} /> FLASH -{flashDiscount}%</span>)}
        {!isFlash && isFeatured && (<span style={{ position: "absolute", top: 8, left: 8, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 8px rgba(249,115,22,0.5)", zIndex: 2 }}><Crown size={9} /> Destacado</span>)}
        <button className="product-fav-btn product-fav-btn--always" onClick={handleLike}><span style={{ fontSize: "1.05rem", color: liked ? "#ef4444" : "#9ca3af", transition: "color 0.2s" }}>{liked ? "♥" : "♡"}</span></button>
        <button className="product-fav-btn product-fav-btn--always" style={{ right: "2.6rem" }} onClick={handleShare} aria-label="Compartir producto" title="Compartir"><Share2 size={15} style={{ color: justShared ? "#22c55e" : "#9ca3af", transition: "color 0.2s" }} /></button>
        {justShared && (<span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(34,197,94,0.95)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, zIndex: 3 }}>¡Enlace copiado!</span>)}
      </div>
      {isFlash && (<div className="product-flash-strip"><Zap size={10} fill="#f59e0b" strokeWidth={0} /><span>Oferta por tiempo limitado - {formatFlashTime(product.flashOfferSecondsLeft)} restantes</span></div>)}
      {!isFlash && isFeatured && isOutOfRange && (
        <div style={{ background: "linear-gradient(90deg,rgba(249,115,22,0.13),rgba(249,115,22,0.07))", borderBottom: "1px solid rgba(249,115,22,0.2)", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Sparkles size={10} style={{ color: "#f97316", flexShrink: 0 }} /><span style={{ fontSize: "0.65rem", color: "#fdba74", fontWeight: 700, lineHeight: 1.3 }}>No está cerca, pero te lo acercamos</span>
        </div>
      )}
      <div className="product-body">
        {bizId ? (<Link href={`/negocio/${bizId}`} className="product-business" style={{ textDecoration: "none", color: "inherit" }}>{bizName}{bizCity ? ` - ${bizCity}` : ""}{product.business?.verified && <span style={{ color: "#f97316", marginLeft: "0.2rem" }}>✓</span>}</Link>) : (<div className="product-business">{bizName}{bizCity ? ` - ${bizCity}` : ""}</div>)}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
          <StarRow rating={rating} size={13} /><span style={{ fontSize: "0.71rem", color: "#9ca3af", fontWeight: 500 }}>{rating > 0 ? `${rating.toFixed(1)} (${totalRatings})` : "Sin calificación"}</span>
          {followers > 0 && (<span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "0.71rem", color: "#9ca3af" }}><Users size={10} />{followers}</span>)}
        </div>
        <div className="product-name">{product.name}</div>
        <div className="product-prices">
          {isFlash ? (<><span className="product-price product-price--flash">${flashFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className="product-original">${flashBase.toLocaleString()}</span></>) : (<><span className="product-price">${product.price.toLocaleString()}</span>{product.originalPrice && <span className="product-original">${product.originalPrice.toLocaleString()}</span>}</>)}
        </div>
      </div>
      <div className="product-card-footer" style={{ flexDirection: "column", gap: "0.45rem" }}>
        <button className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }} onClick={handleCart}><ShoppingCart size={15} /> Agregar al carrito</button>
        <div style={{ display: "flex", gap: "0.4rem", width: "100%" }}>
          {bizId && (
            <Link href={`/negocio/${bizId}`} className="product-secondary-btn is-flex">
              <Store size={13} /> Visitar negocio
            </Link>
          )}
          <button onClick={handleShare} className={`product-secondary-btn ${bizId ? "" : "is-flex"}`}>
            <Share2 size={13} /> Compartir
          </button>
        </div>
        <ReportModal targetType="product" targetId={product._id} targetName={product.name} token={typeof window !== "undefined" ? localStorage.getItem("marketplace_token") || "" : ""} onRequireAuth={async () => { const Swal = (await import("sweetalert2")).default; Swal.fire({ icon: "info", title: "Iniciá sesión para reportar", timer: 2000, showConfirmButton: false }); }} />
      </div>
    </div>
  );
}

export default function HomeContent() {
  return (
    <Suspense fallback={<MainLayout><div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}><Clock size={32} style={{ opacity: 0.3, display: "block", margin: "0 auto 1rem" }} /><p>Cargando...</p></div></MainLayout>}>
      <HomePageBody />
    </Suspense>
  );
}
