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

// El backend ya calcula dueDate/daysRemaining siempre a partir del ciclo de
// pago del vendedor, así que estos valores nunca deberían llegar en null;
// se dejan como nullable únicamente por seguridad ante datos muy viejos.
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

/** Card de perfil propio del vendedor, editable in-place.
 *  Avisa al padre (onPaymentTermChange) el ciclo de pago elegido, aunque
 *  ahora el cálculo real de vencimientos lo hace siempre el backend. */
function ProfileEditCard({
  onPaymentTermChange,
}: {
  onPaymentTermChange?: (days: 15 | 30) => void;
}): JSX.Element {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [draft, setDraft] = useState<SellerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const notifyTerm = useCallback(
    (value: number) => {
      const normalized: 15 | 30 = value === 15 ? 15 : 30;
      onPaymentTermChange?.(normalized);
    },
    [onPaymentTermChange]
  );

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

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
    return (
      <div className="affseller-profile-card">
        <div className="affseller-loading"><Loader2 size={18} className="affseller-spin" /> Cargando tu perfil...</div>
      </div>
    );
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
          <button type="button" className="affseller-edit-btn" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Editar
          </button>
        ) : (
          <div className="affseller-profile-actions">
            <button type="button" className="affseller-cancel-btn" disabled={saving} onClick={handleCancel}>
              <X size={14} /> Cancelar
            </button>
            <button type="button" className="affseller-save-btn" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 size={14} className="affseller-spin" /> : <Save size={14} />} Guardar
            </button>
          </div>
        )}
      </div>

      {error && <p className="affseller-error">{error}</p>}

      <div className="affseller-profile-grid">
        <label>
          <span>Nombre del negocio</span>
          <input value={draft.businessName} disabled={!editing} onChange={(e) => handleField("businessName", e.target.value)} />
        </label>
        <label>
          <span>Nombre de contacto</span>
          <input value={draft.contactName} disabled={!editing} onChange={(e) => handleField("contactName", e.target.value)} />
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
          <span>Comisión por defecto (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.defaultPercentage}
            disabled={!editing}
            onChange={(e) => handleField("defaultPercentage", e.target.value)}
          />
        </label>
        <label>
          <span>Máximo de afiliados</span>
          <input
            type="number"
            min={1}
            value={draft.maxAffiliates}
            disabled={!editing}
            onChange={(e) => handleField("maxAffiliates", e.target.value)}
          />
        </label>
        <label>
          <span>Ciclo de pago a afiliados</span>
          <select
            value={String(draft.paymentTermDays ?? 30)}
            disabled={!editing}
            onChange={(e) => handleTermChange(e.target.value)}
          >
            <option value="15">Cada 15 días</option>
            <option value="30">Cada 30 días</option>
          </select>
          <small className="affseller-field-hint">
            Se aplica a las ventas nuevas a partir de que guardes este cambio.
          </small>
        </label>
        <label className="affseller-profile-grid-full">
          <span>Descripción</span>
          <input value={draft.description} disabled={!editing} onChange={(e) => handleField("description", e.target.value)} />
        </label>
      </div>
    </div>
  );
}

export default function SellerDashboard({ businessName }: SellerDashboardProps): JSX.Element {
  const [tab, setTab] = useState<TabKey>("ofertas");

  // Se conserva solo para mostrar la etiqueta del ciclo elegido en el perfil;
  // el cálculo real de vencimientos ahora lo hace siempre el backend.
  const [, setPaymentTermDays] = useState<15 | 30>(30);

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

  // --- Tab: Pagos (cuánto tenés que pagarle a cada afiliado) ---
  const [payables, setPayables] = useState<PayablesSummary | null>(null);
  const [payablesLoading, setPayablesLoading] = useState(false);
  const [payablesError, setPayablesError] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [updatingProofId, setUpdatingProofId] = useState<string | null>(null);
  const alertShownRef = useRef(false);

  const loadPayables = useCallback(async () => {
    setPayablesLoading(true);
    setPayablesError("");
    try {
      const data = await authFetch<PayablesSummary>("/resumen");
      setPayables(data);
    } catch (err) {
      setPayablesError(errorMessage(err));
    } finally {
      setPayablesLoading(false);
    }
  }, []);

  // Se carga siempre al montar (no solo al entrar a la pestaña) para poder
  // disparar la alerta de vencimiento apenas el vendedor entra al panel.
  useEffect(() => {
    void loadPayables();
  }, [loadPayables]);

  useEffect(() => {
    if (!payables || alertShownRef.current) return;
    if (payables.urgentSales.length === 0) return;
    alertShownRef.current = true;

    const totalUrgent = payables.urgentSales.reduce((sum, s) => sum + s.commissionAmount, 0);
    const soonest = payables.urgentSales[0];
    const affiliateName = soonest.affiliate ? `${soonest.affiliate.firstName} ${soonest.affiliate.lastName}` : "un afiliado";

    void Swal.fire({
      icon: "warning",
      title: "Tenés un pago por vencer",
      html: `
        <p>Tenés que pagar <strong>${formatMoney(totalUrgent)}</strong> a tus afiliados.</p>
        <p>${daysLabel(soonest.daysRemaining)} el pago a <strong>${affiliateName}</strong> por <strong>${soonest.productName}</strong> (${formatMoney(soonest.commissionAmount)}).</p>
      `,
      confirmButtonText: "Ver pagos pendientes",
      confirmButtonColor: "#6d28d9",
    }).then((result) => {
      if (result.isConfirmed) setTab("pagos");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payables]);

  // NUEVO: click directo → marca pagado sin pedir comprobante. El link de
  // comprobante se sigue pudiendo cargar después desde "Ver / cambiar
  // comprobante" en el historial de pagos, así que no se pierde la función,
  // solo se saca del paso obligatorio para marcar como pagado.
  const handleMarkPaid = async (saleId: string) => {
    setPayingId(saleId);
    setPayablesError("");
    try {
      await authFetch(`/sales/${saleId}/pay`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await loadPayables();
      await loadAffiliates(affiliatesMeta.page);
    } catch (err) {
      setPayablesError(errorMessage(err));
    } finally {
      setPayingId(null);
    }
  };

  const handleUpdateProof = async (saleId: string, currentProofUrl: string | null) => {
    const { value: proofUrl, isDismissed } = await Swal.fire({
      title: "Comprobante de pago",
      input: "url",
      inputLabel: "Link del comprobante",
      inputValue: currentProofUrl || "",
      inputPlaceholder: "https://...",
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#6d28d9",
    });
    if (isDismissed || !proofUrl) return;

    setUpdatingProofId(saleId);
    setPayablesError("");
    try {
      await authFetch(`/sales/${saleId}/proof`, {
        method: "PATCH",
        body: JSON.stringify({ proofUrl }),
      });
      await loadPayables();
    } catch (err) {
      setPayablesError(errorMessage(err));
    } finally {
      setUpdatingProofId(null);
    }
  };

  return (
    <div className="affseller-dashboard">
      <ProfileEditCard onPaymentTermChange={setPaymentTermDays} />

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
        <button
          type="button"
          className={`affseller-tab ${tab === "pagos" ? "affseller-tab-active" : ""}`}
          onClick={() => setTab("pagos")}
        >
          <Wallet size={15} /> Pagos
          {payables && (payables.urgentSales.length > 0 || payables.disputedSales.length > 0) && (
            <span className="affseller-tab-dot" />
          )}
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
                          <div className="affseller-amount-box">
                            <p className="affseller-amount-line">
                              <span>Monto total vendido</span>
                              <strong className="affseller-amount-value">{formatMoney(item.totalSalesAmount)}</strong>
                            </p>
                            <p className="affseller-amount-line">
                              <span>Comisión devengada</span>
                              <strong className="affseller-amount-value affseller-amount-positive">
                                {formatMoney(item.totalCommissionOwed)}
                              </strong>
                            </p>
                            {item.totalCommissionPending > 0 && (
                              <p className="affseller-amount-line">
                                <span>Le falta pagar</span>
                                <strong className="affseller-amount-value affseller-amount-pending">
                                  {formatMoney(item.totalCommissionPending)}
                                </strong>
                              </p>
                            )}
                          </div>
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

      {tab === "pagos" && (
        <div className="affseller-panel">
          {payablesError && <p className="affseller-error">{payablesError}</p>}

          {payablesLoading && !payables ? (
            <div className="affseller-loading">
              <Loader2 size={18} className="affseller-spin" /> Cargando tus pagos pendientes...
            </div>
          ) : payables ? (
            <>
              <div className="affseller-payables-summary">
                <div className="affseller-payables-card affseller-payables-card-pending">
                  <p className="affseller-payables-label">Tenés que pagar</p>
                  <p className="affseller-payables-value">{formatMoney(payables.totalToPay)}</p>
                </div>
                <div className="affseller-payables-card">
                  <p className="affseller-payables-label">Ya pagado (histórico)</p>
                  <p className="affseller-payables-value">{formatMoney(payables.totalPaidHistoric)}</p>
                </div>
              </div>

              {payables.disputedSales.length > 0 && (
                <div className="affseller-dispute-banner">
                  <AlertTriangle size={18} />
                  <div>
                    <p className="affseller-dispute-title">
                      {payables.disputedSales.length === 1
                        ? "Un afiliado rechazó un pago"
                        : `${payables.disputedSales.length} afiliados rechazaron un pago`}
                    </p>
                    <p className="affseller-dispute-sub">
                      Revisá el detalle abajo, coordiná el pago por fuera de la plataforma y volvé a marcarlo como pagado.
                    </p>
                  </div>
                </div>
              )}

              {payables.byAffiliate.length === 0 ? (
                <p className="affseller-empty">No tenés pagos pendientes a afiliados.</p>
              ) : (
                <div className="affseller-payables-groups">
                  {payables.byAffiliate.map((group) => (
                    <div key={group.affiliate?.userId ?? Math.random()} className="affseller-payables-group">
                      <div className="affseller-payables-group-header">
                        <div>
                          <p className="affseller-payables-group-name">
                            {group.affiliate ? `${group.affiliate.firstName} ${group.affiliate.lastName}` : "Afiliado"}
                          </p>
                          <p className="affseller-payables-group-sub">
                            {group.affiliate?.email} · {group.affiliate?.phone}
                          </p>
                        </div>
                        <p className="affseller-payables-group-total">{formatMoney(group.totalPending)}</p>
                      </div>

                      <div className="affseller-sales-list">
                        {group.sales.map((sale) => (
                          <div
                            key={sale.saleId}
                            className={`affseller-sale-row ${sale.daysRemaining <= 5 ? "affseller-sale-row-urgent" : ""} ${
                              sale.paymentDisputed ? "affseller-sale-row-disputed" : ""
                            }`}
                          >
                            <div>
                              <p className="affseller-sale-product">{sale.productName}</p>
                              <p className="affseller-sale-date">{formatDate(sale.date)}</p>
                              {sale.paymentDisputed && (
                                <p className="affseller-dispute-reason">
                                  <AlertTriangle size={13} /> El afiliado dice que no cobró: &quot;{sale.disputeReason}&quot;
                                </p>
                              )}
                            </div>
                            <div className="affseller-sale-amounts">
                              <p className="affseller-sale-total">Venta: {formatMoney(sale.totalAmount)}</p>
                              <p className="affseller-sale-commission">A pagar: {formatMoney(sale.commissionAmount)}</p>
                            </div>
                            <div className="affseller-sale-due">
                              <span className={`affseller-due-badge ${sale.daysRemaining <= 5 ? "affseller-due-badge-urgent" : ""}`}>
                                {daysLabel(sale.daysRemaining)}
                              </span>
                              <span className="affseller-due-date">Vence: {formatDate(sale.dueDate)}</span>
                            </div>
                            <button
                              type="button"
                              className="affseller-pay-btn"
                              disabled={payingId === sale.saleId}
                              onClick={() => void handleMarkPaid(sale.saleId)}
                            >
                              {payingId === sale.saleId ? (
                                <Loader2 size={14} className="affseller-spin" />
                              ) : (
                                <DollarSign size={14} />
                              )}
                              Marcar pagado
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="affseller-history-section">
                <p className="affseller-history-title">
                  <History size={16} /> Historial de pagos realizados
                </p>
                {payables.paidSales.length === 0 ? (
                  <p className="affseller-empty">Todavía no le pagaste a ningún afiliado.</p>
                ) : (
                  <div className="affseller-sales-list">
                    {payables.paidSales.map((sale) => (
                      <div key={sale.saleId} className="affseller-sale-row affseller-sale-row-paid">
                        <div>
                          <p className="affseller-sale-product">{sale.productName}</p>
                          <p className="affseller-sale-date">
                            {sale.affiliate ? `${sale.affiliate.firstName} ${sale.affiliate.lastName} · ` : ""}
                            Vendido: {formatDate(sale.date)}
                          </p>
                        </div>
                        <div className="affseller-sale-amounts">
                          <p className="affseller-sale-total">Venta: {formatMoney(sale.totalAmount)}</p>
                          <p className="affseller-sale-commission">Pagado: {formatMoney(sale.commissionAmount)}</p>
                        </div>
                        <div className="affseller-sale-due">
                          <span className="affseller-due-badge affseller-due-badge-paid">Pagado</span>
                          <span className="affseller-due-date">El {formatDate(sale.paidAt)}</span>
                        </div>
                        <button
                          type="button"
                          className="affseller-proof-btn"
                          disabled={updatingProofId === sale.saleId}
                          onClick={() => void handleUpdateProof(sale.saleId, sale.proofUrl)}
                        >
                          {updatingProofId === sale.saleId ? (
                            <Loader2 size={14} className="affseller-spin" />
                          ) : (
                            <FileText size={14} />
                          )}
                          {sale.proofUrl ? "Ver / cambiar comprobante" : "Agregar comprobante"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
