"use client";

// app/componentes/HomeContent.tsx
// Antes vivía en app/page.tsx. Se movió acá para que app/page.tsx pueda ser
// un server component con metadata + JSON-LD para SEO, sin tocar nada de
// la lógica ni la UI de este archivo.

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "./MainLayout";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import CategoryIcon from "./cateroryicon";
import { useMarketCategories } from "../hooks/useMarketCategories";
import { containsForbiddenContent } from "../lib/contentPolicy";
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
  location?: { type: string; coordinates: [number, number] };
}

type NearbyGeoStatus = "idle" | "loading" | "ok" | "denied" | "error";

const HOME_RADIUS_OPTIONS = [
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "Todo el país", value: 0 },
];

const NEARBY_FETCH_THRESHOLD_METERS = 100;

const imgUrl = (url?: string) =>
  url || "/assets/offerton.png";
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
  // Mostramos hasta 3 productos reales siempre. Los comercios suscriptores
  // tienen prioridad, pero nunca dejamos el carrusel incompleto si hay más productos.
  const usePool = [...products].sort((a, b) =>
    Number(b.business?.cuotaSuscriptor === true) - Number(a.business?.cuotaSuscriptor === true)
  );
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
  }, [products.length]);

  if (!usePool.length) return null;
  const slice = Array.from({ length: Math.min(3, usePool.length) }, (_, offset) => usePool[(idx + offset) % usePool.length]);

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
            <img decoding="async" src={imgUrl(p.image)} alt={p.name} onError={(e) => { e.currentTarget.src = "/assets/offerton.png"; e.currentTarget.classList.add("is-fallback"); e.currentTarget.style.objectFit = "contain"; e.currentTarget.style.padding = "12px"; e.currentTarget.style.background = "#f8fafc"; }} />
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
        <img decoding="async" src={logoUrl(b.name, b.logo)} alt={b.name} loading="lazy" className="biz-card-banner-img" />
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
        <div><h2 className="section-title"><span className="section-title-icon"><Crown size={20} /></span>Negocios destacados</h2><p className="section-subtitle">Comercios que quieren mostrarse primero</p></div>
        {total > SHOW && <div className="featured-biz-slider__controls"><button className="fbs-nav-btn" onClick={() => advance(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button><button className="fbs-nav-btn" onClick={() => advance(1)} aria-label="Siguiente"><ChevronRight size={18} /></button></div>}
      </div>
      <div className="featured-biz-slider__track" style={{ opacity: fade ? 1 : 0 }}>
        {visible.map((b) => <BusinessCard key={b._id} featured={b} />)}
      </div>
      {showDots && <div className="fbs-dots">{businesses.map((b, i) => <button key={b._id} className={`fbs-dot ${i === startIdx ? "active" : ""}`} onClick={() => setStartIdx(i)} aria-label={`Ir a ${i + 1}`} />)}</div>}
      <div className="fbs-ver-todos-bottom"><Link href="/destacados" className="fbs-ver-todos-link">Ver todos <ArrowRight size={14} /></Link></div>
    </div>
  );
}

function FlashOffersSection({ products }: { products: Product[] }) {
  const flashProducts = products.filter((p) => p.flashOffer?.active);
  if (!flashProducts.length) return null;
  return <section className="section flash-section"><div className="flash-section-header"><div><h2 className="section-title flash-section-title"><span className="flash-section-icon"><Zap size={17} fill="#fff" color="#fff" /></span>Ofertas flash</h2><p className="section-subtitle">Precios especiales por tiempo limitado</p></div></div><div className="flash-grid">{flashProducts.map((p) => <FlashCard key={p._id} product={p} />)}</div></section>;
}

function FlashCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [secondsLeft, setSecondsLeft] = useState(product.flashOfferSecondsLeft ?? 0);
  useEffect(() => { const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, []);
  const finalPrice = computeFlashFinalPrice(product);
  return <div className="flash-card"><Link href={product.business?._id ? `/negocio/${product.business._id}` : "#"} className="flash-card-content"><div className="flash-card-img-wrap"><img decoding="async" src={imgUrl(product.image)} alt={product.name} loading="lazy" className="flash-card-img" onError={(e) => { e.currentTarget.src = "/assets/offerton.png"; }} /><span className="flash-card-badge"><Zap size={10} fill="#fff" />-{product.flashOffer?.discount ?? 0}%</span><span className={`flash-card-timer ${secondsLeft <= 300 ? "urgent" : ""}`}><Clock size={10} />{formatClockCountdown(secondsLeft)}</span></div><div className="flash-card-body"><span className="flash-card-biz">{product.business?.name}</span><span className="flash-card-name">{product.name}</span><div className="flash-card-prices"><span className="flash-card-price-final">${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className="flash-card-price-orig">${flashBasePrice(product).toLocaleString()}</span></div></div></Link><div className="flash-card-footer"><button className="flash-card-cart-btn" onClick={() => addToCart({ _id: product._id, productId: product._id, name: product.name, price: finalPrice, image: product.image, businessId: product.business?._id, businessName: product.business?.name, stock: product.stock || 99 } as any)}><ShoppingCart size={14} />Agregar</button></div></div>;
}

function FlashOverlayCard({ product, secondsLeft, onAdd, justAdded }: { product: Product; secondsLeft: number; onAdd: (p: Product) => void; justAdded: boolean }) {
  const finalPrice = computeFlashFinalPrice(product);
  return <div className="flash-overlay-card"><div className="flash-overlay-card-media"><img decoding="async" src={imgUrl(product.image)} alt={product.name} className="flash-overlay-card-img" onError={(e) => { e.currentTarget.src = "/assets/offerton.png"; }} /><span className="flash-overlay-card-badge">-{product.flashOffer?.discount ?? 0}%</span>{justAdded && <span className="flash-overlay-added-toast">✓</span>}</div><div className="flash-overlay-card-body"><span className="flash-overlay-card-biz">{product.business?.name}</span><span className="flash-overlay-card-name">{product.name}</span><span className="flash-overlay-card-timer"><Clock size={10} />{formatClockCountdown(secondsLeft)}</span><div className="flash-overlay-card-prices"><span className="flash-overlay-card-final">${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className="flash-overlay-card-orig">${flashBasePrice(product).toLocaleString()}</span></div></div><button className="flash-overlay-card-btn" onClick={() => onAdd(product)}><ShoppingCart size={13} />Agregar</button></div>;
}

function FlashOfferOverlay({ products }: { products: Product[] }) {
  const pool = products.filter((p) => p.flashOffer?.active);
  const [idx, setIdx] = useState(0);
  const [closed, setClosed] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const { addToCart } = useCart();
  useEffect(() => { const initial: Record<string, number> = {}; pool.forEach((p) => initial[p._id] = p.flashOfferSecondsLeft ?? 0); setCountdowns(initial); }, [products.length]);
  useEffect(() => { const t = setInterval(() => setCountdowns((prev) => { const next = { ...prev }; Object.keys(next).forEach((k) => next[k] = Math.max(0, next[k] - 1)); return next; }), 1000); return () => clearInterval(t); }, []);
  if (!pool.length || closed) return null;
  const safeIdx = idx % pool.length;
  const current = pool[safeIdx];
  const goTo = (d: number) => setIdx((i) => (i + d + pool.length) % pool.length);
  const handleAdd = (p: Product) => { addToCart({ _id: p._id, productId: p._id, name: p.name, price: computeFlashFinalPrice(p), image: p.image, businessId: p.business?._id, businessName: p.business?.name, stock: p.stock || 99 } as any); setJustAddedId(p._id); setTimeout(() => setJustAddedId(null), 1200); };
  return <div className="flash-overlay"><div className="flash-overlay-header"><span className="flash-overlay-title"><Zap size={14} fill="#fff" />Oferta flash</span><button className="flash-overlay-close" onClick={() => setClosed(true)}>✕</button></div><div className="flash-overlay-body">{pool.length > 1 && <button className="flash-overlay-nav-btn" onClick={() => goTo(-1)}><ChevronLeft size={18} /></button>}<div className="flash-overlay-slide"><FlashOverlayCard product={current} secondsLeft={countdowns[current._id] ?? current.flashOfferSecondsLeft ?? 0} onAdd={handleAdd} justAdded={justAddedId === current._id} /></div>{pool.length > 1 && <button className="flash-overlay-nav-btn" onClick={() => goTo(1)}><ChevronRight size={18} /></button>}</div>{pool.length > 1 && <div className="flash-overlay-dots">{pool.map((p, i) => <span key={p._id} className={`flash-overlay-dot ${i === safeIdx ? "active" : ""}`} style={{ width: i === safeIdx ? 20 : 8, height: 8, background: i === safeIdx ? "#fff" : "rgba(255,255,255,0.4)" }} />)}</div>}</div>;
}

function NearbyBusinessCard({ biz }: { biz: NearbyHomeBusiness }) {
  return <Link href={`/negocio/${biz._id}`} className="nearby-home-card"><img decoding="async" src={logoUrl(biz.name, biz.logo)} alt={biz.name} className="nearby-home-card-logo" /><div className="nearby-home-card-info"><div className="nearby-home-card-name-row"><span className="nearby-home-card-name">{biz.name}</span>{biz.verified && <CheckCircle size={12} className="nearby-home-card-verified" />}</div><div className="nearby-home-card-distance"><Navigation size={11} /> {biz.distanceLabel}</div><div className="nearby-home-card-rating"><StarRow rating={biz.rating ?? 0} size={11} /><span className="nearby-home-card-rating-text">{(biz.rating ?? 0) > 0 ? biz.rating!.toFixed(1) : "Sin votos"}</span></div></div><ArrowRight size={16} className="nearby-home-card-arrow" /></Link>;
}

function NearbyBusinessesSection({ geoStatus, businesses, loading, error, radius, onRadiusChange, onRequestLocation, live }: { geoStatus: NearbyGeoStatus; businesses: NearbyHomeBusiness[]; loading: boolean; error: string; radius: number; onRadiusChange: (v: number) => void; onRequestLocation: () => void; live?: boolean }) {
  const PAGE_SIZE = 3;
  const [page, setPage] = useState(1);
  const radiusLabel = HOME_RADIUS_OPTIONS.find((o) => o.value === radius)?.label || "3 km";
  const showPrompt = geoStatus === "idle" || geoStatus === "denied" || geoStatus === "error";
  const totalPages = Math.max(1, Math.ceil(businesses.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleBusinesses = businesses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [radius, businesses.length]);

  const goToPage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  };

  const paginationItems = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
    if (safePage > 3) items.push("ellipsis-left");
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) items.push(p);
    if (safePage < totalPages - 2) items.push("ellipsis-right");
    items.push(totalPages);
    return items;
  })();

  const results = showPrompt ? (
    <div className="nearby-prompt">
      <div className="nearby-prompt-icon"><MapPin size={24} /></div>
      <div>
        <p className="nearby-prompt-title">{geoStatus === "denied" ? "Ubicación bloqueada" : "Descubrí lo que tenés cerca"}</p>
        <p className="nearby-prompt-desc">{geoStatus === "denied" ? "Habilitá el permiso de ubicación desde tu navegador para ver negocios cercanos." : "Activá tu ubicación y te mostramos, con distancia incluida, los negocios más cercanos a vos."}</p>
      </div>
      {geoStatus !== "denied" && <button className="btn btn-primary nearby-prompt-btn" onClick={onRequestLocation}><Navigation size={15} /> Ver negocios cerca tuyo</button>}
    </div>
  ) : geoStatus === "loading" || loading ? (
    <div className="nearby-home-list nearby-home-list--paged">{[...Array(3)].map((_, i) => <div key={i} className="nearby-home-skeleton" />)}</div>
  ) : error ? (
    <p className="nearby-error-text">{error}</p>
  ) : businesses.length === 0 ? (
    <div className="nearby-empty"><Store size={32} strokeWidth={1} className="nearby-empty-icon" /><p>No encontramos negocios en {radiusLabel}. Probá con un radio más amplio.</p></div>
  ) : (
    <>
      <div className="nearby-home-list nearby-home-list--paged" key={`${radius}-${safePage}`}>
        {visibleBusinesses.map((biz) => <NearbyBusinessCard key={biz._id} biz={biz} />)}
      </div>
      {totalPages > 1 && (
        <div className="nearby-pagination" aria-label="Paginación de negocios cercanos">
          <button className="nearby-page-arrow" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} aria-label="Página anterior"><ChevronLeft size={17} /></button>
          <div className="nearby-page-numbers">
            {paginationItems.map((item, index) => typeof item === "number" ? (
              <button key={item} className={`nearby-page-btn ${item === safePage ? "active" : ""}`} onClick={() => goToPage(item)} aria-current={item === safePage ? "page" : undefined}>{item}</button>
            ) : <span key={`${item}-${index}`} className="nearby-page-ellipsis">…</span>)}
          </div>
          <button className="nearby-page-arrow" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} aria-label="Página siguiente"><ChevronRight size={17} /></button>
          <span className="nearby-page-summary">Página {safePage} de {totalPages}</span>
        </div>
      )}
    </>
  );

  return (
    <section className="section" id="negocios-cerca">
      <div className="nearby-section-header">
        <div className="nearby-section-header-text">
          <h2 className="section-title"><span className="section-title-icon"><Navigation size={20} strokeWidth={2} /></span>Negocios cerca tuyo</h2>
          <p className="section-subtitle">{geoStatus === "ok" ? <>{businesses.length} negocio{businesses.length !== 1 ? "s" : ""} - {radiusLabel} a la redonda{live && <span style={{ marginLeft: 8, color: "#4ade80", fontSize: "0.7rem", fontWeight: 700 }}>● en vivo</span>}</> : "Descubrí negocios cerca de tu ubicación, sin entrar a tu perfil"}</p>
        </div>
        {geoStatus === "ok" && (
          <div className="nearby-radius-group">
            {HOME_RADIUS_OPTIONS.map((opt) => <button key={opt.value} onClick={() => onRadiusChange(opt.value)} className={`nearby-radius-btn ${opt.value === radius ? "active" : ""}`}>{opt.label}</button>)}
            <button onClick={onRequestLocation} title="Actualizar ubicación" style={{ background: "none", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, padding: "0.35rem 0.55rem", color: "#f97316", cursor: "pointer", display: "flex", alignItems: "center" }}><RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /></button>
          </div>
        )}
      </div>
      {results}
    </section>
  );
}

const LOCAL_SEARCH_ROOTS: Record<string, string[]> = {
  "ropa-moda": ["calzado","zapatillas","zapatos","botas","sandalias","ropa","remera","camisa","pantalon","jean","pollera","vestido","campera","buzo","gorra","cartera","mochila"],
  electronica: ["electronica","televisor","tv","auriculares","parlante","cargador","camara","radio","microfono","proyector"],
  tecnologia: ["tecnologia","celular","telefono","smartphone","notebook","laptop","computadora","pc","monitor","tablet","teclado","mouse","impresora","router","hardware","software","ssd","memoria ram","procesador","placa de video","consola","joystick"],
  hogar: ["mesa","silla","sillon","mueble","colchon","cama","almohada","cortina","lampara","decoracion","heladera","microondas","termo","mate"],
  deportes: ["pelota","futbol","botines","bicicleta","pesas","gimnasio","running","camiseta","raqueta"],
  alimentos: ["comida","pan","torta","cafe","yerba","frutas","verduras","carne","queso","bebidas"],
  "salud-belleza": ["perfume","maquillaje","crema","shampoo","jabon","belleza","cosmetica","peluqueria"],
  automotriz: ["auto","moto","cubierta","neumatico","bateria","aceite","repuesto","taller"],
  juguetes: ["juguete","muñeca","peluche","rompecabezas","bloques","autito","juego"],
  libros: ["libro","novela","cuento","comic","manga","revista","libreria"],
  mascotas: ["perro","gato","mascota","correa","collar","alimento perro","alimento gato","veterinaria"],
};

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function inferLocalCategory(query: string): string {
  const q = normalizeSearchText(query);
  for (const [category, roots] of Object.entries(LOCAL_SEARCH_ROOTS)) {
    if (roots.some((root) => q.includes(normalizeSearchText(root)))) return category;
  }
  return "";
}

function localSearchSuggestions(query: string, limit = 8) {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const prefixes = ["quiero comprar", "donde comprar", "comprar", "busco", "necesito"];
  const out: { text: string; category?: string }[] = [];
  for (const [category, roots] of Object.entries(LOCAL_SEARCH_ROOTS)) {
    for (const root of roots) {
      const candidates = [root, ...prefixes.map((prefix) => `${prefix} ${root}`)];
      for (const text of candidates) {
        const normalized = normalizeSearchText(text);
        if (normalized.startsWith(q) || normalized.includes(q)) {
          out.push({ text, category });
          if (out.length >= limit) return out;
        }
      }
    }
  }
  return out;
}
function HeroSmartSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<{ text: string; category?: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const local = localSearchSuggestions(q, 8);
    setSuggestions(local);
    setOpen(local.length > 0);

    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), 1800);
    const timer = window.setTimeout(() => {
      fetch(`${API}/search/suggest?q=${encodeURIComponent(q)}&limit=8`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const remote = Array.isArray(data?.suggestions) ? data.suggestions : [];
          const merged = [...local, ...remote].filter(
            (item, index, all) =>
              all.findIndex((other) => other.text.toLowerCase() === item.text.toLowerCase()) === index
          ).slice(0, 8);
          setSuggestions(merged);
          setOpen(merged.length > 0);
        })
        .catch(() => {})
        .finally(() => window.clearTimeout(abortTimer));
    }, 90);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(abortTimer);
      controller.abort();
    };
  }, [value]);
  const submit = (term?: string) => {
    const q = String(term ?? value).trim();
    if (!q) return;
    if (containsForbiddenContent(q)) {
      setValue("");
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setOpen(false);
    router.push(`/?search=${encodeURIComponent(q)}#offers`);
  };

  return (
    <div
      style={{
        position: "relative",
        marginTop: 16,
        width: "min(100%, 620px)",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,.97)",
          border: "2px solid rgba(249,115,22,.9)",
          borderRadius: 16,
          boxShadow: "0 12px 34px rgba(0,0,0,.24)",
          overflow: "hidden",
        }}
      >
        <Search size={20} color="#f97316" style={{ marginLeft: 15, flexShrink: 0 }} />
        <input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);

            if (!nextValue.trim()) {
              setSuggestions([]);
              setOpen(false);
              if (initialValue) router.replace("/", { scroll: false });
              return;
            }

            setOpen(true);
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="¿Qué estás buscando? Ej: dónde comprar zapatillas"
          aria-label="Buscar productos y negocios"
          style={{
            minWidth: 0,
            flex: 1,
            border: 0,
            outline: 0,
            padding: "14px 10px",
            fontSize: 15,
            fontWeight: 650,
            color: "#142033",
            background: "transparent",
          }}
        />
        <button
          type="button"
          onClick={() => submit()}
          style={{
            border: 0,
            alignSelf: "stretch",
            padding: "0 18px",
            background: "#f97316",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 6px)",
            background: "#fff",
            color: "#142033",
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            boxShadow: "0 18px 50px rgba(15,23,42,.22)",
            overflow: "hidden",
            zIndex: 10000,
            pointerEvents: "auto",
          }}
        >
          {suggestions.map((item, index) => (
            <button
              type="button"
              key={`${item.text}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => submit(item.text)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: 0,
                borderBottom: index < suggestions.length - 1 ? "1px solid #f1f5f9" : 0,
                background: "#fff",
                padding: "11px 13px",
                textAlign: "left",
                color: "#1f2937",
                cursor: "pointer",
              }}
            >
              <Search size={14} color="#f97316" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{item.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HomeHero({ showRegister = true, children, searchValue = "" }: { showRegister?: boolean; children?: React.ReactNode; searchValue?: string }) {
  return (<section className="hero"><div className="hero-inner"><div className="hero-copy"><div className="hero-tag">Ofertas exclusivas hoy</div><h1>Las mejores<br /><em>ofertas</em> cerca tuyo</h1><p className="hero-desc">Descubrí productos increíbles de negocios verificados. Filtrá por categoría y ubicación.</p><div className="hero-actions"><button className="btn btn-primary" style={{ fontSize: "0.95rem", padding: "0.75rem 1.75rem" }} onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}>Ver ofertas</button>{showRegister && <a href="/register" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}>Registrarse gratis</a>}</div><HeroSmartSearch initialValue={searchValue} />{/* Estadísticas futuras: productos, negocios y 98% satisfacción. Mantener comentado hasta tener volumen real. */}</div>{children}</div></section>);
}

function HomePageBody() {
  const { user, enableLocation, enableNotifications } = useAuth();
  const { categories } = useMarketCategories();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search") || "";
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [publicHeroProducts, setPublicHeroProducts] = useState<Product[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [publicStats, setPublicStats] = useState<PublicStats>({ totalProducts: 0, totalBusinesses: 0 });
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportedProductIds, setReportedProductIds] = useState<Set<string>>(new Set());
  const [geoBannerDismissed, setGeoBannerDismissed] = useState<boolean>(() => { if (typeof window === "undefined") return false; return localStorage.getItem("geo_banner_dismissed") === "true"; });
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(() => { if (typeof window === "undefined") return false; return localStorage.getItem("notif_banner_dismissed") === "true"; });
  const dismissGeoBanner = () => { localStorage.setItem("geo_banner_dismissed", "true"); setGeoBannerDismissed(true); };
  const dismissNotifBanner = () => { localStorage.setItem("notif_banner_dismissed", "true"); setNotifBannerDismissed(true); };
  const notifAlreadyGranted = typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "granted";
  const currentUserId = (user as any)?._id || (user as any)?.id;
  const userLat = (user as any)?.lat;
  const userLng = (user as any)?.lng;
  const userHasLoc = !!(user?.locationEnabled && userLat && userLng);
  const [userRadius] = useState<number>(() => { if (typeof window === "undefined") return 3000; const saved = localStorage.getItem("nearbyRadius"); return saved ? parseInt(saved) : 3000; });
  const buildLocationParams = (extra: Record<string, string> = {}): string => { const p = new URLSearchParams(extra); if (userHasLoc) { p.set("lat", userLat.toString()); p.set("lng", userLng.toString()); p.set("userRadius", userRadius.toString()); } if (currentUserId) p.set("userId", currentUserId); return p.toString(); };

  const [nearbyGeoStatus, setNearbyGeoStatus] = useState<NearbyGeoStatus>("idle");
  const [nearbyLat, setNearbyLat] = useState<number | null>(null);
  const [nearbyLng, setNearbyLng] = useState<number | null>(null);
  const [nearbyBizList, setNearbyBizList] = useState<NearbyHomeBusiness[]>([]);
  const [nearbyBizLoading, setNearbyBizLoading] = useState(false);
  const [nearbyBizError, setNearbyBizError] = useState("");
  const [nearbyBizRadius, setNearbyBizRadius] = useState<number>(() => { if (typeof window === "undefined") return 3000; const saved = localStorage.getItem("nearbyRadius"); return saved ? parseInt(saved) : 3000; });
  const nearbyWatchIdRef = useRef<number | null>(null);
  const lastFetchedNearbyCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const startNearbyWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { if (userHasLoc) { setNearbyLat(userLat); setNearbyLng(userLng); setNearbyGeoStatus("ok"); } else setNearbyGeoStatus("error"); return; }
    setNearbyGeoStatus((prev) => (prev === "ok" ? prev : "loading"));
    if (nearbyWatchIdRef.current !== null) navigator.geolocation.clearWatch(nearbyWatchIdRef.current);
    nearbyWatchIdRef.current = navigator.geolocation.watchPosition((pos) => { setNearbyLat(pos.coords.latitude); setNearbyLng(pos.coords.longitude); setNearbyGeoStatus("ok"); }, (err) => { if (userHasLoc) { setNearbyLat(userLat); setNearbyLng(userLng); setNearbyGeoStatus("ok"); } else setNearbyGeoStatus(err.code === 1 ? "denied" : "error"); }, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
  }, [userHasLoc, userLat, userLng]);

  useEffect(() => { if (userHasLoc && nearbyGeoStatus === "idle") startNearbyWatch(); }, [userHasLoc, nearbyGeoStatus, startNearbyWatch]);
  useEffect(() => () => { if (nearbyWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) navigator.geolocation.clearWatch(nearbyWatchIdRef.current); }, []);
  const requestNearbyLocation = useCallback(() => { startNearbyWatch(); }, [startNearbyWatch]);
  const handleNearbyRadiusChange = (value: number) => { setNearbyBizRadius(value); localStorage.setItem("nearbyRadius", String(value)); lastFetchedNearbyCoordsRef.current = null; };

  const selectCategory = (slug: string) => {
    // Categoría y búsqueda de texto son modos excluyentes.
    // Al elegir cualquier categoría (incluida "Todas"), limpiamos ?search=.
    if (searchParam) router.replace("/#offers", { scroll: false });
    setActiveCategory(slug);
    setNearbyBizList([]);
    setNearbyBizError("");
    lastFetchedNearbyCoordsRef.current = null;
  };

  useEffect(() => {
    // Una búsqueda nueva siempre parte de "Todas".
    if (searchParam) {
      setActiveCategory("");
      setNearbyBizList([]);
      setNearbyBizError("");
    }
    lastFetchedNearbyCoordsRef.current = null;
  }, [searchParam]);

  useEffect(() => { lastFetchedNearbyCoordsRef.current = null; }, [activeCategory]);

  useEffect(() => {
    if (nearbyLat === null || nearbyLng === null) return;
    const last = lastFetchedNearbyCoordsRef.current;
    const moved = !last || haversineMeters(last.lat, last.lng, nearbyLat, nearbyLng) >= NEARBY_FETCH_THRESHOLD_METERS;
    if (!moved) return;
    setNearbyBizLoading(true); setNearbyBizError("");
    const effectiveRadius = nearbyBizRadius === 0 ? 999999999 : nearbyBizRadius;
    const nearbyParams = new URLSearchParams({
      lat: String(nearbyLat),
      lng: String(nearbyLng),
      radius: String(effectiveRadius),
    });
    if (activeCategory) nearbyParams.set("category", activeCategory);
    if (searchParam) {
      nearbyParams.set("search", searchParam);
      const inferredCategory = inferLocalCategory(searchParam);
      if (inferredCategory) nearbyParams.set("category", inferredCategory);
    }

    fetch(`${API}/business/nearby?${nearbyParams.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: NearbyHomeBusiness[]) => {
        setNearbyBizList(Array.isArray(data) ? data : []);
        lastFetchedNearbyCoordsRef.current = { lat: nearbyLat, lng: nearbyLng };
      })
      .catch(() => setNearbyBizError("No pudimos cargar los negocios cercanos."))
      .finally(() => setNearbyBizLoading(false));
  }, [nearbyLat, nearbyLng, nearbyBizRadius, activeCategory, searchParam]);

  const liveNearbyBizList = nearbyBizList.map((biz) => { if (nearbyGeoStatus !== "ok" || nearbyLat === null || nearbyLng === null || !biz.location?.coordinates) return biz; const [bizLng, bizLat] = biz.location.coordinates; const distanceMeters = haversineMeters(nearbyLat, nearbyLng, bizLat, bizLng); const distanceLabel = distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`; return { ...biz, distanceMeters, distanceLabel }; });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), searchParam ? 5500 : 7000);
    let active = true;
    setLoading(true);

    if (searchParam) {
      const params = new URLSearchParams({ q: searchParam, limit: "60" });
      const searchLat = userHasLoc ? Number(userLat) : nearbyLat;
      const searchLng = userHasLoc ? Number(userLng) : nearbyLng;
      if (searchLat !== null && searchLng !== null && Number.isFinite(searchLat) && Number.isFinite(searchLng)) {
        params.set("lat", String(searchLat));
        params.set("lng", String(searchLng));
        params.set("radius", String(nearbyBizRadius === 0 ? 999999999 : nearbyBizRadius));
      }

      fetch(`${API}/search?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`Search: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          if (!active) return;
          setAllProducts(Array.isArray(data?.products) ? dedupeById(data.products) : []);
          if (Array.isArray(data?.businesses) && data.businesses.length > 0) {
            setNearbyBizList((current) => {
              const merged = [...current, ...data.businesses];
              const seen = new Set<string>();
              return merged.filter((business: NearbyHomeBusiness) => {
                const id = String((business as any)._id || (business as any).id || "");
                if (!id) return true;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
              });
            });
          }
        })
        .catch(async () => {
          if (!active) return;
          const fallbackCategory = inferLocalCategory(searchParam);
          try {
            const fallbackParams = new URLSearchParams({ limit: "40" });
            if (fallbackCategory) fallbackParams.set("category", fallbackCategory);
            else fallbackParams.set("search", searchParam);
            const fallbackResponse = await fetch(`${API}/products?${fallbackParams.toString()}`);
            const fallbackData = fallbackResponse.ok ? await fallbackResponse.json() : null;
            if (active) setAllProducts(Array.isArray(fallbackData?.products) ? dedupeById(fallbackData.products) : []);
          } catch {
            if (active) setAllProducts([]);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
          clearTimeout(timeout);
        });

      return () => {
        active = false;
        clearTimeout(timeout);
        controller.abort();
      };
    }

    const filters: Record<string, string> = {};
    if (activeCategory) filters.category = activeCategory;
    if (searchParam) filters.search = searchParam;
    const readProducts = async (kind: string, limit: string): Promise<Product[]> => {
      const response = await fetch(
        `${API}/products/${kind}?${buildLocationParams({ ...filters, limit })}`,
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error(`Products: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data.products) ? data.products : [];
    };
    // Start both independent reads together. Featured entries win deduplication.
    const featuredRequest = readProducts("featured", "60");
    const randomRequest = readProducts("random", "40");
    const genericRequest = fetch(
      `${API}/products?${buildLocationParams({ ...filters, limit: "50" })}`,
      { signal: controller.signal }
    )
      .then((response) => response.ok ? response.json() : null)
      .then((data) => Array.isArray(data?.products) ? data.products as Product[] : []);

    void Promise.allSettled([featuredRequest, randomRequest, genericRequest]).then(([featuredResult, randomResult, genericResult]) => {
      if (!active) return;
      const featured = featuredResult.status === "fulfilled"
        ? featuredResult.value.filter((p) => !activeCategory || p.category === activeCategory) : [];
      const random = randomResult.status === "fulfilled" ? randomResult.value : [];
      const generic = genericResult.status === "fulfilled" ? genericResult.value : [];
      setAllProducts(dedupeById([...featured, ...random, ...generic]));
      setLoading(false);
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [currentUserId, userHasLoc, userLat, userLng, userRadius, activeCategory, searchParam]);
  useEffect(() => { if (!allProducts.length) return; const token = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null; if (!token) { setReportedProductIds(new Set()); return; } const productIds = allProducts.filter((p) => !p._isFeatured).map((p) => p._id); if (!productIds.length) return; fetch(`${API}/reports/batch-check`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ productIds }) }).then((r) => (r.ok ? r.json() : null)).then((data) => { if (data?.reportedIds) setReportedProductIds(new Set(data.reportedIds as string[])); }).catch(() => {}); }, [allProducts]);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);

    const readList = async (url: string) => {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    void Promise.all([
      readList(`${API}/products/random?limit=12`),
      readList(`${API}/products?limit=24`),
    ]).then(([randomProducts, publicProducts]) => {
      const merged = dedupeById([...randomProducts, ...publicProducts]);
      if (merged.length) setPublicHeroProducts(merged);
    }).finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => { fetch(`${API}/products/featured-businesses`).then((r) => r.json()).then((data) => setFeaturedBusinesses(Array.isArray(data) ? data : [])).catch(() => setFeaturedBusinesses([])); }, []);

  const handleRequestGeo = async () => { const Swal = (await import("sweetalert2")).default; const r = await Swal.fire({ title: "Activar ubicación", icon: "info", showCancelButton: true, html: "Necesitamos tu ubicación para mostrarte productos <b>cercanos a vos</b>.", confirmButtonText: "Activar", cancelButtonText: "Ahora no", confirmButtonColor: "var(--primary)" }); if (r.isConfirmed) { const ok = await enableLocation(); Swal.fire(ok ? { icon: "success", title: "¡Ubicación activada!", timer: 2000, showConfirmButton: false } : { icon: "error", title: "No se pudo activar", text: "Verificá los permisos de tu navegador." }); } dismissGeoBanner(); };
  const handleRequestNotifications = async () => { const Swal = (await import("sweetalert2")).default; if (typeof Notification === "undefined") { Swal.fire({ icon: "info", title: "No disponible", text: "Tu navegador no soporta notificaciones push." }); dismissNotifBanner(); return; } const r = await Swal.fire({ title: "Activar notificaciones", icon: "info", showCancelButton: true, html: "Recibí alertas de <b>ofertas exclusivas</b> de tus negocios favoritos.", confirmButtonText: "Activar", cancelButtonText: "Ahora no", confirmButtonColor: "var(--primary)" }); if (r.isConfirmed) { const ok = await enableNotifications(); if (!ok) Swal.fire({ icon: "warning", title: "Permisos denegados", text: "Habilitá las notificaciones desde la configuración." }); } dismissNotifBanner(); };

  const radiusLabel = userRadius === 0 ? "todo el país" : userRadius >= 1000 ? `${userRadius / 1000} km` : `${userRadius} m`;
  const categoryName = categories.find((c) => c.slug === activeCategory)?.name || activeCategory;
  const sectionTitle = searchParam ? `Resultados para "${searchParam}"` : activeCategory ? `${categoryName} - Ofertas` : userHasLoc ? `Ofertas en ${radiusLabel}` : "Ofertas del día";
  const heroProducts = dedupeById([...allProducts, ...publicHeroProducts]).slice(0, 9);
  const hasFeatured = allProducts.some((p) => p._isFeatured);
  const gridProducts = allProducts.filter((p) => !reportedProductIds.has(p._id));
  const showNotifBanner = !!user && !notifBannerDismissed && !notifAlreadyGranted;

  return <MainLayout><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style><HomeHero showRegister={!user} searchValue={searchParam}>{heroProducts.length > 0 && <HeroSlider products={heroProducts} />}</HomeHero><NearbyBusinessesSection geoStatus={nearbyGeoStatus} businesses={liveNearbyBizList} loading={nearbyBizLoading} error={nearbyBizError} radius={nearbyBizRadius} onRadiusChange={handleNearbyRadiusChange} onRequestLocation={requestNearbyLocation} live={nearbyGeoStatus === "ok"} />{!user?.locationEnabled && !geoBannerDismissed && <div style={{ padding: "1.5rem 1.5rem 0" }}><div className="geo-banner"><span className="geo-banner-icon"><MapPin size={26} /></span><div className="geo-banner-text"><h3>¿Querés ver ofertas cerca tuyo?</h3><p>Activá tu ubicación y te mostramos los mejores productos de tu zona.</p></div><div className="geo-banner-actions"><button className="btn btn-primary" onClick={handleRequestGeo}>Activar ubicación</button><button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)" }} onClick={dismissGeoBanner}>✕</button></div></div></div>}{showNotifBanner && <div style={{ padding: "1rem 1.5rem 0" }}><div className="geo-banner"><span className="geo-banner-icon"><Bell size={26} /></span><div className="geo-banner-text"><h3>Activá las notificaciones</h3><p>Hola {user.name.split(" ")[0]}, no te pierdas ofertas exclusivas de tus favoritos.</p></div><div className="geo-banner-actions"><button className="btn btn-primary" onClick={handleRequestNotifications}>Activar</button><button className="btn btn-ghost" onClick={dismissNotifBanner}>✕</button></div></div></div>}<FlashOffersSection products={allProducts} />{featuredBusinesses.length > 0 && <section className="section"><FeaturedBusinessesSlider businesses={featuredBusinesses} /></section>}<section className="section"><div className="section-header"><div><h2 className="section-title">Categorías</h2><p className="section-subtitle">Explorá por rubro</p></div></div><div className="categories-grid"><div className={`category-card ${!activeCategory ? "active" : ""}`} onClick={() => selectCategory("")}><Tag size={30} /><span className="category-name">Todas</span></div>{categories.map((cat) => <div key={cat.slug} className={`category-card ${activeCategory === cat.slug ? "active" : ""}`} onClick={() => selectCategory(cat.slug)}><CategoryIcon name={cat.iconName} size={24} /><span className="category-name">{cat.name}</span></div>)}</div></section><section className="section" id="offers"><div className="section-header"><div><h2 className="section-title"><span className="section-title-icon">{hasFeatured ? <Crown size={20} style={{ color: "#f97316" }} /> : userHasLoc ? <MapPin size={20} /> : <TrendingUp size={20} />}</span>{sectionTitle}</h2><p className="section-subtitle">{gridProducts.length} productos</p></div></div>{loading ? <div style={{ textAlign: "center", padding: "3rem" }}><Clock size={32} /><p>Cargando ofertas...</p></div> : gridProducts.length === 0 ? <div style={{ textAlign: "center", padding: "3rem" }}><Search size={48} /><h3>No encontramos resultados</h3></div> : <div className="products-grid">{gridProducts.map((p, i) => <ProductCard key={`${p._id}-${i}`} product={p} currentUserId={currentUserId} />)}</div>}</section><div className="banner" style={{ margin: "0 1.5rem" }}><div><h2>¿Tenés un negocio?</h2><p>Publicá tus productos y hacé que más personas de Rosario te encuentren.</p></div><a href="/register" className="btn btn-white">Empezar gratis</a></div><FlashOfferOverlay products={allProducts} /></MainLayout>;
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

  const handleCart = () => addToCart({ _id: product._id, productId: product._id, name: product.name, price: isFlash ? Number(flashFinalPrice.toFixed(2)) : product.price, originalPrice: isFlash ? flashBase : product.originalPrice, discount: isFlash ? flashDiscount : product.discount, image: product.image, businessId: bizId, businessName: bizName, businessPhone: product.business?.phone || "", stock: product.stock || 99, isFlashOffer: isFlash } as any);
  const handleLike = async (e: React.MouseEvent) => { e.preventDefault(); if (!currentUserId) { const Swal = (await import("sweetalert2")).default; Swal.fire({ icon: "info", title: "Iniciá sesión", timer: 2000, showConfirmButton: false }); return; } setLiked((v) => !v); };
  const handleShare = async (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); const url = shareUrlFor(product._id); const shareData = { title: product.name, text: `${product.name} - $${product.price.toLocaleString()}`, url }; if (typeof navigator !== "undefined" && (navigator as any).share) { try { await (navigator as any).share(shareData); } catch {} return; } try { await navigator.clipboard.writeText(url); setJustShared(true); setTimeout(() => setJustShared(false), 1800); } catch { const Swal = (await import("sweetalert2")).default; Swal.fire({ icon: "info", title: "Enlace para compartir", text: url }); } };

  return (
    <article className={`product-card ${isFeatured ? "product-card--featured" : ""} ${isFlash ? "product-card--flash" : ""}`}>
      <div className="product-image-wrap">
        <img decoding="async" src={imgUrl(product.image)} alt={product.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.src = "/assets/offerton.png"; e.currentTarget.classList.add("is-fallback"); e.currentTarget.style.objectFit = "contain"; e.currentTarget.style.padding = "12px"; e.currentTarget.style.background = "#f8fafc"; }} />
        {!isFlash && product.discount ? <span className="product-discount-badge">-{product.discount}%</span> : null}
        {isFlash && <span className="product-flash-badge"><Zap size={10} fill="#111" strokeWidth={0} /> FLASH -{flashDiscount}%</span>}
        {!isFlash && isFeatured && <span className="product-featured-badge"><Crown size={10} /> Destacado</span>}
        <div className="product-image-actions">
          <button className="product-fav-btn product-fav-btn--always" onClick={handleShare} aria-label="Compartir producto" title="Compartir"><Share2 size={16} style={{ color: justShared ? "#22c55e" : "#6b7280" }} /></button>
          <button className="product-fav-btn product-fav-btn--always" onClick={handleLike} aria-label="Guardar producto" title="Guardar"><span style={{ fontSize: "1.08rem", color: liked ? "#ef4444" : "#6b7280" }}>{liked ? "♥" : "♡"}</span></button>
        </div>
        {justShared && <span className="product-share-toast">¡Enlace copiado!</span>}
      </div>

      {isFlash && <div className="product-flash-strip"><Zap size={10} fill="#f59e0b" strokeWidth={0} /><span>Oferta por tiempo limitado · {formatFlashTime(product.flashOfferSecondsLeft)}</span></div>}
      {!isFlash && isFeatured && isOutOfRange && <div className="product-out-range"><Sparkles size={11} /><span>No está cerca, pero te lo acercamos</span></div>}

      <div className="product-body">
        <div className="product-store-row">
          {bizId ? <Link href={`/negocio/${bizId}`} className="product-business">{bizName}{bizCity ? ` · ${bizCity}` : ""}{product.business?.verified && <CheckCircle size={12} />}</Link> : <span className="product-business">{bizName}{bizCity ? ` · ${bizCity}` : ""}</span>}
        </div>

        <div className="product-rating-row">
          <StarRow rating={rating} size={12} />
          <span>{rating > 0 ? `${rating.toFixed(1)} (${totalRatings})` : "Sin calificación"}</span>
          {followers > 0 && <span className="product-followers"><Users size={11} /> {followers}</span>}
        </div>

        <h3 className="product-name">{product.name}</h3>
        <div className="product-prices">
          {isFlash ? <><span className="product-price product-price--flash">${flashFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span className="product-original">${flashBase.toLocaleString()}</span></> : <><span className="product-price">${product.price.toLocaleString()}</span>{product.originalPrice && <span className="product-original">${product.originalPrice.toLocaleString()}</span>}</>}
        </div>
      </div>

      <div className="product-card-footer">
        <button className="btn btn-primary product-cart-btn" onClick={handleCart}><ShoppingCart size={16} /> Agregar al carrito</button>
        {bizId && <Link href={`/negocio/${bizId}`} className="product-secondary-btn product-visit-btn"><Store size={14} /> Visitar negocio</Link>}
        <div className="product-report-row"><ReportModal targetType="product" targetId={product._id} targetName={product.name} token={typeof window !== "undefined" ? localStorage.getItem("marketplace_token") || "" : ""} onRequireAuth={async () => { const Swal = (await import("sweetalert2")).default; Swal.fire({ icon: "info", title: "Iniciá sesión para reportar", timer: 2000, showConfirmButton: false }); }} /></div>
      </div>
    </article>
  );
}

export default function HomeContent() {
  return <Suspense fallback={<MainLayout><HomeHero /></MainLayout>}><HomePageBody /></Suspense>;
}
