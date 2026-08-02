"use client";
// app/programa-afiliados/SellerDashboard.tsx


import { useCallback, useEffect, useState, type JSX } from "react";
import {
  Package, Users, IdCard, Star, Ban, Trash2, CheckCircle2, XCircle,
  MessageCircle, Copy, Loader2, ChevronLeft, ChevronRight, Search, Check,
} from "lucide-react";
import "../styles/afiliados-vendedor.css";

const API = "https://new-backend-lovat.vercel.app/api/affiliates/seller";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error(data.message || "Ocurrió un error");
  return data;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Ocurrió un error inesperado";
}

function buildWhatsAppLink(phone: string, businessName: string): string {
  const digits = phone.replace(/\D/g, "");
  const message = `Hola! Te contacto desde ${businessName} por el Programa de Afiliados.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

interface SellerProductItem {
  productId: string;
  name: string;
  image: string | null;
  price: number;
  isOffer: boolean;
  offerId: string | null;
  commissionPercentage: number | null;
  offerActive: boolean;
}

interface OfferSummary {
  offerId: string;
  productId: string | null;
  productName: string;
  commissionPercentage: number;
  pendingCount: number;
  acceptedCount: number;
}

interface ApplicantBuyerData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  socialMedia: string;
  salesExperience: string;
}

type ApplicationStatus = "pending" | "accepted" | "rejected" | "blocked";

interface OfferApplicationItem {
  applicationId: string;
  status: ApplicationStatus;
  appliedAt: string;
  decidedAt: string | null;
  rating: number | null;
  salesCount: number;
  affiliateCode: string | null;
  buyer: ApplicantBuyerData | null;
}

interface MyAffiliateItem {
  applicationId: string;
  status: "accepted" | "blocked";
  rating: number | null;
  salesCount: number;
  affiliatedSince: string | null;
  affiliateLink: string | null;
  productName: string | null;
  buyer: ApplicantBuyerData | null;
}

type TabKey = "ofertas" | "solicitudes" | "afiliados";

interface SellerDashboardProps {
  businessName: string;
}

function Pagination({
  meta,
  onChange,
}: {
  meta: PaginationMeta;
  onChange: (page: number) => void;
}): JSX.Element {
  return (
    <div className="affseller-pagination">
      <button
        type="button"
        className="affseller-page-btn"
        disabled={meta.page <= 1}
        onClick={() => onChange(meta.page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="affseller-page-info">
        Página {meta.page} de {meta.totalPages} ({meta.total} en total)
      </span>
      <button
        type="button"
        className="affseller-page-btn"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onChange(meta.page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function BuyerCarnet({
  buyer,
  businessName,
  footer,
}: {
  buyer: ApplicantBuyerData;
  businessName: string;
  footer: JSX.Element;
}): JSX.Element {
  const initials = `${buyer.firstName?.[0] ?? ""}${buyer.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="affseller-carnet">
      <div className="affseller-carnet-header">
        <div className="affseller-carnet-avatar">{initials || "?"}</div>
        <div>
          <p className="affseller-carnet-name">
            {buyer.firstName} {buyer.lastName}
          </p>
          <p className="affseller-carnet-location">
            {buyer.city}, {buyer.province}
          </p>
        </div>
      </div>
      <div className="affseller-carnet-divider" />
      <div className="affseller-carnet-details">
        <p>
          <span>Email</span> {buyer.email}
        </p>
        <p>
          <span>Teléfono</span> {buyer.phone}
        </p>
        {buyer.socialMedia && (
          <p>
            <span>Redes</span> {buyer.socialMedia}
          </p>
        )}
        {buyer.salesExperience && (
          <p>
            <span>Experiencia</span> {buyer.salesExperience}
          </p>
        )}
      </div>
      <a
        href={buildWhatsAppLink(buyer.phone, businessName)}
        target="_blank"
        rel="noopener noreferrer"
        className="affseller-whatsapp-btn"
      >
        <MessageCircle size={15} /> Contactar por WhatsApp
      </a>
      {footer}
    </div>
  );
}

export default function SellerDashboard({ businessName }: SellerDashboardProps): JSX.Element {
  const [tab, setTab] = useState<TabKey>("ofertas");

  // --- Tab: Ofertas (catálogo paginado de 5 en 5) ---
  const [products, setProducts] = useState<SellerProductItem[]>([]);
  const [productsMeta, setProductsMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 5 });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const loadProducts = useCallback(async (page: number, searchTerm: string) => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "5" });
      if (searchTerm) query.set("search", searchTerm);
      const data = await authFetch<{ items: SellerProductItem[] } & PaginationMeta>(
        `/products?${query.toString()}`
      );
      setProducts(data.items);
      setProductsMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setProductsError(errorMessage(err));
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "ofertas") return;
    const timeout = setTimeout(() => {
      void loadProducts(1, search);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  const handleToggleOffer = async (product: SellerProductItem) => {
    setSavingProductId(product.productId);
    setProductsError("");
    try {
      if (product.isOffer && product.offerId) {
        await authFetch(`/offers/${product.offerId}/toggle`, {
          method: "PATCH",
          body: JSON.stringify({ active: !product.offerActive }),
        });
      } else {
        await authFetch(`/offers`, {
          method: "POST",
          body: JSON.stringify({ productId: product.productId }),
        });
      }
      await loadProducts(productsMeta.page, search);
    } catch (err) {
      setProductsError(errorMessage(err));
    } finally {
      setSavingProductId(null);
    }
  };

  const handleCommissionChange = async (product: SellerProductItem, value: string) => {
    if (!product.offerId) return;
    const percentage = Number(value);
    if (Number.isNaN(percentage)) return;
    setSavingProductId(product.productId);
    try {
      await authFetch(`/offers`, {
        method: "POST",
        body: JSON.stringify({ productId: product.productId, commissionPercentage: percentage }),
      });
      await loadProducts(productsMeta.page, search);
    } catch (err) {
      setProductsError(errorMessage(err));
    } finally {
      setSavingProductId(null);
    }
  };

  // --- Tab: Solicitudes (por oferta, 5 en 5) ---
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [applications, setApplications] = useState<OfferApplicationItem[]>([]);
  const [applicationsMeta, setApplicationsMeta] = useState<PaginationMeta>({
    page: 1, totalPages: 1, total: 0, limit: 5,
  });
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const data = await authFetch<{ items: OfferSummary[] }>(`/offers`);
      setOffers(data.items);
      if (data.items.length > 0 && !selectedOfferId) {
        setSelectedOfferId(data.items[0].offerId);
      }
    } catch (err) {
      setApplicationsError(errorMessage(err));
    } finally {
      setOffersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApplications = useCallback(async (offerId: string, page: number) => {
    if (!offerId) {
      setApplications([]);
      return;
    }
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "5", status: "pending" });
      const data = await authFetch<{ items: OfferApplicationItem[] } & PaginationMeta>(
        `/offers/${offerId}/applications?${query.toString()}`
      );
      setApplications(data.items);
      setApplicationsMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setApplicationsError(errorMessage(err));
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "solicitudes") void loadOffers();
  }, [tab, loadOffers]);

  useEffect(() => {
    if (tab === "solicitudes" && selectedOfferId) void loadApplications(selectedOfferId, 1);
  }, [tab, selectedOfferId, loadApplications]);

  const handleAccept = async (applicationId: string) => {
    setDecidingId(applicationId);
    try {
      await authFetch(`/applications/${applicationId}/accept`, { method: "POST" });
      await loadApplications(selectedOfferId, applicationsMeta.page);
      await loadOffers();
    } catch (err) {
      setApplicationsError(errorMessage(err));
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    setDecidingId(applicationId);
    try {
      await authFetch(`/applications/${applicationId}/reject`, { method: "POST" });
      await loadApplications(selectedOfferId, applicationsMeta.page);
      await loadOffers();
    } catch (err) {
      setApplicationsError(errorMessage(err));
    } finally {
      setDecidingId(null);
    }
  };

  // --- Tab: Mis Afiliados (5 en 5) ---
  const [affiliates, setAffiliates] = useState<MyAffiliateItem[]>([]);
  const [affiliatesMeta, setAffiliatesMeta] = useState<PaginationMeta>({
    page: 1, totalPages: 1, total: 0, limit: 5,
  });
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [affiliatesError, setAffiliatesError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadAffiliates = useCallback(async (page: number) => {
    setAffiliatesLoading(true);
    setAffiliatesError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "5" });
      const data = await authFetch<{ items: MyAffiliateItem[] } & PaginationMeta>(
        `/mis-afiliados?${query.toString()}`
      );
      setAffiliates(data.items);
      setAffiliatesMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setAffiliatesError(errorMessage(err));
    } finally {
      setAffiliatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "afiliados") void loadAffiliates(1);
  }, [tab, loadAffiliates]);

  const handleRate = async (applicationId: string, rating: number) => {
    setActingId(applicationId);
    try {
      await authFetch(`/applications/${applicationId}/rating`, {
        method: "PATCH",
        body: JSON.stringify({ rating }),
      });
      await loadAffiliates(affiliatesMeta.page);
    } catch (err) {
      setAffiliatesError(errorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const handleBlockToggle = async (item: MyAffiliateItem) => {
    setActingId(item.applicationId);
    try {
      await authFetch(`/applications/${item.applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: item.status === "blocked" ? "accepted" : "blocked" }),
      });
      await loadAffiliates(affiliatesMeta.page);
    } catch (err) {
      setAffiliatesError(errorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (applicationId: string) => {
    const confirmed = window.confirm("¿Eliminar definitivamente a este afiliado?");
    if (!confirmed) return;
    setActingId(applicationId);
    try {
      await authFetch(`/applications/${applicationId}`, { method: "DELETE" });
      await loadAffiliates(affiliatesMeta.page);
    } catch (err) {
      setAffiliatesError(errorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const handleCopyLink = async (applicationId: string, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(applicationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="affseller-dashboard">
      <div className="affseller-tabs">
        <button
          type="button"
          className={`affseller-tab ${tab === "ofertas" ? "affseller-tab-active" : ""}`}
          onClick={() => setTab("ofertas")}
        >
          <Package size={15} /> Ofertas
        </button>
        <button
          type="button"
          className={`affseller-tab ${tab === "solicitudes" ? "affseller-tab-active" : ""}`}
          onClick={() => setTab("solicitudes")}
        >
          <IdCard size={15} /> Solicitudes
        </button>
        <button
          type="button"
          className={`affseller-tab ${tab === "afiliados" ? "affseller-tab-active" : ""}`}
          onClick={() => setTab("afiliados")}
        >
          <Users size={15} /> Mis Afiliados
        </button>
      </div>

      {tab === "ofertas" && (
        <div className="affseller-panel">
          <div className="affseller-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {productsError && <p className="affseller-error">{productsError}</p>}

          {productsLoading ? (
            <div className="affseller-loading">
              <Loader2 size={18} className="affseller-spin" /> Cargando productos...
            </div>
          ) : products.length === 0 ? (
            <p className="affseller-empty">No encontramos productos.</p>
          ) : (
            <div className="affseller-product-list">
              {products.map((product) => (
                <div key={product.productId} className="affseller-product-row">
                  <div className="affseller-product-info">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.name} className="affseller-product-thumb" />
                    ) : (
                      <div className="affseller-product-thumb affseller-product-thumb-empty" />
                    )}
                    <div>
                      <p className="affseller-product-name">{product.name}</p>
                      <p className="affseller-product-price">${product.price}</p>
                    </div>
                  </div>
                  <div className="affseller-product-actions">
                    {product.isOffer && (
                      <div className="affseller-commission-field">
                        <label>Comisión %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={product.commissionPercentage ?? 0}
                          onBlur={(e) => void handleCommissionChange(product, e.target.value)}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      className={`affseller-toggle-btn ${
                        product.isOffer && product.offerActive ? "affseller-toggle-active" : ""
                      }`}
                      disabled={savingProductId === product.productId}
                      onClick={() => void handleToggleOffer(product)}
                    >
                      {savingProductId === product.productId ? (
                        <Loader2 size={14} className="affseller-spin" />
                      ) : product.isOffer && product.offerActive ? (
                        "Oferta activa"
                      ) : (
                        "Habilitar oferta"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination meta={productsMeta} onChange={(page) => void loadProducts(page, search)} />
        </div>
      )}

      {tab === "solicitudes" && (
        <div className="affseller-panel">
          {offersLoading ? (
            <div className="affseller-loading">
              <Loader2 size={18} className="affseller-spin" /> Cargando ofertas...
            </div>
          ) : offers.length === 0 ? (
            <p className="affseller-empty">Todavía no tenés ofertas activas.</p>
          ) : (
            <>
              <div className="affseller-offer-select">
                <label>Oferta</label>
                <select value={selectedOfferId} onChange={(e) => setSelectedOfferId(e.target.value)}>
                  {offers.map((offer) => (
                    <option key={offer.offerId} value={offer.offerId}>
                      {offer.productName} · {offer.pendingCount} pendientes · {offer.acceptedCount} afiliados
                    </option>
                  ))}
                </select>
              </div>

              {applicationsError && <p className="affseller-error">{applicationsError}</p>}

              {applicationsLoading ? (
                <div className="affseller-loading">
                  <Loader2 size={18} className="affseller-spin" /> Cargando solicitudes...
                </div>
              ) : applications.length === 0 ? (
                <p className="affseller-empty">No hay solicitudes pendientes para esta oferta.</p>
              ) : (
                <div className="affseller-carnet-grid">
                  {applications.map((application) =>
                    application.buyer ? (
                      <BuyerCarnet
                        key={application.applicationId}
                        buyer={application.buyer}
                        businessName={businessName}
                        footer={
                          <div className="affseller-carnet-actions">
                            <button
                              type="button"
                              className="affseller-accept-btn"
                              disabled={decidingId === application.applicationId}
                              onClick={() => void handleAccept(application.applicationId)}
                            >
                              <CheckCircle2 size={15} /> Aceptar
                            </button>
                            <button
                              type="button"
                              className="affseller-reject-btn"
                              disabled={decidingId === application.applicationId}
                              onClick={() => void handleReject(application.applicationId)}
                            >
                              <XCircle size={15} /> Rechazar
                            </button>
                          </div>
                        }
                      />
                    ) : null
                  )}
                </div>
              )}

              <Pagination
                meta={applicationsMeta}
                onChange={(page) => void loadApplications(selectedOfferId, page)}
              />
            </>
          )}
        </div>
      )}

      {tab === "afiliados" && (
        <div className="affseller-panel">
          {affiliatesError && <p className="affseller-error">{affiliatesError}</p>}

          {affiliatesLoading ? (
            <div className="affseller-loading">
              <Loader2 size={18} className="affseller-spin" /> Cargando afiliados...
            </div>
          ) : affiliates.length === 0 ? (
            <p className="affseller-empty">Todavía no tenés afiliados aceptados.</p>
          ) : (
            <div className="affseller-carnet-grid">
              {affiliates.map((item) =>
                item.buyer ? (
                  <BuyerCarnet
                    key={item.applicationId}
                    buyer={item.buyer}
                    businessName={businessName}
                    footer={
                      <div className="affseller-affiliate-footer">
                        <div className="affseller-affiliate-meta">
                          <p>
                            <span>Producto</span> {item.productName}
                          </p>
                          <p>
                            <span>Afiliado desde</span> {formatDate(item.affiliatedSince)}
                          </p>
                          <p>
                            <span>Ventas registradas</span> {item.salesCount}
                          </p>
                          <p className={`affseller-status-badge affseller-status-${item.status}`}>
                            {item.status === "blocked" ? "Bloqueado" : "Activo"}
                          </p>
                        </div>

                        <div className="affseller-rating">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              disabled={actingId === item.applicationId}
                              onClick={() => void handleRate(item.applicationId, value)}
                              className={`affseller-star ${
                                (item.rating ?? 0) >= value ? "affseller-star-filled" : ""
                              }`}
                            >
                              <Star size={16} />
                            </button>
                          ))}
                        </div>

                        {item.affiliateLink && (
                          <button
                            type="button"
                            className="affseller-copy-link-btn"
                            onClick={() => void handleCopyLink(item.applicationId, item.affiliateLink as string)}
                          >
                            {copiedId === item.applicationId ? (
                              <>
                                <Check size={14} /> Copiado
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> Copiar link de afiliado
                              </>
                            )}
                          </button>
                        )}

                        <div className="affseller-carnet-actions">
                          <button
                            type="button"
                            className="affseller-block-btn"
                            disabled={actingId === item.applicationId}
                            onClick={() => void handleBlockToggle(item)}
                          >
                            <Ban size={15} /> {item.status === "blocked" ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            type="button"
                            className="affseller-delete-btn"
                            disabled={actingId === item.applicationId}
                            onClick={() => void handleDelete(item.applicationId)}
                          >
                            <Trash2 size={15} /> Eliminar
                          </button>
                        </div>
                      </div>
                    }
                  />
                ) : null
              )}
            </div>
          )}

          <Pagination meta={affiliatesMeta} onChange={(page) => void loadAffiliates(page)} />
        </div>
      )}
    </div>
  );
}
