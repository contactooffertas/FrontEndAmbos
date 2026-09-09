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

interface FlashOffer { active: boolean; discount: number; endDate?: string; }
interface Product {
  _id: string; name: string; description?: string; price: number; originalPrice?: number; discount?: number; image?: string; category?: string; stock?: number;
  _outOfRange?: boolean; _isFeatured?: boolean; _featuredSource?: "product" | "business"; cuotaSuscriptor?: boolean; flashOffer?: FlashOffer; flashOfferSecondsLeft?: number;
  business?: { _id: string; name: string; city: string; logo?: string; verified?: boolean; followers?: string[]; rating?: number; totalRatings?: number; phone?: string; featuredPaid?: boolean; cuotaSuscriptor?: boolean; featuredUntil?: string; };
}
interface FeaturedBusiness { _id: string; type: string; endDate: string; business: { _id: string; name: string; city: string; logo?: string; verified?: boolean; rating?: number; totalRatings?: number; totalProducts?: number; description?: string; followers?: string[]; }; }
interface PublicStats { totalProducts: number; totalBusinesses: number; }
interface NearbyHomeBusiness { _id: string; name: string; logo?: string; city?: string; address?: string; rating?: number; totalRatings?: number; verified?: boolean; categories?: string[]; distanceMeters: number; distanceLabel: string; location?: { type: string; coordinates: [number, number] }; }
type NearbyGeoStatus = "idle" | "loading" | "ok" | "denied" | "error";

const HOME_RADIUS_OPTIONS = [
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "Todo Rosario", value: 0 },
];

const NEARBY_FETCH_THRESHOLD_METERS = 100;
const imgUrl = (url?: string) => url || "/assets/offerton.png";
const logoUrl = (name: string, url?: string) => url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&background=f97316&color=fff`;
const shareUrlFor = (productId: string) => `${BACKEND_ORIGIN}/p/${productId}`;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number { const R = 6_371_000; const toRad = (d: number) => (d * Math.PI) / 180; const dLat = toRad(lat2 - lat1); const dLng = toRad(lng2 - lng1); const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
function flashBasePrice(product: Product): number { return product.originalPrice ?? product.price; }
function computeFlashFinalPrice(product: Product): number { const discount = product.flashOffer?.discount ?? 0; return flashBasePrice(product) * (1 - discount / 100); }
function formatFlashTime(seconds?: number): string { if (!seconds || seconds <= 0) return "Terminando"; const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); if (h > 0) return `${h}h ${m}m`; if (m > 0) return `${m}m`; return "< 1m"; }
function formatClockCountdown(seconds?: number): string { const s = Math.max(0, Math.floor(seconds ?? 0)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`; return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`; }

function PartialStar({ fill, size = 14 }: { fill: number; size?: number }) { const id = `ps-${Math.random().toString(36).slice(2, 7)}`; const pct = `${Math.max(0, Math.min(1, fill)) * 100}%`; return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="0"><stop offset={pct} stopColor="#f97316" /><stop offset={pct} stopColor="#e5e7eb" /><stop offset="100%" stopColor="#e5e7eb" /></linearGradient></defs><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={`url(#${id})`} stroke={fill > 0.05 ? "#f97316" : "#d1d5db"} strokeWidth="1.5" strokeLinejoin="round" /></svg>; }
function StarRow({ rating = 0, size = 13 }: { rating?: number; size?: number }) { return <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>{[1, 2, 3, 4, 5].map((s) => <PartialStar key={s} fill={Math.min(1, Math.max(0, rating - (s - 1)))} size={size} />)}</span>; }

function HeroSlider({ products }: { products: Product[] }) {
  const suscriptorProducts = products.filter((p) => p.business?.cuotaSuscriptor === true);
  const usePool = suscriptorProducts.length > 0 ? suscriptorProducts : products;
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => { if (usePool.length <= 3) return; const t = setInterval(() => { setFade(false); setTimeout(() => { setIdx((i) => (i + 3) % usePool.length); setFade(true); }, 350); }, 10_000); return () => clearInterval(t); }, [usePool.length]);
  useEffect(() => { setIdx(0); }, [suscriptorProducts.length]);
  if (!usePool.length) return null;
  const slice = [0, 1, 2].map((offset) => usePool[(idx + offset) % usePool.length]);
  return <div className="hero-visual" style={{ opacity: fade ? 1 : 0, transition: "opacity 0.35s ease" }}>{slice.map((p, i) => { const rating = p.business?.rating ?? 0; const bizId = p.business?._id; const featured = p._isFeatured; return <div key={`${p._id}-${i}`} className="hero-card" style={featured ? { outline: "1.5px solid rgba(249,115,22,0.55)" } : undefined}>{featured && <div style={{ position: "absolute", top: 7, left: 7, zIndex: 2, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.57rem", fontWeight: 800, padding: "2px 6px", borderRadius: 5 }}><Crown size={7} /> Dest.</div>}<img src={imgUrl(p.image)} alt={p.name} onError={(e) => { e.currentTarget.src = "/assets/offerton.png"; }} /><div className="hero-card-body"><p className="hero-card-name">{p.name}</p><div className="hero-card-stars"><StarRow rating={rating} size={11} /><span className="hero-card-rating-text">{rating > 0 ? rating.toFixed(1) : "Sin votos"}</span></div><div className="hero-card-footer"><div className="hero-card-footer-row"><span className="hero-card-price">${p.price.toLocaleString()}</span>{bizId && <Link href={`/negocio/${bizId}`} className="hero-card-visit">Visitar →</Link>}</div></div></div></div>; })}</div>;
}

function NearbyBusinessCard({ biz }: { biz: NearbyHomeBusiness }) { return <Link href={`/negocio/${biz._id}`} className="nearby-home-card"><img src={logoUrl(biz.name, biz.logo)} alt={biz.name} className="nearby-home-card-logo" /><div className="nearby-home-card-info"><div className="nearby-home-card-name-row"><span className="nearby-home-card-name">{biz.name}</span>{biz.verified && <CheckCircle size={12} className="nearby-home-card-verified" />}</div><div className="nearby-home-card-distance"><Navigation size={11} /> {biz.distanceLabel}</div><div className="nearby-home-card-rating"><StarRow rating={biz.rating ?? 0} size={11} /><span className="nearby-home-card-rating-text">{(biz.rating ?? 0) > 0 ? biz.rating!.toFixed(1) : "Sin votos"}</span></div></div><ArrowRight size={16} className="nearby-home-card-arrow" /></Link>; }
function NearbyBusinessesSection({ geoStatus, businesses, loading, error, radius, onRadiusChange, onRequestLocation, live }: { geoStatus: NearbyGeoStatus; businesses: NearbyHomeBusiness[]; loading: boolean; error: string; radius: number; onRadiusChange: (v: number) => void; onRequestLocation: () => void; live?: boolean }) { const radiusLabel = HOME_RADIUS_OPTIONS.find((o) => o.value === radius)?.label || "3 km"; const showPrompt = geoStatus === "idle" || geoStatus === "denied" || geoStatus === "error"; return <section className="section" id="negocios-cerca"><div className="nearby-section-header"><div className="nearby-section-header-text"><h2 className="section-title"><span className="section-title-icon"><Navigation size={20} /></span>Negocios cerca tuyo</h2><p className="section-subtitle">{geoStatus === "ok" ? <>{businesses.length} negocio{businesses.length !== 1 ? "s" : ""} · {radiusLabel}{live && <span style={{ marginLeft: 8, color: "#4ade80", fontSize: "0.7rem", fontWeight: 700 }}>● en vivo</span>}</> : "Descubrí negocios cerca de tu ubicación"}</p></div>{geoStatus === "ok" && <div className="nearby-radius-group">{HOME_RADIUS_OPTIONS.map((opt) => <button key={opt.value} onClick={() => onRadiusChange(opt.value)} className={`nearby-radius-btn ${opt.value === radius ? "active" : ""}`}>{opt.label}</button>)}<button onClick={onRequestLocation} title="Actualizar ubicación" style={{ background: "none", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, padding: "0.35rem 0.55rem", color: "#f97316", cursor: "pointer", display: "flex", alignItems: "center" }}><RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /></button></div>}</div>{showPrompt ? <div className="nearby-prompt"><div className="nearby-prompt-icon"><MapPin size={24} /></div><div><p className="nearby-prompt-title">{geoStatus === "denied" ? "Ubicación bloqueada" : "Descubrí lo que tenés cerca"}</p><p className="nearby-prompt-desc">{geoStatus === "denied" ? "Habilitá el permiso de ubicación desde tu navegador para ver negocios cercanos." : "Activá tu ubicación y te mostramos, con distancia incluida, los negocios más cercanos a vos."}</p></div>{geoStatus !== "denied" && <button className="btn btn-primary nearby-prompt-btn" onClick={onRequestLocation}><Navigation size={15} /> Ver negocios cerca tuyo</button>}</div> : geoStatus === "loading" || loading ? <div className="nearby-home-list">{[...Array(3)].map((_, i) => <div key={i} className="nearby-home-skeleton" />)}</div> : error ? <p className="nearby-error-text">{error}</p> : businesses.length === 0 ? <div className="nearby-empty"><Store size={32} /><p>No encontramos negocios en {radiusLabel}. Probá con un radio más amplio.</p></div> : <div className="nearby-home-list">{businesses.map((biz) => <NearbyBusinessCard key={biz._id} biz={biz} />)}</div>}</section>; }

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
  const [nearbyGeoStatus, setNearbyGeoStatus] = useState<NearbyGeoStatus>("idle");
  const [nearbyLat, setNearbyLat] = useState<number | null>(null);
  const [nearbyLng, setNearbyLng] = useState<number | null>(null);
  const [nearbyBizList, setNearbyBizList] = useState<NearbyHomeBusiness[]>([]);
  const [nearbyBizLoading, setNearbyBizLoading] = useState(false);
  const [nearbyBizError, setNearbyBizError] = useState("");
  const [nearbyBizRadius, setNearbyBizRadius] = useState<number>(() => { if (typeof window === "undefined") return 3000; const saved = localStorage.getItem("nearbyRadius"); return saved ? parseInt(saved) : 3000; });
  const nearbyWatchIdRef = useRef<number | null>(null);
  const lastFetchedNearbyCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentUserId = (user as any)?._id || (user as any)?.id;
  const userLat = (user as any)?.lat; const userLng = (user as any)?.lng; const userHasLoc = !!(user?.locationEnabled && userLat && userLng);
  const [userRadius] = useState<number>(() => { if (typeof window === "undefined") return 3000; const saved = localStorage.getItem("nearbyRadius"); return saved ? parseInt(saved) : 3000; });
  const buildLocationParams = (extra: Record<string, string> = {}): string => { const p = new URLSearchParams(extra); if (userHasLoc) { p.set("lat", userLat.toString()); p.set("lng", userLng.toString()); p.set("userRadius", userRadius.toString()); } if (currentUserId) p.set("userId", currentUserId); return p.toString(); };
  const startNearbyWatch = useCallback(() => { if (typeof navigator === "undefined" || !navigator.geolocation) { setNearbyGeoStatus("error"); return; } setNearbyGeoStatus("loading"); if (nearbyWatchIdRef.current !== null) navigator.geolocation.clearWatch(nearbyWatchIdRef.current); nearbyWatchIdRef.current = navigator.geolocation.watchPosition((pos) => { setNearbyLat(pos.coords.latitude); setNearbyLng(pos.coords.longitude); setNearbyGeoStatus("ok"); }, (err) => setNearbyGeoStatus(err.code === 1 ? "denied" : "error"), { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }); }, []);
  useEffect(() => { if (userHasLoc && nearbyGeoStatus === "idle") startNearbyWatch(); }, [userHasLoc, nearbyGeoStatus, startNearbyWatch]);
  useEffect(() => () => { if (nearbyWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) navigator.geolocation.clearWatch(nearbyWatchIdRef.current); }, []);
  const requestNearbyLocation = useCallback(() => startNearbyWatch(), [startNearbyWatch]);
  const handleNearbyRadiusChange = (value: number) => { setNearbyBizRadius(value); localStorage.setItem("nearbyRadius", String(value)); lastFetchedNearbyCoordsRef.current = null; };
  useEffect(() => { if (nearbyLat === null || nearbyLng === null) return; const effectiveRadius = nearbyBizRadius === 0 ? 30000 : nearbyBizRadius; setNearbyBizLoading(true); fetch(`${API}/business/nearby?lat=${nearbyLat}&lng=${nearbyLng}&radius=${effectiveRadius}`).then((r) => r.json()).then((data) => setNearbyBizList(Array.isArray(data) ? data : [])).catch(() => setNearbyBizError("No pudimos cargar los negocios cercanos.")).finally(() => setNearbyBizLoading(false)); }, [nearbyLat, nearbyLng, nearbyBizRadius]);
  const liveNearbyBizList = nearbyBizList.map((biz) => { if (nearbyGeoStatus !== "ok" || nearbyLat === null || nearbyLng === null || !biz.location?.coordinates) return biz; const [bizLng, bizLat] = biz.location.coordinates; const distanceMeters = haversineMeters(nearbyLat, nearbyLng, bizLat, bizLng); return { ...biz, distanceMeters, distanceLabel: distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km` }; });
  useEffect(() => { setLoading(true); const extra: Record<string, string> = { limit: "60" }; if (activeCategory) extra.category = activeCategory; if (searchParam) extra.search = searchParam; fetch(`${API}/products/random?${buildLocationParams(extra)}`).then((r) => r.json()).then((d) => setAllProducts(d.products || [])).catch(() => setAllProducts([])).finally(() => setLoading(false)); }, [currentUserId, userHasLoc, userRadius, activeCategory, searchParam]);
  const categoryName = categories.find((c) => c.slug === activeCategory)?.name || activeCategory;
  const sectionTitle = searchParam ? `Resultados para "${searchParam}"` : activeCategory ? `${categoryName} - Ofertas` : userHasLoc ? `Ofertas en ${userRadius / 1000} km` : "Ofertas del día";
  const heroProducts = allProducts.slice(0, 9);
  const gridProducts = allProducts.filter((p) => !reportedProductIds.has(p._id));
  return <MainLayout><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style><section className="hero"><div className="hero-inner"><div><h1>Todo Rosario, en un solo lugar</h1><p className="hero-desc">Encontrá negocios, productos y ofertas de Rosario. Descubrí qué tenés cerca y conectate con el comercio local.</p><div className="hero-actions"><button className="btn btn-primary" onClick={() => document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })}>Explorar productos</button>{!user && <a href="/register" className="btn btn-outline" style={{ color: "white" }}>Crear cuenta gratis</a>}</div>{/* Estadísticas futuras: productos, negocios, 98% satisfacción y miles de clientes. Mantener comentado hasta tener volumen real. */}</div>{heroProducts.length > 0 && <HeroSlider products={heroProducts} />}</div></section><NearbyBusinessesSection geoStatus={nearbyGeoStatus} businesses={liveNearbyBizList} loading={nearbyBizLoading} error={nearbyBizError} radius={nearbyBizRadius} onRadiusChange={handleNearbyRadiusChange} onRequestLocation={requestNearbyLocation} live={nearbyGeoStatus === "ok"} /><section className="section"><div className="section-header"><div><h2 className="section-title">Categorías</h2><p className="section-subtitle">Explorá por rubro</p></div></div><div className="categories-grid"><div className={`category-card ${!activeCategory ? "active" : ""}`} onClick={() => setActiveCategory("")}><Tag size={30} /><span className="category-name">Todas</span></div>{categories.map((cat) => <div key={cat.slug} className={`category-card ${activeCategory === cat.slug ? "active" : ""}`} onClick={() => setActiveCategory(cat.slug)}><CategoryIcon name={cat.iconName} size={24} /><span className="category-name">{cat.name}</span></div>)}</div></section><section className="section" id="offers"><div className="section-header"><div><h2 className="section-title"><span className="section-title-icon"><TrendingUp size={20} /></span>{sectionTitle}</h2><p className="section-subtitle">{gridProducts.length} productos</p></div></div>{loading ? <div style={{ textAlign: "center", padding: "3rem" }}><Clock size={32} /><p>Cargando ofertas...</p></div> : <div className="products-grid">{gridProducts.map((p, i) => <ProductCard key={`${p._id}-${i}`} product={p} currentUserId={currentUserId} />)}</div>}</section><div className="banner" style={{ margin: "0 1.5rem" }}><div><h2>¿Tenés un negocio?</h2><p>Publicá tus productos y hacé que más personas de Rosario te encuentren.</p></div><a href="/register" className="btn btn-white">Empezar gratis</a></div></MainLayout>;
}

function ProductCard({ product, currentUserId }: { product: Product; currentUserId?: string }) {
  const { addToCart } = useCart(); const [liked, setLiked] = useState(false); const [justShared, setJustShared] = useState(false); const bizId = product.business?._id; const bizName = product.business?.name; const bizCity = product.business?.city; const followers = product.business?.followers?.length ?? 0; const rating = product.business?.rating ?? 0; const totalRatings = product.business?.totalRatings ?? 0;
  const handleCart = () => addToCart({ _id: product._id, productId: product._id, name: product.name, price: product.price, image: product.image, businessId: bizId, businessName: bizName, businessPhone: product.business?.phone || "", stock: product.stock || 99 } as any);
  const handleLike = async (e: React.MouseEvent) => { e.preventDefault(); if (!currentUserId) return; setLiked((v) => !v); };
  const handleShare = async (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); const url = shareUrlFor(product._id); try { if ((navigator as any).share) await (navigator as any).share({ title: product.name, text: `${product.name} - $${product.price.toLocaleString()}`, url }); else { await navigator.clipboard.writeText(url); setJustShared(true); setTimeout(() => setJustShared(false), 1800); } } catch {} };
  return <article className="product-card"><div className="product-image-wrap"><img src={imgUrl(product.image)} alt={product.name} loading="lazy" onError={(e) => { e.currentTarget.src = "/assets/offerton.png"; }} /><div className="product-image-actions"><button className="product-fav-btn product-fav-btn--always" onClick={handleShare}><Share2 size={16} /></button><button className="product-fav-btn product-fav-btn--always" onClick={handleLike}><span style={{ fontSize: "1.08rem", color: liked ? "#ef4444" : "#6b7280" }}>{liked ? "♥" : "♡"}</span></button></div>{justShared && <span className="product-share-toast">¡Enlace copiado!</span>}</div><div className="product-body"><div className="product-store-row">{bizId ? <Link href={`/negocio/${bizId}`} className="product-business">{bizName}{bizCity ? ` · ${bizCity}` : ""}</Link> : <span className="product-business">{bizName}</span>}</div><div className="product-rating-row"><StarRow rating={rating} size={12} /><span>{rating > 0 ? `${rating.toFixed(1)} (${totalRatings})` : "Sin calificación"}</span>{followers > 0 && <span className="product-followers"><Users size={11} /> {followers}</span>}</div><h3 className="product-name">{product.name}</h3><div className="product-prices"><span className="product-price">${product.price.toLocaleString()}</span></div></div><div className="product-card-footer"><button className="btn btn-primary product-cart-btn" onClick={handleCart}><ShoppingCart size={16} /> Agregar al carrito</button>{bizId && <Link href={`/negocio/${bizId}`} className="product-secondary-btn product-visit-btn"><Store size={14} /> Visitar negocio</Link>}</div></article>;
}

export default function HomeContent() { return <Suspense fallback={<MainLayout><div style={{ padding: "4rem", textAlign: "center" }}><p>Cargando...</p></div></MainLayout>}><HomePageBody /></Suspense>; }
