"use client";
// app/programa-afiliados/BuyerDashboard.tsx
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Swal from "sweetalert2";
import {
  Package, Send, Clock, CheckCircle2, Search,
  MessageCircle, Copy, Loader2, ChevronLeft, ChevronRight, Check, Star,
  Wallet, Pencil, X, Save,
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

function formatMoney(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

/** Calcula los días restantes a partir de la fecha de vencimiento,
 *  para usar como fallback cuando el backend no manda daysRemaining. */
function daysRemainingFromDue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Devuelve daysRemaining si vino como número válido; si no, lo calcula desde dueDate. */
function getDaysRemaining(item: { daysRemaining: number | null; dueDate: string | null }): number {
  return typeof item.daysRemaining === "number" && !Number.isNaN(item.daysRemaining)
    ? item.daysRemaining
    : daysRemainingFromDue(item.dueDate);
}

function daysLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return `Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) === 1 ? "" : "s"}`;
  if (daysRemaining === 0) return "Vence hoy";
  return `Vence en ${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`;
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
  totalSalesAmount: number;
  totalEarnedCommission: number;
  totalPendingCommission: number;
  commissionPercentage: number | null;
  product: ProductData | null;
  seller: SellerCardData | null;
  affiliateLink: string | null;
}

interface PendingSaleItem {
  saleId: string;
  productName: string;
  seller: SellerCardData | null;
  date: string;
  dueDate: string | null;
  daysRemaining: number | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  commissionAmount: number;
}

interface EarningsSummary {
  totalEarned: number;
  totalPending: number;
  totalCollected: number;
  pendingSales: PendingSaleItem[];
  urgentSales: PendingSaleItem[];
}

interface BuyerProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  socialMedia: string;
  salesExperience: string;
}

type TabKey = "ofertas" | "solicitudes" | "mis-ofertas" | "ganancias";

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
      
      <a  href={buildWhatsAppLink(seller.phone, buyerName)}
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

/** Card de perfil propio del comprador, editable in-place. */
function ProfileEditCard(): JSX.Element {
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [draft, setDraft] = useState<BuyerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authFetch<{ profile: BuyerProfile }>("/perfil");
      setProfile(data.profile);
      setDraft(data.profile);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleField = (field: keyof BuyerProfile, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleCancel = () => {
    setDraft(profile);
    setEditing(false);
    setError("");
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const data = await authFetch<{ profile: BuyerProfile }>("/perfil", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setProfile(data.profile);
      setDraft(data.profile);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="affbuyer-profile-card">
        <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando tu perfil...</div>
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="affbuyer-profile-card">
        {error && <p className="affbuyer-error">{error}</p>}
        <p className="affbuyer-empty">No pudimos cargar tu perfil de afiliado.</p>
      </div>
    );
  }

  return (
    <div className="affbuyer-profile-card">
      <div className="affbuyer-profile-header">
        <p className="affbuyer-profile-title">Mi perfil de afiliado</p>
        {!editing ? (
          <button type="button" className="affbuyer-edit-btn" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Editar
          </button>
        ) : (
          <div className="affbuyer-profile-actions">
            <button type="button" className="affbuyer-cancel-btn" disabled={saving} onClick={handleCancel}>
              <X size={14} /> Cancelar
            </button>
            <button type="button" className="affbuyer-save-btn" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 size={14} className="affbuyer-spin" /> : <Save size={14} />} Guardar
            </button>
          </div>
        )}
      </div>

      {error && <p className="affbuyer-error">{error}</p>}

      <div className="affbuyer-profile-grid">
        <label>
          <span>Nombre</span>
          <input value={draft.firstName} disabled={!editing} onChange={(e) => handleField("firstName", e.target.value)} />
        </label>
        <label>
          <span>Apellido</span>
          <input value={draft.lastName} disabled={!editing} onChange={(e) => handleField("lastName", e.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input type="email" value={draft.email} disabled={!editing} onChange={(e) => handleField("email", e.target.value)} />
        </label>
        <label>
          <span>Teléfono</span>
          <input value={draft.phone} disabled={!editing} onChange={(e) => handleField("phone", e.target.value)} />
        </label>
        <label>
          <span>Ciudad</span>
          <input value={draft.city} disabled={!editing} onChange={(e) => handleField("city", e.target.value)} />
        </label>
        <label>
          <span>Provincia</span>
          <input value={draft.province} disabled={!editing} onChange={(e) => handleField("province", e.target.value)} />
        </label>
        <label>
          <span>Redes sociales</span>
          <input value={draft.socialMedia} disabled={!editing} onChange={(e) => handleField("socialMedia", e.target.value)} />
        </label>
        <label className="affbuyer-profile-grid-full">
          <span>Experiencia en ventas</span>
          <input value={draft.salesExperience} disabled={!editing} onChange={(e) => handleField("salesExperience", e.target.value)} />
        </label>
      </div>
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

  // --- Tab: Ganancias (cuánto llevás ganado y qué te corresponde cobrar) ---
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const alertShownRef = useRef(false);

  const loadEarnings = useCallback(async () => {
    setEarningsLoading(true);
    setEarningsError("");
    try {
      const data = await authFetch<EarningsSummary>("/resumen");
      setEarnings(data);
    } catch (err) {
      setEarningsError(errorMessage(err));
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  // Se carga siempre al montar (no solo al entrar a la pestaña) para poder
  // disparar la alerta de vencimiento apenas el comprador entra al panel.
  useEffect(() => {
    void loadEarnings();
  }, [loadEarnings]);

  useEffect(() => {
    if (!earnings || alertShownRef.current) return;
    if (earnings.urgentSales.length === 0) return;
    alertShownRef.current = true;

    const totalUrgent = earnings.urgentSales.reduce((sum, s) => sum + s.commissionAmount, 0);
    const soonest = earnings.urgentSales[0];
    const soonestDays = getDaysRemaining(soonest);

    void Swal.fire({
      icon: "info",
      title: "Tenés un cobro por vencer",
      html: `
        <p>Tenés <strong>${formatMoney(totalUrgent)}</strong> por cobrar de tus últimas ventas.</p>
        <p>${daysLabel(soonestDays)} el pago de <strong>${soonest.productName}</strong> (${formatMoney(soonest.commissionAmount)}).</p>
      `,
      confirmButtonText: "Ver mis ganancias",
      confirmButtonColor: "#111827",
    }).then((result) => {
      if (result.isConfirmed) setTab("ganancias");
    });
  }, [earnings]);

  return (
    <div className="affbuyer-dashboard">
      <ProfileEditCard />

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
        <button type="button" className={`affbuyer-tab ${tab === "ganancias" ? "affbuyer-tab-active" : ""}`} onClick={() => setTab("ganancias")}>
          <Wallet size={15} /> Ganancias
          {earnings && earnings.urgentSales.length > 0 && <span className="affbuyer-tab-dot" />}
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
                              <div className="affbuyer-amount-box">
                                <p className="affbuyer-amount-line">
                                  <span>Monto total vendido</span>
                                  <strong className="affbuyer-amount-value">{formatMoney(application.totalSalesAmount)}</strong>
                                </p>
                                <p className="affbuyer-amount-line">
                                  <span>Tu comisión ganada</span>
                                  <strong className="affbuyer-amount-value affbuyer-amount-positive">
                                    {formatMoney(application.totalEarnedCommission)}
                                  </strong>
                                </p>
                                {application.totalPendingCommission > 0 && (
                                  <p className="affbuyer-amount-line">
                                    <span>Pendiente de cobro</span>
                                    <strong className="affbuyer-amount-value affbuyer-amount-pending">
                                      {formatMoney(application.totalPendingCommission)}
                                    </strong>
                                  </p>
                                )}
                              </div>
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

      {tab === "ganancias" && (
        <div className="affbuyer-panel">
          {earningsError && <p className="affbuyer-error">{earningsError}</p>}

          {earningsLoading && !earnings ? (
            <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando tus ganancias...</div>
          ) : earnings ? (
            <>
              <div className="affbuyer-earnings-summary">
                <div className="affbuyer-earnings-card">
                  <p className="affbuyer-earnings-label">Llevás ganado en total</p>
                  <p className="affbuyer-earnings-value">{formatMoney(earnings.totalEarned)}</p>
                </div>
                <div className="affbuyer-earnings-card affbuyer-earnings-card-pending">
                  <p className="affbuyer-earnings-label">Te corresponde cobrar</p>
                  <p className="affbuyer-earnings-value">{formatMoney(earnings.totalPending)}</p>
                </div>
                <div className="affbuyer-earnings-card affbuyer-earnings-card-collected">
                  <p className="affbuyer-earnings-label">Ya cobrado</p>
                  <p className="affbuyer-earnings-value">{formatMoney(earnings.totalCollected)}</p>
                </div>
              </div>

              {earnings.pendingSales.length === 0 ? (
                <p className="affbuyer-empty">No tenés cobros pendientes.</p>
              ) : (
                <div className="affbuyer-sales-list">
                  {earnings.pendingSales.map((sale) => {
                    const saleDays = getDaysRemaining(sale);
                    return (
                      <div
                        key={sale.saleId}
                        className={`affbuyer-sale-row ${saleDays <= 5 ? "affbuyer-sale-row-urgent" : ""}`}
                      >
                        <div>
                          <p className="affbuyer-sale-product">{sale.productName}</p>
                          <p className="affbuyer-sale-seller">{sale.seller?.businessName ?? "Vendedor"} · {formatDate(sale.date)}</p>
                        </div>
                        <div className="affbuyer-sale-amounts">
                          <p className="affbuyer-sale-total">Venta: {formatMoney(sale.totalAmount)}</p>
                          <p className="affbuyer-sale-commission">A cobrar: {formatMoney(sale.commissionAmount)}</p>
                        </div>
                        <div className="affbuyer-sale-due">
                          <span className={`affbuyer-due-badge ${saleDays <= 5 ? "affbuyer-due-badge-urgent" : ""}`}>
                            {daysLabel(saleDays)}
                          </span>
                          <span className="affbuyer-due-date">Vence: {formatDate(sale.dueDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
