"use client";
// app/componentes/categoria.tsx
// ✅ Categorías siempre visibles — datos estáticos de lib/db, productos desde API

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "./MainLayout";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import { categories } from "../lib/db";
import CategoryIcon from "./cateroryicon";
import {
  ShoppingCart, UserPlus, Users, Store,
  ArrowLeft, Package, Tag, Frown,
} from "lucide-react";
import "../../app/styles/categoria.css";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vercel-backend-ochre-nine.vercel.app/api";

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
  business?: {
    _id: string;
    name: string;
    city: string;
    logo?: string;
    verified?: boolean;
    followers?: string[];
    rating?: number;
  };
}

// ── Partial star para ratings decimales ───────────────────────────────────────
function PartialStar({ fill, size = 13 }: { fill: number; size?: number }) {
  const id  = `ps-${Math.random().toString(36).slice(2, 8)}`;
  const pct = `${Math.max(0, Math.min(1, fill)) * 100}%`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={pct}  stopColor="#f59e0b" />
          <stop offset={pct}  stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={`url(#${id})`}
        stroke={fill > 0.05 ? "#f59e0b" : "#d1d5db"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRow({ rating = 0, size = 12 }: { rating?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <PartialStar key={s} fill={Math.min(1, Math.max(0, rating - (s - 1)))} size={size} />
      ))}
    </span>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({
  product,
  currentUserId,
  index,
}: {
  product: Product;
  currentUserId?: string;
  index: number;
}) {
  const { addToCart } = useCart();
  const [liked,     setLiked]     = useState(false);
  const [following, setFollowing] = useState(false);

  const bizId     = product.business?._id;
  const bizRating = product.business?.rating ?? 0;
  const followers = product.business?.followers?.length ?? 0;

  const needsAuth = async () => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({
      icon: "info",
      title: "Iniciá sesión",
      text: "Necesitás una cuenta para hacer esto.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleCart = () => {
    addToCart({
      _id: product._id,
      productId: product._id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      image: product.image,
      businessId: product.business?._id,
      businessName: product.business?.name,
      stock: product.stock || 99,
    });
  };

  return (
    <div className="cat-product-card" style={{ animationDelay: `${index * 0.045}s` }}>
      {/* Imagen */}
      <div className="cat-product-img-wrap">
        <img
          src={
            product.image ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=400&background=f97316&color=fff`
          }
          alt={product.name}
          loading="lazy"
        />
        {product.discount ? (
          <span className="cat-discount-badge">
            <Tag size={9} />-{product.discount}%
          </span>
        ) : null}
        <button
          className="cat-fav-btn"
          onClick={async (e) => {
            e.preventDefault();
            if (!currentUserId) { needsAuth(); return; }
            setLiked((v) => !v);
          }}
        >
          <span
            style={{
              color: liked ? "#ef4444" : "#9ca3af",
              fontSize: "1rem",
              transition: "color 0.2s",
            }}
          >
            {liked ? "♥" : "♡"}
          </span>
        </button>
        {(product.stock ?? 0) === 0 && (
          <div className="cat-out-of-stock">Sin stock</div>
        )}
      </div>

      {/* Body */}
      <div className="cat-product-body">
        {bizId ? (
          <Link href={`/negocio/${bizId}`} className="cat-business-link">
            {product.business?.name}
            {product.business?.city ? ` · ${product.business.city}` : ""}
            {product.business?.verified && (
              <span className="cat-verified">✓</span>
            )}
          </Link>
        ) : (
          <div className="cat-business-link">
            {product.business?.name || "Negocio"}
          </div>
        )}

        <div className="cat-stars-row">
          <StarRow rating={bizRating} size={12} />
          <span className="cat-rating-text">
            {bizRating > 0 ? bizRating.toFixed(1) : "Sin votos"}
          </span>
          {followers > 0 && (
            <span className="cat-followers">
              <Users size={10} />
              {followers}
            </span>
          )}
        </div>

        <h3 className="cat-product-name">{product.name}</h3>

        <div className="cat-prices">
          <span className="cat-price">${product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="cat-original">
              ${product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="cat-product-footer">
        <button
          className="cat-add-btn"
          onClick={handleCart}
          disabled={(product.stock ?? 0) === 0}
        >
          <ShoppingCart size={14} />
          {(product.stock ?? 0) === 0 ? "Sin stock" : "Agregar"}
        </button>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            className="cat-follow-btn"
            onClick={async (e) => {
              e.preventDefault();
              if (!currentUserId) { needsAuth(); return; }
              setFollowing((v) => !v);
            }}
            style={{
              border: `1.5px solid ${following ? "#f97316" : "var(--border, #e5e7eb)"}`,
              background: following ? "rgba(249,115,22,0.08)" : "transparent",
              color: following ? "#f97316" : "var(--text-muted, #9ca3af)",
            }}
          >
            <UserPlus size={12} />
            {following ? "Siguiendo" : "Seguir"}
          </button>
          {bizId && (
            <Link href={`/negocio/${bizId}`} className="cat-visit-btn">
              Ver →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sell Banner ───────────────────────────────────────────────────────────────
function SellBanner() {
  return (
    <div className="cat-sell-banner">
      <div className="cat-sell-banner-content">
        <div className="cat-sell-banner-icon">
          <Store size={28} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="cat-sell-banner-title">
            ¿Querés vender en esta categoría?
          </h3>
          <p className="cat-sell-banner-desc">
            Sumate a Offerton, publicá tus productos y llegá a miles de compradores.
          </p>
        </div>
        <Link href="/register" className="cat-sell-banner-btn">
          Empezar gratis
        </Link>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CategoriaPage() {
  const params   = useParams<{ slug: string }>();
  const slug     = params?.slug ?? "";
  const router   = useRouter();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sortBy,   setSortBy]   = useState<"price_asc" | "price_desc" | "rating">("rating");

  // ✅ catInfo viene del array ESTÁTICO — disponible de inmediato, sin esperar fetch
  const catInfo = categories.find((c) => c.slug === slug);
  const currentUserId = (user as any)?._id || (user as any)?.id;

  // Fetch de productos desde la API (solo los productos, no las categorías)
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setProducts([]); // limpia productos anteriores al cambiar de categoría
    fetch(`${API}/products?category=${encodeURIComponent(slug)}&limit=40`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  // Ordenar en cliente
  const sorted = [...products].sort((a, b) => {
    if (sortBy === "price_asc")  return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    return (b.business?.rating ?? 0) - (a.business?.rating ?? 0);
  });

  const categoryExists = !!catInfo;

  return (
    <MainLayout>
      {/* ── Header de categoría ── */}
      <div className="cat-header">
        <div className="cat-header-inner">
          <button className="cat-back-btn" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Volver
          </button>

          <div className="cat-header-content">
            {/* ✅ catInfo disponible al instante — no espera la API */}
            {catInfo ? (
              <>
                <div className="cat-header-icon">
                  <CategoryIcon name={catInfo.iconName} size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="cat-header-title">{catInfo.name}</h1>
                  <p className="cat-header-subtitle">
                    {loading
                      ? "Cargando productos..."
                      : `${products.length} producto${products.length !== 1 ? "s" : ""} disponibles`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="cat-header-icon cat-header-icon--unknown">
                  <Package size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="cat-header-title">Categoría desconocida</h1>
                  <p className="cat-header-subtitle">No encontramos esta categoría</p>
                </div>
              </>
            )}
          </div>

          {/* Ordenar — solo si hay productos */}
          {categoryExists && products.length > 0 && (
            <div className="cat-sort">
              <label className="cat-sort-label">Ordenar:</label>
              <select
                className="cat-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="rating">Mejor valorados</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="cat-page">

        {/* Categoría no existe */}
        {!categoryExists && (
          <div className="cat-empty-state">
            <div className="cat-empty-icon">
              <Frown size={52} strokeWidth={1} />
            </div>
            <h2>Esta categoría no existe</h2>
            <p>
              No encontramos la categoría <strong>"{slug}"</strong> en nuestro marketplace.
            </p>
            <Link href="/" className="cat-empty-btn">
              Ver todas las categorías
            </Link>
            <SellBanner />
          </div>
        )}

        {/* Cargando — muestra skeletons mientras espera la API */}
        {categoryExists && loading && (
          <div className="cat-grid">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="cat-skeleton"
                style={{ animationDelay: `${i * 0.06}s` }}
              />
            ))}
          </div>
        )}

        {/* Sin productos */}
        {categoryExists && !loading && products.length === 0 && (
          <div className="cat-empty-state">
            <div className="cat-empty-icon">
              <Package size={52} strokeWidth={1} />
            </div>
            <h2>Sin productos en esta categoría</h2>
            <p>
              Todavía no hay productos publicados en{" "}
              <strong>{catInfo?.name}</strong>. ¡Sé el primero en vender acá!
            </p>
            <Link href="/" className="cat-empty-btn-outline">
              Explorar otras categorías
            </Link>
            <SellBanner />
          </div>
        )}

        {/* Grid de productos */}
        {categoryExists && !loading && sorted.length > 0 && (
          <>
            <div className="cat-grid">
              {sorted.map((p, i) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  currentUserId={currentUserId}
                  index={i}
                />
              ))}
            </div>
            <SellBanner />
          </>
        )}

      </div>
    </MainLayout>
  );
}