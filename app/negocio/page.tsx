"use client";
// app/negocio/[id]/page.tsx

import { useAuth } from "../context/authContext";
import { useEffect, useState } from "react";
import MainLayout from "../componentes/MainLayout";
import "../styles/negocio.css";
import "../styles/negocio-products.css";
import { useRouter, useParams } from "next/navigation";

import {
  MapPin, Package, Star, CheckCircle, Edit, Save,
  Camera, Plus, Pencil, Trash2, ShoppingBag, X,
  ArrowRight, LayoutList, UserPlus, MessageCircle,
  Heart, Users, Phone, TrendingUp, Cpu, Shirt,
  UtensilsCrossed, Home, Dumbbell, Sparkles,
  PawPrint, Gamepad2, Navigation, AlertTriangle, Lock,
  Send, RefreshCw, Clock, ShieldAlert, ShieldCheck,
} from "lucide-react";

import {
  getMyProducts, createProduct, updateProduct,
  deleteProduct, CATEGORIES, type Product,
} from "../lib/productService";
import ProductModal from "../componentes/ProductModal";
import LocationPicker from "../componentes/localtionPicker";
import LocationPermissionModal from "../componentes/locationPermisoModal";
import BusinessAppealModal from "../componentes/Businessappealmodal";
import { useUserLocation } from "../hooks/Useuserlocation";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";

const BUSINESS_CATEGORIES = [
  { slug: "tecnologia", name: "Tecnologia", Icon: Cpu },
  { slug: "ropa",       name: "Ropa",       Icon: Shirt },
  { slug: "alimentos",  name: "Alimentos",  Icon: UtensilsCrossed },
  { slug: "hogar",      name: "Hogar",      Icon: Home },
  { slug: "deportes",   name: "Deportes",   Icon: Dumbbell },
  { slug: "belleza",    name: "Belleza",    Icon: Sparkles },
  { slug: "mascotas",   name: "Mascotas",   Icon: PawPrint },
  { slug: "juguetes",   name: "Juguetes",   Icon: Gamepad2 },
];

interface Business {
  _id?: string; name: string; description: string; city: string; phone: string;
  logo?: string; logoPublicId?: string; rating?: number; totalRatings?: number;
  totalProducts?: number; verified?: boolean; owner?: string; followers?: string[];
  categories?: string[]; location?: { type: string; coordinates: [number, number] }; address?: string;
  // ── Bloqueo de negocio ──
  blocked?: boolean;
  blockedReason?: string;
  appealStatus?: "none" | "pending" | "reviewed" | "rejected";
  appealNote?: string;
}

interface SocialStatus {
  following: boolean; saved: boolean; myRating: number;
  followersCount: number; rating: number; totalRatings: number;
}

interface ProductWithBlock extends Product {
  blocked?: boolean;
  blockedReason?: string;
  blockType?: "temp" | "permanent" | null;
  underReview?: boolean;
  reviewNote?: string;
  reviewedAt?: string;
}

const negocioVacio: Business = {
  name: "", description: "", city: "", phone: "",
  logo: "/assets/offerton.png", rating: 0, totalProducts: 0,
  verified: false, followers: [], categories: [], address: "",
};

// ─── Helpers visuales ─────────────────────────────────────────────────────────
function ProductPrice({ price, discount }: { price: number; discount?: number }) {
  if (!discount || discount === 0)
    return <span className="ng-price">${price.toLocaleString()}</span>;
  const final = (price * (1 - discount / 100)).toFixed(2);
  return (
    <div className="ng-price-wrap">
      <span className="ng-price-final">${Number(final).toLocaleString()}</span>
      <span className="ng-price-original">${price.toLocaleString()}</span>
    </div>
  );
}

function getRankInfo(rating: number, total: number) {
  if (total < 3)     return { label: "Nueva tienda",      color: "#6b7280", bg: "#f3f4f6" };
  if (rating >= 4.5) return { label: "Top vendedor",     color: "#92400e", bg: "#fef3c7" };
  if (rating >= 4.0) return { label: "Muy valorado",     color: "#065f46", bg: "#d1fae5" };
  if (rating >= 3.0) return { label: "Buena reputacion", color: "#1e40af", bg: "#dbeafe" };
  return { label: "En desarrollo", color: "#6b7280", bg: "#f3f4f6" };
}

function CategorySelector({ selected, onChange }: { selected: string[]; onChange: (cats: string[]) => void }) {
  const toggle = (slug: string) => {
    if (selected.includes(slug)) onChange(selected.filter(s => s !== slug));
    else if (selected.length < 2) onChange([...selected, slug]);
  };
  return (
    <div>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
        Categorias del negocio <span style={{ fontWeight: 400, marginLeft: 4 }}>({selected.length}/2)</span>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        {BUSINESS_CATEGORIES.map(({ slug, name, Icon }) => {
          const active   = selected.includes(slug);
          const disabled = !active && selected.length >= 2;
          return (
            <button key={slug} type="button" onClick={() => toggle(slug)} disabled={disabled}
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                padding: "0.38rem 0.85rem", borderRadius: 20,
                border: `1.5px solid ${active ? "#f97316" : disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)"}`,
                background: active ? "rgba(249,115,22,0.25)" : disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                color: active ? "#fdba74" : disabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
                fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
              }}><Icon size={13} />{name}</button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryBadges({ categories }: { categories?: string[] }) {
  if (!categories?.length) return null;
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
      {categories.map(slug => {
        const cat = BUSINESS_CATEGORIES.find(c => c.slug === slug);
        if (!cat) return null;
        return (
          <span key={slug} style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(249,115,22,0.2)", color: "#fdba74",
            border: "1px solid rgba(249,115,22,0.35)", borderRadius: 20,
            padding: "0.25rem 0.7rem", fontSize: "0.75rem", fontWeight: 600,
          }}><cat.Icon size={11} />{cat.name}</span>
        );
      })}
    </div>
  );
}

function PartialStar({ fill, size = 16 }: { fill: number; size?: number }) {
  const id  = `ps-${Math.random().toString(36).slice(2, 8)}`;
  const pct = `${Math.max(0, Math.min(1, fill)) * 100}%`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={pct} stopColor="#f97316" />
          <stop offset={pct} stopColor="#e5e7eb" /><stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={`url(#${id})`} stroke={fill > 0 ? "#f97316" : "#d1d5db"} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function StarRating({ current, total, myRating, onRate, readonly = false }: {
  current: number; total: number; myRating: number; onRate?: (n: number) => void; readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map(s => {
          if (readonly) return <PartialStar key={s} fill={Math.min(1, Math.max(0, current - (s - 1)))} size={16} />;
          const active = (hovered || myRating) >= s;
          return (
            <Star key={s} size={16} style={{ cursor: "pointer", flexShrink: 0 }}
              fill={active ? "#f97316" : "none"} stroke={active ? "#f97316" : "#d1d5db"}
              onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
              onClick={() => onRate?.(s)} />
          );
        })}
      </div>
      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>
        {!readonly && myRating ? `Tu voto: ${myRating}* - ` : ""}
        {current.toFixed(1)} ({total} {total === 1 ? "voto" : "votos"})
      </span>
    </div>
  );
}

function OwnerStars({ rating, total }: { rating: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <PartialStar key={s} fill={Math.min(1, Math.max(0, rating - (s - 1)))} size={15} />
      ))}
      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginLeft: 2 }}>
        {rating.toFixed(1)} ({total})
      </span>
    </div>
  );
}

function VisitorPanel({ business, social, onFollow, onLike, onContact }: {
  business: Business; social: SocialStatus;
  onFollow: () => void; onLike: () => void; onContact: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      <button onClick={onFollow} style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.55rem 1.1rem", borderRadius: "10px",
        border: `1.5px solid ${social.following ? "#f97316" : "rgba(255,255,255,0.3)"}`,
        background: social.following ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.1)",
        color: social.following ? "#fdba74" : "rgba(255,255,255,0.85)",
        fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
      }}><UserPlus size={15} />{social.following ? "Siguiendo" : "Seguir negocio"}</button>
      <button onClick={onLike} style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.55rem 1.1rem", borderRadius: "10px",
        border: `1.5px solid ${social.saved ? "#ef4444" : "rgba(255,255,255,0.3)"}`,
        background: social.saved ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.1)",
        color: social.saved ? "#fca5a5" : "rgba(255,255,255,0.85)",
        fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
      }}><Heart size={15} fill={social.saved ? "#fca5a5" : "none"} />{social.saved ? "Guardado" : "Favorito"}</button>
      <button onClick={onContact} style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.55rem 1.25rem", borderRadius: "10px", border: "none",
        background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
        fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
        boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
      }}><MessageCircle size={15} /> Contactar</button>
    </div>
  );
}

// ─── Banner de producto bloqueado ─────────────────────────────────────────────
function BlockedProductBanner({ reason, blockType }: { reason?: string; blockType?: "temp" | "permanent" | null }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(15, 10, 5, 0.85)", backdropFilter: "blur(3px)",
      borderRadius: "inherit", padding: "0.75rem", gap: "0.45rem", textAlign: "center",
    }}>
      <div style={{
        background: blockType === "permanent" ? "rgba(127,29,29,0.4)" : "rgba(239,68,68,0.2)",
        border: `1.5px solid ${blockType === "permanent" ? "rgba(239,68,68,0.7)" : "rgba(239,68,68,0.5)"}`,
        borderRadius: "50%", width: 42, height: 42,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Lock size={20} style={{ color: "#f87171" }} />
      </div>
      <p style={{ margin: 0, fontWeight: 800, fontSize: "0.8rem", color: "#fca5a5", lineHeight: 1.3 }}>
        {blockType === "permanent" ? "Bloqueado permanentemente" : "Producto bloqueado"}
      </p>
      <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(252,165,165,0.75)", lineHeight: 1.4, maxWidth: 160 }}>
        {reason || "Bloqueado temporalmente para revision."}
      </p>
    </div>
  );
}

// ─── Modal para enviar producto a re-revision ─────────────────────────────────
function ReviewSubmitModal({
  product, token, onClose, onSuccess,
}: {
  product: ProductWithBlock; token: string;
  onClose: () => void; onSuccess: (updated: ProductWithBlock) => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/products/${product._id}/submit-review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      onSuccess(data.product);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div style={{ background: "#1c1210", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 16, padding: "1.5rem", maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, color: "#fca5a5", fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={16} /> Enviar a revision
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {product.image && <img src={product.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(239,68,68,0.3)" }} />}
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#fca5a5", fontSize: "0.88rem" }}>{product.name}</p>
              <p style={{ margin: 0, fontSize: "0.73rem", color: "rgba(252,165,165,0.6)" }}>Motivo: {product.blockedReason || "Sin especificar"}</p>
            </div>
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
            Mensaje para el equipo (opcional)
          </label>
          <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Explicá por qué tu producto no viola las políticas..." rows={4} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", padding: "0.65rem 0.85rem", fontSize: "0.83rem", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </div>
        {error && <p style={{ margin: 0, fontSize: "0.78rem", color: "#f87171", fontWeight: 600, background: "rgba(239,68,68,0.1)", padding: "0.5rem 0.75rem", borderRadius: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.5rem 1.1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "0.83rem", cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", background: saving ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: "0.83rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Send size={13} />{saving ? "Enviando..." : "Enviar a revision"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function NegocioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const bizIdParam = params?.id as string | undefined;

  const [business, setBusiness]               = useState<Business>(negocioVacio);
  const [editing, setEditing]                 = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [token, setToken]                     = useState<string | null | undefined>(undefined);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview]         = useState<string | null>(null);
  const [isOwner, setIsOwner]                 = useState(false);
  const [products, setProducts]               = useState<ProductWithBlock[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [modalOpen, setModalOpen]             = useState(false);
  const [editTarget, setEditTarget]           = useState<Product | null>(null);
  const [productSaving, setProductSaving]     = useState(false);
  const [locationError, setLocationError]     = useState("");
  const [reviewModal, setReviewModal]         = useState<ProductWithBlock | null>(null);

  // ── Apelación del negocio ──────────────────────────────────────────────────
  const [appealModalOpen, setAppealModalOpen] = useState(false);

  const [bizLocation, setBizLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const { coords: userCoords, city: userCity, requestLocation } = useUserLocation({
    lat: (user as any)?.lat, lng: (user as any)?.lng, locationEnabled: (user as any)?.locationEnabled,
  });
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [social, setSocial] = useState<SocialStatus>({
    following: false, saved: false, myRating: 0, followersCount: 0, rating: 0, totalRatings: 0,
  });
  const [unreadChats, setUnreadChats]   = useState(0);
  const [latestConvId, setLatestConvId] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("marketplace_token"));
    if (!(user as any)?.lat) requestLocation().catch(() => {});
  }, []);

  useEffect(() => {
    if (token === undefined) return;
    if (!bizIdParam && !token) return;
    const fetchBusiness = async () => {
      try {
        if (bizIdParam) {
          const res = await fetch(`${API}/business/${bizIdParam}`);
          if (res.ok) {
            const data = await res.json();
            setBusiness(data);
            setSelectedCategories(data.categories || []);
            const userId = (user as any)?._id || (user as any)?.id;
            setIsOwner(data.owner === userId || data.owner?._id === userId);
            if (data.location?.coordinates?.length)
              setBizLocation({ lat: data.location.coordinates[1], lng: data.location.coordinates[0], address: data.address || "" });
          }
        } else {
          setIsOwner(true);
          const res = await fetch(`${API}/business/my-business`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setBusiness(data);
            setSelectedCategories(data.categories || []);
            if (data.location?.coordinates?.length)
              setBizLocation({ lat: data.location.coordinates[1], lng: data.location.coordinates[0], address: data.address || "" });
          } else if (res.status === 404) {
            setBusiness(negocioVacio); setSelectedCategories([]); setEditing(true);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchBusiness();
  }, [token, bizIdParam, user]);

  useEffect(() => {
    if (!bizIdParam || !token) return;
    fetch(`${API}/business/${bizIdParam}/social`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setSocial(d); }).catch(console.error);
  }, [bizIdParam, token]);

  useEffect(() => {
    if (token === undefined) return;
    if (!bizIdParam && !token) return;
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        if (bizIdParam) {
          const res = await fetch(`${API}/products?businessId=${bizIdParam}&limit=20`);
          const data = await res.json();
          setProducts(data.products || []);
        } else {
          setProducts(await getMyProducts() as ProductWithBlock[]);
        }
      } catch { setProducts([]); }
      finally { setProductsLoading(false); }
    };
    fetchProducts();
  }, [token, bizIdParam]);

  useEffect(() => {
    if (!token || !isOwner) return;
    const checkChats = async () => {
      try {
        const res = await fetch(`${API}/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data: any[] = await res.json();
        const unread = data.filter((c: any) => (c.unreadCount ?? c.unread ?? 0) > 0);
        setUnreadChats(unread.length);
        if (unread.length > 0) setLatestConvId(unread[0]._id);
      } catch {}
    };
    checkChats();
    const interval = setInterval(checkChats, 15000);
    return () => clearInterval(interval);
  }, [token, isOwner]);

  const handleStartEditing = () => {
    if (!userCoords && !bizLocation) { setShowLocationModal(true); return; }
    setEditing(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!token) return;
    setLocationError("");
    if (!business.phone.trim()) { showToast("error", "El numero de celular es obligatorio."); return; }
    if (!bizLocation?.lat || !bizLocation?.lng) { setLocationError("La ubicacion del negocio es obligatoria."); return; }
    try {
      setSaving(true);
      const esNuevo = !business._id;
      const fd = new FormData();
      fd.append("name", business.name);
      fd.append("description", business.description);
      fd.append("city", business.city);
      fd.append("phone", business.phone.trim());
      fd.append("categories", JSON.stringify(selectedCategories));
      fd.append("lat", bizLocation.lat.toString());
      fd.append("lng", bizLocation.lng.toString());
      fd.append("address", bizLocation.address);
      if (selectedFile) fd.append("logo", selectedFile);
      const res = await fetch(`${API}/business`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando");
      setBusiness(data); setSelectedCategories(data.categories || []);
      setEditing(false); setSelectedFile(null); setLogoPreview(null);
      showToast("success", esNuevo ? "Negocio creado!" : "Negocio actualizado!");
    } catch (error: any) { showToast("error", error.message || "Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setEditing(false); setSelectedFile(null); setLogoPreview(null); setLocationError("");
    setSelectedCategories(business.categories || []);
    if (business.location?.coordinates?.length)
      setBizLocation({ lat: business.location.coordinates[1], lng: business.location.coordinates[0], address: business.address || "" });
  };

  const requireAuth = async () => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon: "info", title: "Iniciá sesion", text: "Necesitas una cuenta para hacer esto.", timer: 2000, showConfirmButton: false });
  };

  const handleFollow = async () => {
    if (!token) { requireAuth(); return; }
    const isFollowing = social.following;
    const res = await fetch(`${API}/business/${bizIdParam}/${isFollowing ? "unfollow" : "follow"}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setSocial(prev => ({ ...prev, following: !isFollowing, followersCount: data.followersCount }));
      showToast("success", !isFollowing ? `Siguiendo a ${business.name}` : "Dejaste de seguir");
    }
  };

  const handleLike = async () => {
    if (!token) { requireAuth(); return; }
    const isSaved = social.saved;
    const res = await fetch(`${API}/business/${bizIdParam}/${isSaved ? "unfavorite" : "favorite"}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { setSocial(prev => ({ ...prev, saved: !isSaved })); showToast("success", !isSaved ? "Guardado en favoritos" : "Quitado de favoritos"); }
  };

  const handleRate = async (rating: number) => {
    if (!token) { requireAuth(); return; }
    const res = await fetch(`${API}/business/${bizIdParam}/rate`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
    if (res.ok) {
      const data = await res.json();
      setSocial(prev => ({ ...prev, myRating: rating, rating: data.rating, totalRatings: data.totalRatings }));
      showToast("success", `Votaste con ${rating} estrellas`);
    }
  };

  const handleContact = async () => {
    if (!token) { requireAuth(); return; }
    try {
      const convRes = await fetch(`${API}/chat/start`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: typeof business?.owner === "object" ? (business.owner as any)?._id : business?.owner }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json();
      router.push(`/chatpage?conversationId=${conv._id}`);
    } catch { showToast("error", "No se pudo abrir el chat."); }
  };

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (p: Product) => { setEditTarget(p); setModalOpen(true); };

  const handleProductSubmit = async (formData: FormData) => {
    try {
      setProductSaving(true);
      if (editTarget) {
        const updated = await updateProduct(editTarget._id, formData);
        setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
      } else {
        const created = await createProduct(formData);
        setProducts(prev => [created, ...prev]);
      }
      setModalOpen(false);
      showToast("success", editTarget ? "Producto actualizado" : "Producto agregado!");
    } catch (e: any) { showToast("error", e.message || "Error al guardar"); }
    finally { setProductSaving(false); }
  };

  const handleDeleteProduct = async (p: Product) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      title: "Eliminar producto?", text: `"${p.name}" sera eliminado permanentemente.`,
      icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar", confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    try {
      await deleteProduct(p._id);
      setProducts(prev => prev.filter(x => x._id !== p._id));
      showToast("success", "Producto eliminado");
    } catch (e: any) { showToast("error", e.message || "Error al eliminar"); }
  };

  const handleReviewSuccess = (updated: ProductWithBlock) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
    setReviewModal(null);
    showToast("success", "Producto enviado a revision.");
  };

  // ── Handler: apelación del negocio ──────────────────────────────────────────
  const handleAppealSuccess = (updated: { appealStatus: string; appealNote: string }) => {
    setBusiness(prev => ({
      ...prev,
      appealStatus: updated.appealStatus as any,
      appealNote:   updated.appealNote,
    }));
    setAppealModalOpen(false);
    showToast("success", "Apelación enviada. El equipo la revisará pronto.");
  };

  const showToast = async (icon: "success" | "error", title: string) => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({ icon, title, timer: 1800, showConfirmButton: false, toast: true, position: "top-end" });
  };

  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label ?? value;

  const currentLogo    = logoPreview || business.logo || "/assets/offerton.png";
  const followersCount = isOwner ? (business.followers?.length ?? 0) : social.followersCount;
  const displayRating  = isOwner ? (business.rating ?? 0) : social.rating;
  const displayTotal   = isOwner ? (business.totalRatings ?? 0) : social.totalRatings;
  const rankInfo       = getRankInfo(displayRating, displayTotal);
  const hasLocation    = !!(business.location?.coordinates?.length);
  const blockedCount   = products.filter(p => p.blocked).length;
  const underReviewCount = products.filter(p => p.underReview).length;

  // ── Estados de bloqueo del negocio ──────────────────────────────────────────
  const isBusinessBlocked = !!business.blocked;
  const appealStatus      = business.appealStatus || "none";
  const appealPending     = appealStatus === "pending";
  const canAppeal         = isBusinessBlocked && appealStatus !== "pending";

  if (loading) {
    return (
      <MainLayout>
        <div className="negocio-loading-full">
          <div className="negocio-spinner" />
          <p>Cargando negocio...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <LocationPermissionModal open={showLocationModal} onAllow={() => { setShowLocationModal(false); setEditing(true); }} businessName={business.name || undefined} />

      {/* Modal re-revision producto */}
      {reviewModal && token && (
        <ReviewSubmitModal product={reviewModal} token={token} onClose={() => setReviewModal(null)} onSuccess={handleReviewSuccess} />
      )}

      {/* ── Modal de apelación del negocio ──────────────────────────────────── */}
      {appealModalOpen && token && business._id && (
        <BusinessAppealModal
          businessId={business._id}
          businessName={business.name}
          blockedReason={business.blockedReason}
          token={token}
          onClose={() => setAppealModalOpen(false)}
          onSuccess={handleAppealSuccess}
        />
      )}

      {/* ══ BANNER: NEGOCIO BLOQUEADO (visible al dueño) ══ */}
      {isOwner && isBusinessBlocked && (
        <div style={{ maxWidth: 960, margin: "1rem auto 0", padding: "0 1.5rem" }}>
          <div style={{
            background: "linear-gradient(135deg,rgba(127,29,29,0.25),rgba(239,68,68,0.08))",
            border: "1.5px solid rgba(239,68,68,0.45)",
            borderRadius: 16,
            padding: "1.1rem 1.4rem",
            display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap",
          }}>
            {/* Icono */}
            <div style={{
              background: "rgba(239,68,68,0.18)", border: "1.5px solid rgba(239,68,68,0.4)",
              borderRadius: "50%", width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Lock size={20} style={{ color: "#f87171" }} />
            </div>

            {/* Texto */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ margin: "0 0 0.25rem", fontWeight: 800, color: "#fca5a5", fontSize: "0.95rem" }}>
                Tu negocio está bloqueado
              </p>
              {business.blockedReason && (
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.8rem", color: "rgba(252,165,165,0.7)", lineHeight: 1.5 }}>
                  Motivo: <em>{business.blockedReason}</em>
                </p>
              )}

              {/* Estado de la apelación */}
              {appealPending && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 20, padding: "0.2rem 0.65rem", marginTop: "0.2rem",
                }}>
                  <Clock size={11} style={{ color: "#f59e0b" }} />
                  <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 700 }}>
                    Apelación en revisión — el equipo te notificará pronto
                  </span>
                </div>
              )}
              {appealStatus === "rejected" && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 20, padding: "0.2rem 0.65rem", marginTop: "0.2rem",
                }}>
                  <X size={11} style={{ color: "#f87171" }} />
                  <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 700 }}>
                    Apelación rechazada
                  </span>
                </div>
              )}

              <p style={{ margin: "0.45rem 0 0", fontSize: "0.75rem", color: "rgba(252,165,165,0.55)", lineHeight: 1.5 }}>
                Tu negocio no es visible al público mientras esté bloqueado.
                {canAppeal && " Si creés que el bloqueo fue incorrecto, podés enviar una apelación."}
              </p>
            </div>

            {/* Botón apelar */}
            {canAppeal && (
              <button
                onClick={() => setAppealModalOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  border: "none", borderRadius: 10,
                  padding: "0.55rem 1.2rem",
                  color: "#fff", fontWeight: 700, fontSize: "0.83rem",
                  cursor: "pointer", flexShrink: 0, alignSelf: "flex-start",
                  boxShadow: "0 2px 12px rgba(239,68,68,0.35)",
                  whiteSpace: "nowrap",
                }}
              >
                <ShieldAlert size={14} /> Apelar bloqueo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Banner chats no leidos */}
      {isOwner && unreadChats > 0 && (
        <div style={{ maxWidth: 960, margin: "1rem auto 0", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "1.5px solid #fed7aa", borderRadius: 14, padding: "0.85rem 1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#f97316", color: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, flexShrink: 0, boxShadow: "0 2px 8px rgba(249,115,22,0.4)" }}>{unreadChats}</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#9a3412", fontSize: "0.93rem" }}>{unreadChats === 1 ? "Tenes 1 mensaje nuevo" : `Tenes ${unreadChats} chats sin leer`}</p>
                <p style={{ margin: 0, color: "#c2410c", fontSize: "0.78rem" }}>Clientes esperando tu respuesta</p>
              </div>
            </div>
            <button onClick={() => router.push(latestConvId ? `/chatpage?conversationId=${latestConvId}` : "/chatpage")} style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 10, padding: "0.5rem 1.2rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(249,115,22,0.35)", whiteSpace: "nowrap" }}>
              <MessageCircle size={14} /> Ver chat
            </button>
          </div>
        </div>
      )}

      {/* Banner: productos bloqueados */}
      {isOwner && blockedCount > 0 && (
        <div style={{ maxWidth: 960, margin: "1rem auto 0", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.06))", border: "1.5px solid rgba(239,68,68,0.35)", borderRadius: 14, padding: "0.85rem 1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "rgba(239,68,68,0.2)", border: "1.5px solid rgba(239,68,68,0.4)", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: "#f87171" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#fca5a5", fontSize: "0.93rem" }}>
                  {blockedCount === 1 ? "Tenes 1 producto bloqueado" : `Tenes ${blockedCount} productos bloqueados`}
                </p>
                <p style={{ margin: 0, color: "rgba(252,165,165,0.75)", fontSize: "0.78rem", lineHeight: 1.4 }}>
                  No son visibles al publico.
                  {underReviewCount > 0 ? ` ${underReviewCount} en revision.` : " Podés enviarlos a revision."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner: ubicacion faltante */}
      {isOwner && !editing && !hasLocation && !isBusinessBlocked && (
        <div style={{ maxWidth: 960, margin: "1rem auto 0", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.06))", border: "1.5px solid rgba(239,68,68,0.35)", borderRadius: 14, padding: "0.85rem 1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Navigation size={22} style={{ color: "#f87171", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#fca5a5", fontSize: "0.9rem" }}>Tu negocio no tiene ubicacion</p>
                <p style={{ margin: 0, color: "rgba(252,165,165,0.75)", fontSize: "0.78rem" }}>Los compradores no pueden encontrarte por cercania.</p>
              </div>
            </div>
            <button onClick={handleStartEditing} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "0.5rem 1.1rem", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
              <MapPin size={13} /> Agregar ubicacion
            </button>
          </div>
        </div>
      )}

      {/* HERO */}
      <div className="negocio-hero" style={isBusinessBlocked ? { opacity: 0.75, filter: "grayscale(25%)" } : undefined}>
        <div className="negocio-wrapper">
          <div className="negocio-avatar-container">
            <img src={currentLogo} alt={business.name} className="negocio-avatar" />
            {editing && isOwner && !isBusinessBlocked && (
              <label className="avatar-upload" title="Cambiar foto">
                <Camera size={15} />
                <input type="file" accept="image/*" hidden onChange={handleLogoChange} />
              </label>
            )}
            {/* Badge bloqueado sobre el avatar */}
            {isBusinessBlocked && (
              <div style={{
                position: "absolute", bottom: -4, right: -4,
                background: "#dc2626", border: "2px solid #1c1210",
                borderRadius: "50%", width: 26, height: 26,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Lock size={13} color="#fff" />
              </div>
            )}
          </div>

          <div className="negocio-info">
            {editing && isOwner ? (
              <div className="negocio-edit-fields">
                <input className="negocio-input" placeholder="Nombre del negocio" value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} />
                <textarea className="negocio-textarea" placeholder="Descripcion" value={business.description} onChange={e => setBusiness({ ...business, description: e.target.value })} />
                <input className="negocio-input" placeholder="Ciudad" value={business.city} onChange={e => setBusiness({ ...business, city: e.target.value })} />
                <input className="negocio-input" placeholder="Numero de celular" value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} />
                <LocationPicker value={bizLocation} onChange={(loc: any) => { setBizLocation(loc); setLocationError(""); }} userLat={userCoords?.lat} userLng={userCoords?.lng} userCity={userCity} error={locationError} />
                <CategorySelector selected={selectedCategories} onChange={setSelectedCategories} />
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h1 className="negocio-title">{business.name || "Tu Negocio"}</h1>
                  {isBusinessBlocked ? (
                    <span style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", fontSize: "0.72rem", fontWeight: 700, padding: "3px 9px", borderRadius: 20, display: "flex", alignItems: "center", gap: 3, border: "1px solid rgba(239,68,68,0.3)" }}>
                      <Lock size={10} /> Bloqueado
                    </span>
                  ) : (
                    <span style={{ background: rankInfo.bg, color: rankInfo.color, fontSize: "0.72rem", fontWeight: 700, padding: "3px 9px", borderRadius: 20, display: "flex", alignItems: "center", gap: 3 }}>
                      <TrendingUp size={10} /> {rankInfo.label}
                    </span>
                  )}
                </div>
                {business.verified ? <span className="negocio-badge"><CheckCircle size={13} /> Verificado</span> : <span className="negocio-badge unverified">Comercio no verificado</span>}
                <CategoryBadges categories={business.categories} />
                <p className="negocio-description">{business.description || "Agrega una descripcion de tu negocio."}</p>
                <div className="negocio-meta">
                  <span><MapPin size={13} />{business.address || business.city || "Direccion no definida"}</span>
                  {hasLocation && <span style={{ display: "flex", alignItems: "center", gap: 3, color: "#4ade80", fontSize: "0.78rem", fontWeight: 600 }}><Navigation size={12} /> Ubicacion verificada</span>}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={13} /><a href={`https://wa.me/${(business.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "#4ade80", fontWeight: 600, textDecoration: "none" }}>{business.phone || "Sin telefono"}</a></span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}><Users size={13} />{followersCount} {followersCount === 1 ? "seguidor" : "seguidores"}</span>
                  {isOwner ? <OwnerStars rating={displayRating} total={displayTotal} /> : <StarRating current={social.rating} total={social.totalRatings} myRating={social.myRating} onRate={handleRate} />}
                  <span><Package size={13} /> {products.length} productos</span>
                </div>
              </>
            )}
          </div>

          <div className="negocio-hero-actions">
            {isOwner ? (
              editing ? (
                <>
                  {business._id && <button onClick={handleCancelEdit} className="negocio-btn cancel" disabled={saving}><X size={14} /> Cancelar</button>}
                  <button onClick={handleSave} className="negocio-btn save" disabled={saving}><Save size={14} />{saving ? "Guardando..." : business._id ? "Guardar" : "Crear negocio"}</button>
                </>
              ) : (
                !isBusinessBlocked && (
                  <button onClick={handleStartEditing} className="negocio-btn"><Edit size={14} /> Editar negocio</button>
                )
              )
            ) : (
              !isBusinessBlocked && (
                <VisitorPanel business={business} social={social} onFollow={handleFollow} onLike={handleLike} onContact={handleContact} />
              )
            )}
          </div>
        </div>
      </div>

      {/* PRODUCTOS */}
      <div className="negocio-products-section">
        <div className="negocio-products-header">
          <div>
            <h2 className="negocio-products-title"><ShoppingBag size={19} /> Productos publicados</h2>
            <p className="negocio-products-subtitle">
              {products.length} producto{products.length !== 1 ? "s" : ""}
              {isOwner && blockedCount > 0 && <span style={{ marginLeft: "0.5rem", color: "#f87171", fontWeight: 700, fontSize: "0.78rem" }}>· {blockedCount} bloqueado{blockedCount !== 1 ? "s" : ""}</span>}
              {isOwner && underReviewCount > 0 && <span style={{ marginLeft: "0.5rem", color: "#f59e0b", fontWeight: 700, fontSize: "0.78rem" }}>· {underReviewCount} en revision</span>}
            </p>
          </div>
          {isOwner && !isBusinessBlocked && (
            <div className="ng-header-actions">
              <button className="ng-btn-manage" onClick={() => router.push("/mis-productos")}>
                <LayoutList size={15} /> Gestionar productos <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {productsLoading ? (
          <div className="negocio-products-loading"><div className="negocio-spinner" /><p>Cargando productos...</p></div>
        ) : products.length === 0 ? (
          <div className="negocio-products-empty">
            <ShoppingBag size={52} strokeWidth={1} />
            <h3>No hay productos aun</h3>
            <p>{isOwner ? "Publica tu primer producto." : "Este negocio aun no tiene productos."}</p>
            {isOwner && !isBusinessBlocked && <button className="negocio-btn-add" style={{ marginTop: "0.5rem" }} onClick={openCreate}><Plus size={15} /> Agregar producto</button>}
          </div>
        ) : (
          <div className="negocio-products-grid">
            {products.map(p => {
              const isBlocked    = !!(p as ProductWithBlock).blocked;
              const blockType    = (p as ProductWithBlock).blockType;
              const blockedReason = (p as ProductWithBlock).blockedReason;
              const isUnderReview = !!(p as ProductWithBlock).underReview;
              const isPermanent  = blockType === "permanent";

              return (
                <div key={p._id} className="negocio-product-card"
                  style={isBlocked ? { opacity: 0.8, border: isPermanent ? "1.5px solid rgba(127,29,29,0.6)" : "1.5px solid rgba(239,68,68,0.4)", boxShadow: "0 0 0 1px rgba(239,68,68,0.1)" } : undefined}>

                  <div className="negocio-product-img-wrap" style={{ position: "relative" }}>
                    <img src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=400&background=f97316&color=fff`} alt={p.name} className="negocio-product-img" style={isBlocked ? { filter: "grayscale(65%) brightness(0.55)" } : undefined} />
                    <span className="negocio-product-category">{getCategoryLabel(p.category)}</span>
                    {p.discount && p.discount > 0 && !isBlocked && <span className="ng-ribbon">-{p.discount}%</span>}
                    {isBlocked && isOwner && <BlockedProductBanner reason={blockedReason} blockType={blockType} />}
                    {!isBlocked && isOwner && (
                      <div className="negocio-product-actions">
                        <button className="negocio-product-action-btn" title="Editar" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                        <button className="negocio-product-action-btn danger" title="Eliminar" onClick={() => handleDeleteProduct(p)}><Trash2 size={13} /></button>
                      </div>
                    )}
                    {isBlocked && isOwner && (
                      <div className="negocio-product-actions" style={{ zIndex: 20 }}>
                        <button className="negocio-product-action-btn danger" title="Eliminar" onClick={() => handleDeleteProduct(p)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>

                  <div className="negocio-product-info">
                    <h3 className="negocio-product-name" style={isBlocked ? { color: "rgba(252,165,165,0.7)" } : undefined}>{p.name}</h3>
                    {p.description && !isBlocked && (
                      <p className="negocio-product-desc">{p.description.slice(0, 60)}{p.description.length > 60 ? "..." : ""}</p>
                    )}
                    {isBlocked && isOwner && (
                      <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {isUnderReview ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "0.35rem 0.6rem" }}>
                            <Clock size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
                            <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700 }}>En revision por el equipo</span>
                          </div>
                        ) : !isPermanent ? (
                          <button onClick={() => setReviewModal(p as ProductWithBlock)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.4rem 0.65rem", cursor: "pointer", color: "#fca5a5", fontSize: "0.72rem", fontWeight: 700, width: "100%", justifyContent: "center" }}>
                            <Send size={11} /> Enviar a revision
                          </button>
                        ) : (
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <Lock size={10} /> Bloqueo permanente
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(252,165,165,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Lock size={10} /> No visible al publico
                        </p>
                      </div>
                    )}
                    <div className="negocio-product-footer">
                      {!isBlocked && <ProductPrice price={p.price} discount={p.discount} />}
                      {isBlocked && <span style={{ fontSize: "0.78rem", color: "rgba(252,165,165,0.5)" }}>${p.price.toLocaleString()}</span>}
                      <span className={`negocio-product-stock ${(p.stock ?? 0) < 5 ? "low" : "ok"}`}>Stock: {p.stock ?? 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isOwner && !isBusinessBlocked && (
        <ProductModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleProductSubmit} initial={editTarget} loading={productSaving} />
      )}
    </MainLayout>
  );
}