"use client";
// app/programa-afiliados/BuyerDashboard.tsx
//

import { useCallback, useEffect, useState } from "react";
import {
  Package, Send, Clock, CheckCircle2, Search,
  MessageCircle, Copy, Loader2, ChevronLeft, ChevronRight, Check, Star,
} from "lucide-react";
import "../styles/afiliados-comprador.css";

const API = "https://new-backend-lovat.vercel.app/api/affiliates/buyer";

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

function buildWhatsAppLink(phone: string, buyerName: string): string {
  const digits = phone.replace(/\D/g, "");
  const message = `Hola! Soy ${buyerName}, te contacto por el Programa de Afiliados.`;
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

interface SellerCardData {
  sellerId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  description: string;
}

interface ProductData {
  productId: string;
  name: string;
  image: string | null;
  price: number;
}

type ApplicationStatus = "pending" | "accepted" | "rejected" | "blocked";

interface OfferListItem {
  offerId: string;
  commissionPercentage: number;
  product: ProductData;
  seller: SellerCardData | null;
  applicationStatus: ApplicationStatus | null;
}

interface MyApplicationItem {
  applicationId: string;
  status: ApplicationStatus;
  appliedAt: string;
  decidedAt: string | null;
  rating: number | null;
  salesCount: number;
  commissionPercentage: number | null;
  product: ProductData | null;
  seller: SellerCardData | null;
  affiliateLink: string | null;
}

type TabKey = "ofertas" | "solicitudes" | "mis-ofertas";

interface BuyerDashboardProps {
  buyerName: string;
}

function Pagination({ meta, onChange }: { meta: PaginationMeta; onChange: (page: number) => void }): JSX.Element {
  return (
    <div className="affbuyer-pagination">
      <button type="button" className="affbuyer-page-btn" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        <ChevronLeft size={16} />
      </button>
      <span className="affbuyer-page-info">
        Página {meta.page} de {meta.totalPages} ({meta.total} en total)
      </span>
      <button type="button" className="affbuyer-page-btn" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function SellerCarnet({
  seller,
  buyerName,
  footer,
}: {
  seller: SellerCardData;
  buyerName: string;
  footer: JSX.Element;
}): JSX.Element {
  const initial = seller.businessName?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="affbuyer-carnet">
      <div className="affbuyer-carnet-header">
        <div className="affbuyer-carnet-avatar">{initial}</div>
        <div>
          <p className="affbuyer-carnet-name">{seller.businessName}</p>
          <p className="affbuyer-carnet-contact">{seller.contactName}</p>
        </div>
      </div>
      <div className="affbuyer-carnet-divider" />
      {seller.description && <p className="affbuyer-carnet-description">{seller.description}</p>}
      <div className="affbuyer-carnet-details">
        <p><span>Email</span> {seller.email}</p>
        <p><span>Teléfono</span> {seller.phone}</p>
      </div>
      
        href={buildWhatsAppLink(seller.phone, buyerName)}
        target="_blank"
        rel="noopener noreferrer"
        className="affbuyer-whatsapp-btn"
      >
        <MessageCircle size={15} /> Contactar por WhatsApp
      </a>
      {footer}
    </div>
  );
}

export default function BuyerDashboard({ buyerName }: BuyerDashboardProps): JSX.Element {
  const [tab, setTab] = useState<TabKey>("ofertas");

  // --- Tab: Ofertas disponibles (5 en 5, con búsqueda) ---
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [offersMeta, setOffersMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 5 });
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState("");
  const [search, setSearch] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const loadOffers = useCallback(async (page: number, searchTerm: string) => {
    setOffersLoading(true);
    setOffersError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "5" });
      if (searchTerm) query.set("search", searchTerm);
      const data = await authFetch<{ items: OfferListItem[] } & PaginationMeta>(`/offers?${query.toString()}`);
      setOffers(data.items);
      setOffersMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setOffersError(errorMessage(err));
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "ofertas") return;
    const timeout = setTimeout(() => void loadOffers(1, search), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  const handleApply = async (offerId: string) => {
    setApplyingId(offerId);
    setOffersError("");
    try {
      await authFetch(`/offers/${offerId}/apply`, { method: "POST" });
      await loadOffers(offersMeta.page, search);
    } catch (err) {
      setOffersError(errorMessage(err));
    } finally {
      setApplyingId(null);
    }
  };

  // --- Tabs: Mis Solicitudes (pending) y Mis Ofertas (accepted) ---
  const [applications, setApplications] = useState<MyApplicationItem[]>([]);
  const [applicationsMeta, setApplicationsMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 5 });
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const statusForTab: ApplicationStatus = tab === "mis-ofertas" ? "accepted" : "pending";

  const loadApplications = useCallback(async (page: number, status: ApplicationStatus) => {
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "5", status });
      const data = await authFetch<{ items: MyApplicationItem[] } & PaginationMeta>(`/mis-ofertas?${query.toString()}`);
      setApplications(data.items);
      setApplicationsMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setApplicationsError(errorMessage(err));
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "solicitudes" || tab === "mis-ofertas") {
      void loadApplications(1, statusForTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleCopyLink = async (applicationId: string, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(applicationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="affbuyer-dashboard">
      <div className="affbuyer-tabs">
        <button type="button" className={`affbuyer-tab ${tab === "ofertas" ? "affbuyer-tab-active" : ""}`} onClick={() => setTab("ofertas")}>
          <Package size={15} /> Ofertas disponibles
        </button>
        <button type="button" className={`affbuyer-tab ${tab === "solicitudes" ? "affbuyer-tab-active" : ""}`} onClick={() => setTab("solicitudes")}>
          <Clock size={15} /> Mis Solicitudes
        </button>
        <button type="button" className={`affbuyer-tab ${tab === "mis-ofertas" ? "affbuyer-tab-active" : ""}`} onClick={() => setTab("mis-ofertas")}>
          <CheckCircle2 size={15} /> Mis Ofertas
        </button>
      </div>

      {tab === "ofertas" && (
        <div className="affbuyer-panel">
          <div className="affbuyer-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {offersError && <p className="affbuyer-error">{offersError}</p>}

          {offersLoading ? (
            <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando ofertas...</div>
          ) : offers.length === 0 ? (
            <p className="affbuyer-empty">No encontramos ofertas disponibles.</p>
          ) : (
            <div className="affbuyer-offer-list">
              {offers.map((offer) => (
                <div key={offer.offerId} className="affbuyer-offer-row">
                  <div className="affbuyer-offer-info">
                    {offer.product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={offer.product.image} alt={offer.product.name} className="affbuyer-offer-thumb" />
                    ) : (
                      <div className="affbuyer-offer-thumb affbuyer-offer-thumb-empty" />
                    )}
                    <div>
                      <p className="affbuyer-offer-name">{offer.product.name}</p>
                      <p className="affbuyer-offer-seller">{offer.seller?.businessName ?? "Vendedor"}</p>
                      <p className="affbuyer-offer-commission">Comisión: {offer.commissionPercentage}%</p>
                    </div>
                  </div>
                  {offer.applicationStatus === null ? (
                    <button
                      type="button"
                      className="affbuyer-apply-btn"
                      disabled={applyingId === offer.offerId}
                      onClick={() => void handleApply(offer.offerId)}
                    >
                      {applyingId === offer.offerId ? <Loader2 size={14} className="affbuyer-spin" /> : <Send size={14} />}
                      Aplicar
                    </button>
                  ) : (
                    <span className={`affbuyer-status-badge affbuyer-status-${offer.applicationStatus}`}>
                      {offer.applicationStatus === "pending" && "Solicitud enviada"}
                      {offer.applicationStatus === "accepted" && "Ya sos afiliado"}
                      {offer.applicationStatus === "rejected" && "Rechazada"}
                      {offer.applicationStatus === "blocked" && "Bloqueado"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Pagination meta={offersMeta} onChange={(page) => void loadOffers(page, search)} />
        </div>
      )}

      {(tab === "solicitudes" || tab === "mis-ofertas") && (
        <div className="affbuyer-panel">
          {applicationsError && <p className="affbuyer-error">{applicationsError}</p>}

          {applicationsLoading ? (
            <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando...</div>
          ) : applications.length === 0 ? (
            <p className="affbuyer-empty">
              {tab === "solicitudes" ? "No tenés solicitudes pendientes." : "Todavía no tenés ofertas aceptadas."}
            </p>
          ) : (
            <div className="affbuyer-carnet-grid">
              {applications.map((application) =>
                application.seller ? (
                  <SellerCarnet
                    key={application.applicationId}
                    seller={application.seller}
                    buyerName={buyerName}
                    footer={
                      <div className="affbuyer-application-footer">
                        <div className="affbuyer-application-meta">
                          <p><span>Producto</span> {application.product?.name ?? "-"}</p>
                          <p><span>Comisión</span> {application.commissionPercentage ?? "-"}%</p>
                          {tab === "mis-ofertas" && (
                            <>
                              <p><span>Afiliado desde</span> {formatDate(application.decidedAt)}</p>
                              <p><span>Ventas registradas</span> {application.salesCount}</p>
                              {application.rating !== null && (
                                <div className="affbuyer-rating">
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <Star
                                      key={value}
                                      size={14}
                                      className={
                                        application.rating !== null && application.rating >= value
                                          ? "affbuyer-star-filled"
                                          : "affbuyer-star"
                                      }
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          <p className={`affbuyer-status-badge affbuyer-status-${application.status}`}>
                            {application.status === "pending" && "Pendiente"}
                            {application.status === "accepted" && "Aceptado"}
                            {application.status === "rejected" && "Rechazado"}
                            {application.status === "blocked" && "Bloqueado"}
                          </p>
                        </div>

                        {application.affiliateLink && (
                          <button
                            type="button"
                            className="affbuyer-copy-link-btn"
                            onClick={() => void handleCopyLink(application.applicationId, application.affiliateLink as string)}
                          >
                            {copiedId === application.applicationId ? (
                              <><Check size={14} /> Copiado</>
                            ) : (
                              <><Copy size={14} /> Copiar link de afiliado</>
                            )}
                          </button>
                        )}
                      </div>
                    }
                  />
                ) : null
              )}
            </div>
          )}

          <Pagination meta={applicationsMeta} onChange={(page) => void loadApplications(page, statusForTab)} />
        </div>
      )}
    </div>
  );
}
