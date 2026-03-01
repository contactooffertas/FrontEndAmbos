"use client";
// app/destacados/page.tsx

import { useEffect, useState, Suspense } from "react";
import MainLayout from "../../app/componentes/MainLayout";
import { categories } from "../../app/lib/db";
import CategoryIcon from "../../app/componentes/cateroryicon";
import {
  Crown,
  Users,
  MapPin,
  Store,
  Package,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  Clock,
  Search,
  Star,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import "../../app/styles/destacados.css";

const API = "https://new-backend-lovat.vercel.app/api";

interface FeaturedBusiness {
  _id: string;
  type: string;
  endDate: string;
  paid: boolean;
  days: number;
  note?: string;
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
    category?: string;
  };
}

const PAGE_SIZE = 4;

const logoUrl = (name: string, url?: string) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&background=f97316&color=fff`;

function PartialStar({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = `dps-${Math.random().toString(36).slice(2, 9)}`;
  const pct = `${Math.max(0, Math.min(1, fill)) * 100}%`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={pct} stopColor="#f97316" />
          <stop offset={pct} stopColor="#374151" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
      </defs>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={`url(#${id})`}
        stroke={fill > 0.05 ? "#f97316" : "#374151"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRow({
  rating = 0,
  size = 13,
}: {
  rating?: number;
  size?: number;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <PartialStar
          key={s}
          fill={Math.min(1, Math.max(0, rating - (s - 1)))}
          size={size}
        />
      ))}
    </span>
  );
}

function daysLeft(dateStr: string) {
  return Math.max(
    0,
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000),
  );
}

/**
 * Compara la categoría del negocio con el slug seleccionado.
 * Acepta que la API devuelva el slug, el id o el nombre de la categoría.
 */
function matchesCategory(
  businessCategory: string | undefined,
  activeSlug: string,
): boolean {
  if (!businessCategory) return false;
  const val = businessCategory.toLowerCase().trim();
  const cat = categories.find((c) => c.slug === activeSlug);
  if (!cat) return false;
  return (
    val === cat.slug.toLowerCase() ||
    val === cat.id.toLowerCase() ||
    val === cat.name.toLowerCase()
  );
}

// ─── Single Featured Business Card ───────────────────────────────────────────
function DestacadoCard({ featured }: { featured: FeaturedBusiness }) {
  const b = featured.business;
  const followers = b.followers?.length ?? 0;
  const dl = daysLeft(featured.endDate);

  return (
    <div className="dest-card">
      {/* Header con imagen/logo */}
      <Link href={`/negocio/${b._id}`} className="dest-card__banner">
        <img
          src={logoUrl(b.name, b.logo)}
          alt={b.name}
          className="dest-card__banner-img"
        />
        <div className="dest-card__banner-overlay" />

        {/* Badges */}
        <div className="dest-card__badges">
          <span className="dest-badge dest-badge--crown">
            <Crown size={10} /> Destacado
          </span>
          {b.verified && (
            <span className="dest-badge dest-badge--verified">
              <CheckCircle size={10} /> Verificado
            </span>
          )}
        </div>

        {/* Nombre sobre la imagen */}
        <div className="dest-card__banner-info">
          <h3 className="dest-card__name">{b.name}</h3>
          <span className="dest-card__city">
            <MapPin size={11} /> {b.city}
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="dest-card__body">
        {b.description && <p className="dest-card__desc">{b.description}</p>}

        {/* Stats */}
        <div className="dest-card__stats">
          <div className="dest-card__rating">
            <StarRow rating={b.rating ?? 0} size={14} />
            <span className="dest-card__rating-text">
              {b.rating && b.rating > 0
                ? `${b.rating.toFixed(1)} (${b.totalRatings ?? 0} reseñas)`
                : "Sin calificaciones aún"}
            </span>
          </div>
          <div className="dest-card__meta">
            <span className="dest-card__meta-item">
              <Users size={13} />
              {followers > 0 ? `${followers} seguidores` : "Sin seguidores"}
            </span>

            {(b.totalProducts ?? 0) > 0 && (
              <span className="dest-card__meta-item">
                <Package size={13} /> {b.totalProducts} productos
              </span>
            )}
          </div>
        </div>

        {/* Categoría del negocio */}
        {b.category && (
          <div className="dest-card__category">
            {(() => {
              const cat = categories.find(
                (c) =>
                  c.slug === b.category ||
                  c.id === b.category ||
                  c.name.toLowerCase() === b.category?.toLowerCase(),
              );
              return cat ? (
                <span className="dest-card__category-badge">
                  <CategoryIcon
                    name={cat.iconName}
                    size={12}
                    strokeWidth={1.75}
                  />
                  {cat.name}
                </span>
              ) : null;
            })()}
          </div>
        )}

        {/* CTA */}
        <Link href={`/negocio/${b._id}`} className="dest-card__cta">
          <Store size={14} /> Visitar tienda
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="dest-card dest-card--skeleton">
      <div className="dest-skeleton__banner" />
      <div className="dest-card__body">
        <div
          className="dest-skeleton__line"
          style={{ width: "60%", height: 18, marginBottom: 8 }}
        />
        <div
          className="dest-skeleton__line"
          style={{ width: "90%", height: 12, marginBottom: 4 }}
        />
        <div
          className="dest-skeleton__line"
          style={{ width: "75%", height: 12, marginBottom: 20 }}
        />
        <div
          className="dest-skeleton__line"
          style={{ width: "40%", height: 12, marginBottom: 8 }}
        />
        <div
          className="dest-skeleton__line"
          style={{ width: "100%", height: 38, borderRadius: 10 }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function DestacadosContent() {
  const [all, setAll] = useState<FeaturedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products/featured-businesses`)
      .then((r) => r.json())
      .then((data) => setAll(Array.isArray(data) ? data : []))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, []);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery]);

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtered = all.filter((f) => {
    const b = f.business;
    const matchCat =
      !activeCategory || matchesCategory(b.category, activeCategory);
    const matchSearch =
      !searchQuery ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Negocios con categoría coincidente para mostrar conteo en botones ──────
  const countByCategory = (slug: string) =>
    all.filter((f) => matchesCategory(f.business.category, slug)).length;

  // ── Paginación ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const goTo = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Rango de páginas visibles en el paginador ──────────────────────────────
  const pageRange = (() => {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, safePage - delta);
      i <= Math.min(totalPages, safePage + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  })();

  return (
    <MainLayout>
      {/* ─── Hero header ──────────────────────────────────────────────────── */}
      <div className="dest-hero">
        <div className="dest-hero__inner">
          <div className="dest-hero__icon">
            <Crown size={36} strokeWidth={1.5} />
          </div>
          <h1 className="dest-hero__title">Negocios destacados</h1>
          <p className="dest-hero__subtitle">
            Los mejores negocios verificados con planes activos, listos para
            atenderte
          </p>
          <div className="dest-hero__count">
            {loading
              ? "Cargando..."
              : `${all.length} negocio${all.length !== 1 ? "s" : ""} destacado${all.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      <div className="dest-main">
        {/* ─── Barra de búsqueda ────────────────────────────────────────── */}
        <div className="dest-search-bar">
          <Search size={16} className="dest-search-bar__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, ciudad o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dest-search-bar__input"
          />
          {searchQuery && (
            <button
              className="dest-search-bar__clear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* ─── Filtro de categorías ─────────────────────────────────────── */}
        <div className="dest-filters">
          <div className="dest-filters__label">Filtrar por categoría:</div>
          <div className="dest-filters__scroll">
            <button
              className={`dest-filter-btn ${!activeCategory ? "active" : ""}`}
              onClick={() => setActiveCategory("")}
            >
              <Tag size={13} /> Todas
              {!loading && (
                <span className="dest-filter-btn__count">{all.length}</span>
              )}
            </button>
            {categories.map((cat) => {
              const count = loading ? null : countByCategory(cat.slug);
              if (!loading && count === 0) return null; // ocultar categorías sin negocios
              return (
                <button
                  key={cat.slug}
                  className={`dest-filter-btn ${activeCategory === cat.slug ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.slug)}
                >
                  <CategoryIcon
                    name={cat.iconName}
                    size={13}
                    strokeWidth={1.75}
                  />
                  {cat.name}
                  {count !== null && (
                    <span className="dest-filter-btn__count">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Resultados header ────────────────────────────────────────── */}
        {!loading && (
          <div className="dest-results-info">
            <span>
              {filtered.length === 0
                ? "Sin resultados"
                : `${filtered.length} negocio${filtered.length !== 1 ? "s" : ""}`}
              {(activeCategory || searchQuery) && (
                <span className="dest-results-info__filters">
                  {activeCategory &&
                    ` · ${categories.find((c) => c.slug === activeCategory)?.name}`}
                  {searchQuery && ` · "${searchQuery}"`}
                </span>
              )}
            </span>
            {(activeCategory || searchQuery) && (
              <button
                className="dest-clear-filters"
                onClick={() => {
                  setActiveCategory("");
                  setSearchQuery("");
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ─── Grid ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="dest-grid">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="dest-empty">
            <div className="dest-empty__icon">
              <Store size={52} strokeWidth={1} />
            </div>
            <h3>No encontramos negocios</h3>
            <p>
              {activeCategory || searchQuery
                ? "Probá limpiar los filtros o buscar con otros términos."
                : "Todavía no hay negocios destacados. ¡Volvé más tarde!"}
            </p>
            {(activeCategory || searchQuery) && (
              <button
                className="dest-empty__btn"
                onClick={() => {
                  setActiveCategory("");
                  setSearchQuery("");
                }}
              >
                Ver todos
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="dest-grid">
              {pageItems.map((f) => (
                <DestacadoCard key={f._id} featured={f} />
              ))}
            </div>

            {/* ─── Paginación ───────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="dest-pagination">
                <button
                  className="dest-pag-btn dest-pag-btn--nav"
                  onClick={() => goTo(safePage - 1)}
                  disabled={safePage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageRange[0] > 1 && (
                  <>
                    <button className="dest-pag-btn" onClick={() => goTo(1)}>
                      1
                    </button>
                    {pageRange[0] > 2 && (
                      <span className="dest-pag-ellipsis">…</span>
                    )}
                  </>
                )}

                {pageRange.map((p) => (
                  <button
                    key={p}
                    className={`dest-pag-btn ${p === safePage ? "active" : ""}`}
                    onClick={() => goTo(p)}
                  >
                    {p}
                  </button>
                ))}

                {pageRange[pageRange.length - 1] < totalPages && (
                  <>
                    {pageRange[pageRange.length - 1] < totalPages - 1 && (
                      <span className="dest-pag-ellipsis">…</span>
                    )}
                    <button
                      className="dest-pag-btn"
                      onClick={() => goTo(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  className="dest-pag-btn dest-pag-btn--nav"
                  onClick={() => goTo(safePage + 1)}
                  disabled={safePage === totalPages}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>

                <span className="dest-pag-info">
                  Página {safePage} de {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── CTA Banner ───────────────────────────────────────────────────── */}
      <div className="dest-cta-banner">
        <div className="dest-cta-banner__inner">
          <Crown
            size={28}
            strokeWidth={1.5}
            className="dest-cta-banner__icon"
          />
          <div>
            <h3>¿Querés destacar tu negocio?</h3>
            <p>Llegá a miles de clientes con un plan de visibilidad premium.</p>
          </div>
        </div>
        <Link href="/register" className="dest-cta-banner__btn">
          Empezar ahora
        </Link>
      </div>
    </MainLayout>
  );
}

export default function DestacadosPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div
            style={{
              padding: "4rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <Clock
              size={32}
              style={{ opacity: 0.3, display: "block", margin: "0 auto 1rem" }}
            />
            <p>Cargando destacados...</p>
          </div>
        </MainLayout>
      }
    >
      <DestacadosContent />
    </Suspense>
  );
}
