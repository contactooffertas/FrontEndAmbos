"use client";
// app/programa-afiliados/SellerDashboard.tsx

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Swal from "sweetalert2";
import {
  Package, Users, IdCard, Star, Ban, Trash2, CheckCircle2, XCircle,
  MessageCircle, Copy, Loader2, ChevronLeft, ChevronRight, Search, Check,
  Wallet, Pencil, X, Save, DollarSign, FileText, AlertTriangle, History,
} from "lucide-react";
import "../styles/afiliados-vendedor.css";

const API = "/api/backend-proxy/affiliates/seller";

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

function formatMoney(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
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
  totalSalesAmount: number;
  totalCommissionOwed: number;
  totalCommissionPending: number;
  affiliatedSince: string | null;
  affiliateLink: string | null;
  productName: string | null;
  buyer: ApplicantBuyerData | null;
}

interface PendingSaleItem {
  saleId: string;
  productName: string;
  affiliate: ApplicantBuyerData | null;
  date: string;
  dueDate: string | null;
  daysRemaining: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  commissionAmount: number;
  paymentDisputed: boolean;
  disputeReason: string | null;
}

interface PaidSaleItem {
  saleId: string;
  productName: string;
  affiliate: ApplicantBuyerData | null;
  date: string;
  paidAt: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  commissionAmount: number;
  proofUrl: string | null;
}

interface PayablesByAffiliate {
  affiliate: ApplicantBuyerData | null;
  totalPending: number;
  sales: PendingSaleItem[];
}

interface PayablesSummary {
  totalToPay: number;
  totalPaidHistoric: number;
  pendingSales: PendingSaleItem[];
  urgentSales: PendingSaleItem[];
  disputedSales: PendingSaleItem[];
  paidSales: PaidSaleItem[];
  byAffiliate: PayablesByAffiliate[];
}

interface SellerProfile {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  description: string;
  defaultPercentage: number;
  maxAffiliates: number;
  paymentTermDays: number;
}

type TabKey = "ofertas" | "solicitudes" | "afiliados" | "pagos";

interface SellerDashboardProps {
  businessName: string;
}

interface NotificationBadge {
  count: number;
  pendingApplications: number;
  urgentOrDisputed: number;
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
        <p><span>Email</span> {buyer.email}</p>
        <p><span>Teléfono</span> {buyer.phone}</p>
        {buyer.socialMedia && <p><span>Redes</span> {buyer.socialMedia}</p>}
        {buyer.salesExperience && <p><span>Experiencia</span> {buyer.salesExperience}</p>}
      </div>
      <a href={buildWhatsAppLink(buyer.phone, businessName)} target="_blank" rel="noopener noreferrer" className="affseller-whatsapp-btn">
        <MessageCircle size={15} /> Contactar por WhatsApp
      </a>
      {footer}
    </div>
  );
}

function ProfileEditCard({ onPaymentTermChange }: { onPaymentTermChange?: (days: 15 | 30) => void }): JSX.Element {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [draft, setDraft] = useState<SellerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const notifyTerm = useCallback((value: number) => {
    const normalized: 15 | 30 = value === 15 ? 15 : 30;
    onPaymentTermChange?.(normalized);
  }, [onPaymentTermChange]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authFetch<{ profile: SellerProfile }>("/perfil");
      const loaded = { ...data.profile, paymentTermDays: data.profile.paymentTermDays ?? 30 };
      setProfile(loaded);
      setDraft(loaded);
      notifyTerm(loaded.paymentTermDays);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [notifyTerm]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const handleField = (field: keyof SellerProfile, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleTermChange = (value: string) => {
    setDraft((prev) => (prev ? { ...prev, paymentTermDays: Number(value) } : prev));
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
      const data = await authFetch<{ profile: SellerProfile }>("/perfil", {
        method: "PATCH",
        body: JSON.stringify({
          ...draft,
          defaultPercentage: Number(draft.defaultPercentage),
          maxAffiliates: Number(draft.maxAffiliates),
          paymentTermDays: Number(draft.paymentTermDays),
        }),
      });
      const saved = { ...data.profile, paymentTermDays: data.profile.paymentTermDays ?? 30 };
      setProfile(saved);
      setDraft(saved);
      setEditing(false);
      notifyTerm(saved.paymentTermDays);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="affseller-profile-card"><div className="affseller-loading"><Loader2 size={18} className="affseller-spin" /> Cargando tu perfil...</div></div>;
  }

  if (!profile || !draft) {
    return (
      <div className="affseller-profile-card">
        {error && <p className="affseller-error">{error}</p>}
        <p className="affseller-empty">No pudimos cargar tu perfil de vendedor afiliado.</p>
      </div>
    );
  }

  return (
    <div className="affseller-profile-card">
      <div className="affseller-profile-header">
        <p className="affseller-profile-title">Mi perfil de vendedor</p>
        {!editing ? (
          <button type="button" className="affseller-edit-btn" onClick={() => setEditing(true)}><Pencil size={14} /> Editar</button>
        ) : (
          <div className="affseller-profile-actions">
            <button type="button" className="affseller-cancel-btn" disabled={saving} onClick={handleCancel}><X size={14} /> Cancelar</button>
            <button type="button" className="affseller-save-btn" disabled={saving} onClick={() => void handleSave()}>{saving ? <Loader2 size={14} className="affseller-spin" /> : <Save size={14} />} Guardar</button>
          </div>
        )}
      </div>
      {error && <p className="affseller-error">{error}</p>}
      <div className="affseller-profile-grid">
        <label><span>Nombre del negocio</span><input value={draft.businessName} disabled={!editing} onChange={(e) => handleField("businessName", e.target.value)} /></label>
        <label><span>Nombre de contacto</span><input value={draft.contactName} disabled={!editing} onChange={(e) => handleField("contactName", e.target.value)} /></label>
        <label><span>Email</span><input type="email" value={draft.email} disabled={!editing} onChange={(e) => handleField("email", e.target.value)} /></label>
        <label><span>Teléfono</span><input value={draft.phone} disabled={!editing} onChange={(e) => handleField("phone", e.target.value)} /></label>
        <label><span>Comisión por defecto (%)</span><input type="number" min={0} max={100} value={draft.defaultPercentage} disabled={!editing} onChange={(e) => handleField("defaultPercentage", e.target.value)} /></label>
        <label><span>Máximo de afiliados</span><input type="number" min={1} value={draft.maxAffiliates} disabled={!editing} onChange={(e) => handleField("maxAffiliates", e.target.value)} /></label>
        <label>
          <span>Ciclo de pago a afiliados</span>
          <select value={String(draft.paymentTermDays ?? 30)} disabled={!editing} onChange={(e) => handleTermChange(e.target.value)}>
            <option value="15">Cada 15 días</option>
            <option value="30">Cada 30 días</option>
          </select>
          <small className="affseller-field-hint">Se aplica a las ventas nuevas a partir de que guardes este cambio.</small>
        </label>
        <label className="affseller-profile-grid-full"><span>Descripción</span><input value={draft.description} disabled={!editing} onChange={(e) => handleField("description", e.target.value)} /></label>
      </div>
    </div>
  );
}

function TabCount({ value }: { value: number }): JSX.Element | null {
  if (value <= 0) return null;
  return <span className="affseller-tab-count">{value > 99 ? "99+" : value}</span>;
}

export default function SellerDashboard({ businessName }: SellerDashboardProps): JSX.Element {
  const [tab, setTab] = useState<TabKey>("ofertas");
  const [, setPaymentTermDays] = useState<15 | 30>(30);
  const [badge, setBadge] = useState<NotificationBadge>({ count: 0, pendingApplications: 0, urgentOrDisputed: 0 });

  const loadBadge = useCallback(async () => {
    try {
      const data = await authFetch<NotificationBadge>("/notifications-badge");
      setBadge(data);
    } catch {}
  }, []);

  useEffect(() => {
    void loadBadge();
    const interval = setInterval(() => void loadBadge(), 30_000);
    return () => clearInterval(interval);
  }, [loadBadge]);

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
      const data = await authFetch<{ items: SellerProductItem[] } & PaginationMeta>(`/products?${query.toString()}`);
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
    const timeout = setTimeout(() => { void loadProducts(1, search); }, 350);
    return () => clearTimeout(timeout);
  }, [tab, search, loadProducts]);

  const handleToggleOffer = async (product: SellerProductItem) => {
    setSavingProductId(product.productId);
    setProductsError("");
    try {
      if (product.isOffer && product.offerId) {
        await authFetch(`/offers/${product.offerId}`, { method: "DELETE" });
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

  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [applications, setApplications] = useState<OfferApplicationItem[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [applicationsMeta, setApplicationsMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 5 });
  const [selectedOfferId, setSelectedOfferId] = useState("");

  const loadApplications = useCallback(async (page = 1) => {
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const data = await authFetch<{ offers: OfferSummary[]; applications: OfferApplicationItem[] } & PaginationMeta>(`/applications?page=${page}&limit=5${selectedOfferId ? `&offerId=${selectedOfferId}` : ""}`);
      setOffers(data.offers || []);
      setApplications(data.applications || []);
      setApplicationsMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setApplicationsError(errorMessage(err));
    } finally {
      setApplicationsLoading(false);
    }
  }, [selectedOfferId]);

  useEffect(() => { if (tab === "solicitudes") void loadApplications(1); }, [tab, selectedOfferId, loadApplications]);

  const handleApplication = async (applicationId: string, action: "accept" | "reject" | "block") => {
    try {
      await authFetch(`/applications/${applicationId}/${action}`, { method: "PATCH" });
      await loadApplications(applicationsMeta.page);
      await loadBadge();
    } catch (err) {
      setApplicationsError(errorMessage(err));
    }
  };

  const [affiliates, setAffiliates] = useState<MyAffiliateItem[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [affiliatesError, setAffiliatesError] = useState("");
  const [affiliatesMeta, setAffiliatesMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 5 });

  const loadAffiliates = useCallback(async (page = 1) => {
    setAffiliatesLoading(true);
    setAffiliatesError("");
    try {
      const data = await authFetch<{ items: MyAffiliateItem[] } & PaginationMeta>(`/affiliates?page=${page}&limit=5`);
      setAffiliates(data.items || []);
      setAffiliatesMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setAffiliatesError(errorMessage(err));
    } finally {
      setAffiliatesLoading(false);
    }
  }, []);

  useEffect(() => { if (tab === "afiliados") void loadAffiliates(1); }, [tab, loadAffiliates]);

  const [payables, setPayables] = useState<PayablesSummary | null>(null);
  const [payablesLoading, setPayablesLoading] = useState(false);
  const [payablesError, setPayablesError] = useState("");

  const loadPayables = useCallback(async () => {
    setPayablesLoading(true);
    setPayablesError("");
    try {
      const data = await authFetch<PayablesSummary>("/payables");
      setPayables(data);
    } catch (err) {
      setPayablesError(errorMessage(err));
    } finally {
      setPayablesLoading(false);
    }
  }, []);

  useEffect(() => { if (tab === "pagos") void loadPayables(); }, [tab, loadPayables]);

  return (
    <div className="affseller-dashboard">
      <ProfileEditCard onPaymentTermChange={(days) => setPaymentTermDays(days)} />

      <div className="affseller-tabs">
        <button className={`affseller-tab ${tab === "ofertas" ? "affseller-tab-active" : ""}`} onClick={() => setTab("ofertas")}><Package size={16} /> Ofertas</button>
        <button className={`affseller-tab ${tab === "solicitudes" ? "affseller-tab-active" : ""}`} onClick={() => setTab("solicitudes")}><Users size={16} /> Solicitudes <TabCount value={badge.pendingApplications} /></button>
        <button className={`affseller-tab ${tab === "afiliados" ? "affseller-tab-active" : ""}`} onClick={() => setTab("afiliados")}><IdCard size={16} /> Afiliados</button>
        <button className={`affseller-tab ${tab === "pagos" ? "affseller-tab-active" : ""}`} onClick={() => setTab("pagos")}><Wallet size={16} /> Pagos <TabCount value={badge.urgentOrDisputed} /></button>
      </div>

      {tab === "ofertas" && (
        <div className="affseller-panel">
          <div className="affseller-panel-header">
            <div><h2>Productos para afiliados</h2><p>Elegí qué productos querés ofrecer dentro del programa.</p></div>
            <div className="affseller-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto" /></div>
          </div>
          {productsError && <p className="affseller-error">{productsError}</p>}
          {productsLoading ? <div className="affseller-loading"><Loader2 className="affseller-spin" /> Cargando productos...</div> : products.length === 0 ? <p className="affseller-empty">No hay productos para mostrar.</p> : (
            <div className="affseller-product-list">
              {products.map((product) => (
                <div key={product.productId} className="affseller-product-card">
                  <div className="affseller-product-info">
                    {product.image ? <img src={product.image} alt={product.name} className="affseller-product-image" /> : <div className="affseller-product-image-placeholder"><Package size={20} /></div>}
                    <div><h3>{product.name}</h3><p>{formatMoney(product.price)}</p></div>
                  </div>
                  <button type="button" className={product.isOffer ? "affseller-secondary-btn" : "affseller-primary-btn"} disabled={savingProductId === product.productId} onClick={() => void handleToggleOffer(product)}>
                    {savingProductId === product.productId ? <Loader2 size={14} className="affseller-spin" /> : product.isOffer ? <><Trash2 size={14} /> Quitar</> : <><Check size={14} /> Ofrecer</>}
                  </button>
                </div>
              ))}
            </div>
          )}
          <Pagination meta={productsMeta} onChange={(page) => void loadProducts(page, search)} />
        </div>
      )}

      {tab === "solicitudes" && (
        <div className="affseller-panel">
          <div className="affseller-panel-header"><div><h2>Solicitudes</h2><p>Revisá quién quiere promocionar tus productos.</p></div></div>
          {applicationsError && <p className="affseller-error">{applicationsError}</p>}
          {offers.length > 0 && <select value={selectedOfferId} onChange={(e) => setSelectedOfferId(e.target.value)}><option value="">Todas las ofertas</option>{offers.map((offer) => <option key={offer.offerId} value={offer.offerId}>{offer.productName}</option>)}</select>}
          {applicationsLoading ? <div className="affseller-loading"><Loader2 className="affseller-spin" /> Cargando solicitudes...</div> : applications.length === 0 ? <p className="affseller-empty">No hay solicitudes nuevas.</p> : (
            <div className="affseller-carnet-list">
              {applications.map((app) => app.buyer ? <BuyerCarnet key={app.applicationId} buyer={app.buyer} businessName={businessName} footer={<div className="affseller-carnet-actions"><button onClick={() => void handleApplication(app.applicationId, "accept")}><CheckCircle2 size={14} /> Aceptar</button><button onClick={() => void handleApplication(app.applicationId, "reject")}><XCircle size={14} /> Rechazar</button></div>} /> : null)}
            </div>
          )}
          <Pagination meta={applicationsMeta} onChange={(page) => void loadApplications(page)} />
        </div>
      )}

      {tab === "afiliados" && (
        <div className="affseller-panel">
          <div className="affseller-panel-header"><div><h2>Mis afiliados</h2><p>Personas que actualmente promocionan tus productos.</p></div></div>
          {affiliatesError && <p className="affseller-error">{affiliatesError}</p>}
          {affiliatesLoading ? <div className="affseller-loading"><Loader2 className="affseller-spin" /> Cargando afiliados...</div> : affiliates.length === 0 ? <p className="affseller-empty">Todavía no tenés afiliados activos.</p> : (
            <div className="affseller-carnet-list">
              {affiliates.map((item) => item.buyer ? <BuyerCarnet key={item.applicationId} buyer={item.buyer} businessName={businessName} footer={<div className="affseller-affiliate-summary"><span>{item.productName || "Producto"}</span><strong>{formatMoney(item.totalCommissionPending)} pendiente</strong></div>} /> : null)}
            </div>
          )}
          <Pagination meta={affiliatesMeta} onChange={(page) => void loadAffiliates(page)} />
        </div>
      )}

      {tab === "pagos" && (
        <div className="affseller-panel">
          <div className="affseller-panel-header"><div><h2>Pagos a afiliados</h2><p>Seguimiento de comisiones pendientes y pagadas.</p></div></div>
          {payablesError && <p className="affseller-error">{payablesError}</p>}
          {payablesLoading ? <div className="affseller-loading"><Loader2 className="affseller-spin" /> Cargando pagos...</div> : !payables || payables.pendingSales.length === 0 ? <p className="affseller-empty">No hay comisiones pendientes de pago.</p> : (
            <div className="affseller-payables">
              <div className="affseller-summary-card"><span>Total pendiente</span><strong>{formatMoney(payables.totalToPay)}</strong></div>
              {payables.pendingSales.map((sale) => <div key={sale.saleId} className="affseller-payment-row"><div><strong>{sale.productName}</strong><span>{formatDate(sale.date)} · {daysLabel(sale.daysRemaining)}</span></div><strong>{formatMoney(sale.commissionAmount)}</strong></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
