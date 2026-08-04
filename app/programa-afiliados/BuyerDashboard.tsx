"use client";
// app/programa-afiliados/BuyerDashboard.tsx

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import {
  Package, Send, Clock, CheckCircle2, Search,
  MessageCircle, Copy, Loader2, ChevronLeft, ChevronRight, Check, Star,
  Wallet, Pencil, X, Save, FileText, XOctagon, History, Store, Sparkles,
  Users, ArrowLeft, Percent, Download, Boxes,
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

function daysLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return `Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) === 1 ? "" : "s"}`;
  if (daysRemaining === 0) return "Vence hoy";
  return `Vence en ${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`;
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Solicitud enviada",
  accepted: "Ya sos afiliado",
  rejected: "Rechazada",
  blocked: "Bloqueado",
};

/* ============================ Tipos ============================ */

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
  paymentTermDays?: number | null;
}

interface ProductBasic {
  productId: string;
  name: string;
  image: string | null;
  price: number;
  /** Unidades disponibles. Solo se muestra al comprador si está afiliado a ese producto puntual. */
  stock?: number;
}

type ApplicationStatus = "pending" | "accepted" | "rejected" | "blocked";
type StoreSubTab = "todas" | "nuevas" | "mis-tiendas";
type MainTab = "tiendas" | "solicitudes" | "mis-ofertas" | "ganancias";

/** Card de tienda en la vitrina (tab Tiendas) */
interface StoreCard {
  sellerId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  description: string;
  category: string;
  offerCount: number;
  commissionMin: number;
  commissionMax: number;
  joinedAt: string;
}

/** Producto dentro del detalle de una tienda */
interface StoreProductItem {
  offerId: string;
  commissionPercentage: number;
  product: ProductBasic & { category: string };
  applicationStatus: ApplicationStatus | null;
}

interface StoreDetail {
  sellerId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  description: string;
  paymentTermDays: number;
}

/** Solicitud individual (dentro de un grupo de tienda) */
interface AppItem {
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
  product: ProductBasic | null;
  affiliateLink: string | null;
}

/** Grupo por tienda para "Mis Solicitudes" / "Mis Ofertas" */
interface StoreApplicationsGroup {
  sellerId: string;
  seller: SellerCardData | null;
  latestAppliedAt: string;
  applications: AppItem[];
  totalSalesAmount: number;
  totalEarnedCommission: number;
  totalPendingCommission: number;
}

interface PendingSaleItem {
  saleId: string;
  productName: string;
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
  date: string;
  paidAt: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  commissionAmount: number;
  proofUrl: string | null;
}

interface UrgentSaleItem extends PendingSaleItem {
  seller: SellerCardData | null;
}

/** Grupo por tienda para "Ganancias" */
interface StoreEarningsGroup {
  sellerId: string;
  seller: SellerCardData | null;
  totalEarned: number;
  totalPending: number;
  totalCollected: number;
  pendingSales: PendingSaleItem[];
  paidSales: PaidSaleItem[];
}

interface EarningsSummary {
  totalEarned: number;
  totalPending: number;
  totalCollected: number;
  stores: StoreEarningsGroup[];
  urgentSales: UrgentSaleItem[];
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

interface BuyerDashboardProps {
  buyerName: string;
}

/* ============================ Generación de PDF ============================ */

/**
 * Genera un catálogo PDF profesional para una tienda.
 * Reglas de stock: si el comprador está afiliado (applicationStatus === "accepted")
 * al producto puntual, se muestra el stock real. Si no está afiliado a ESE producto,
 * se muestra "Sin stock" independientemente del stock real, para no exponer
 * disponibilidad a quien todavía no tiene la oferta aceptada.
 */
function generateStoreCatalogPdf(store: StoreDetail, items: StoreProductItem[]): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // --- Encabezado ---
  doc.setFillColor(17, 24, 39); // #111827
  doc.rect(0, 0, pageWidth, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(store.businessName, marginX, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(store.contactName, marginX, 57);
  doc.text(`${store.email}   •   ${store.phone}`, marginX, 72);

  const generatedAt = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFontSize(9);
  doc.text("CATÁLOGO DE PRODUCTOS", pageWidth - marginX, 38, { align: "right" });
  doc.text(`Generado el ${generatedAt}`, pageWidth - marginX, 54, { align: "right" });
  doc.text(`Plazo de pago: ${store.paymentTermDays} días`, pageWidth - marginX, 69, { align: "right" });

  // --- Resumen ---
  const affiliatedCount = items.filter((i) => i.applicationStatus === "accepted").length;
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `${items.length} producto${items.length === 1 ? "" : "s"} en catálogo  •  ${affiliatedCount} con afiliación activa`,
    marginX,
    118
  );

  // --- Tabla ---
  const rows = items.map((item) => {
    const isAffiliated = item.applicationStatus === "accepted";
    const stockLabel = isAffiliated
      ? typeof item.product.stock === "number"
        ? `${item.product.stock} unidades`
        : "Consultar"
      : "Sin stock";
    const statusLabel = item.applicationStatus ? STATUS_LABEL[item.applicationStatus] : "No afiliado";
    const commissionLabel = `${item.commissionPercentage}%`;
    return [item.product.name, item.product.category, commissionLabel, stockLabel, statusLabel];
  });

  autoTable(doc, {
    startY: 130,
    head: [["Producto", "Categoría", "Comisión", "Stock", "Estado"]],
    body: rows,
    theme: "striped",
    styles: {
      font: "helvetica",
      cellPadding: 8,
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      halign: "left",
    },
    bodyStyles: { fontSize: 9.5, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 60 },
      3: { halign: "center", cellWidth: 78 },
      4: { halign: "center", cellWidth: 92 },
    },
    margin: { left: marginX, right: marginX },
    didParseCell: (data: CellHookData) => {
      if (data.section !== "body") return;

      if (data.column.index === 3) {
        const text = String(data.cell.raw);
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = text === "Sin stock" ? [185, 28, 28] : [5, 150, 105];
      }

      if (data.column.index === 4) {
        const text = String(data.cell.raw);
        data.cell.styles.fontStyle = "bold";
        if (text === STATUS_LABEL.accepted) data.cell.styles.textColor = [5, 150, 105];
        else if (text === STATUS_LABEL.pending) data.cell.styles.textColor = [180, 83, 9];
        else if (text === "No afiliado") data.cell.styles.textColor = [107, 114, 128];
        else data.cell.styles.textColor = [185, 28, 28];
      }
    },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 22,
        { align: "right" }
      );
      doc.text("Programa de Afiliados", marginX, pageHeight - 22);
      doc.setDrawColor(229, 231, 235);
      doc.line(marginX, pageHeight - 32, pageWidth - marginX, pageHeight - 32);
    },
  });

  const fileSafeName = store.businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  doc.save(`catalogo-${fileSafeName || "tienda"}.pdf`);
}

/* ============================ Componentes chicos ============================ */

function Pagination({ meta, onChange }: { meta: PaginationMeta; onChange: (page: number) => void }): JSX.Element {
  if (meta.totalPages <= 1) return <></>;
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

function StatusBadge({ status }: { status: ApplicationStatus }): JSX.Element {
  return <span className={`affbuyer-status-badge affbuyer-status-${status}`}>{STATUS_LABEL[status]}</span>;
}

function StockBadge({ item }: { item: StoreProductItem }): JSX.Element {
  const isAffiliated = item.applicationStatus === "accepted";
  if (!isAffiliated) {
    return (
      <span className="affbuyer-stock-badge affbuyer-stock-badge-none">
        <Boxes size={12} /> Sin stock
      </span>
    );
  }
  const label = typeof item.product.stock === "number" ? `${item.product.stock} disp.` : "Consultar";
  return (
    <span className="affbuyer-stock-badge affbuyer-stock-badge-available">
      <Boxes size={12} /> {label}
    </span>
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
      <a
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

/* ============================ Vitrina de tiendas ============================ */

function StoreListCard({ store, onView }: { store: StoreCard; onView: (sellerId: string) => void }): JSX.Element {
  const initial = store.businessName?.[0]?.toUpperCase() ?? "?";
  const commissionLabel =
    store.commissionMin === store.commissionMax
      ? `${store.commissionMin}%`
      : `${store.commissionMin}% - ${store.commissionMax}%`;

  return (
    <div className="affbuyer-store-card">
      <div className="affbuyer-store-card-header">
        <div className="affbuyer-carnet-avatar">{initial}</div>
        <div>
          <p className="affbuyer-carnet-name">{store.businessName}</p>
          <p className="affbuyer-carnet-contact">{store.contactName}</p>
        </div>
      </div>

      <span className="affbuyer-category-badge">{store.category}</span>

      {store.description && <p className="affbuyer-carnet-description">{store.description}</p>}

      <div className="affbuyer-store-stats">
        <div className="affbuyer-store-stat">
          <Percent size={13} />
          <span>{commissionLabel}</span>
        </div>
        <div className="affbuyer-store-stat">
          <Package size={13} />
          <span>{store.offerCount} producto{store.offerCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <button type="button" className="affbuyer-view-store-btn" onClick={() => onView(store.sellerId)}>
        <Store size={14} /> Ver tienda
      </button>
    </div>
  );
}

/* ============================ Componente principal ============================ */

export default function BuyerDashboard({ buyerName }: BuyerDashboardProps): JSX.Element {
  const [tab, setTab] = useState<MainTab>("tiendas");

  /* --- Tab: Tiendas (vitrina, 3 en 3) --- */
  const [storeSubTab, setStoreSubTab] = useState<StoreSubTab>("todas");
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [storesMeta, setStoresMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 3 });
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState("");
  const [storesSearch, setStoresSearch] = useState("");

  const loadStores = useCallback(async (page: number, subTab: StoreSubTab, searchTerm: string) => {
    setStoresLoading(true);
    setStoresError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "3", tab: subTab });
      if (searchTerm) query.set("search", searchTerm);
      const data = await authFetch<{ items: StoreCard[] } & PaginationMeta>(`/stores?${query.toString()}`);
      setStores(data.items);
      setStoresMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setStoresError(errorMessage(err));
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "tiendas") return;
    const timeout = setTimeout(() => void loadStores(1, storeSubTab, storesSearch), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, storeSubTab, storesSearch]);

  /* --- Detalle de una tienda (productos para aplicar) --- */
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [storeDetail, setStoreDetail] = useState<StoreDetail | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProductItem[]>([]);
  const [productsMeta, setProductsMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 5 });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productsSearch, setProductsSearch] = useState("");
  const [applyingOfferId, setApplyingOfferId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadStoreProducts = useCallback(async (sellerId: string, page: number, searchTerm: string) => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "5" });
      if (searchTerm) query.set("search", searchTerm);
      const data = await authFetch<{ items: StoreProductItem[]; store: StoreDetail } & PaginationMeta>(
        `/stores/${sellerId}/products?${query.toString()}`
      );
      setStoreProducts(data.items);
      setStoreDetail(data.store);
      setProductsMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setProductsError(errorMessage(err));
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const handleViewStore = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setProductsSearch("");
    void loadStoreProducts(sellerId, 1, "");
  };

  const handleBackToStores = () => {
    setSelectedSellerId(null);
    setStoreDetail(null);
    setStoreProducts([]);
  };

  useEffect(() => {
    if (!selectedSellerId) return;
    const timeout = setTimeout(() => void loadStoreProducts(selectedSellerId, 1, productsSearch), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsSearch]);

  const handleApply = async (offerId: string) => {
    if (!selectedSellerId) return;
    setApplyingOfferId(offerId);
    setProductsError("");
    try {
      await authFetch(`/offers/${offerId}/apply`, { method: "POST" });
      await loadStoreProducts(selectedSellerId, productsMeta.page, productsSearch);
    } catch (err) {
      setProductsError(errorMessage(err));
    } finally {
      setApplyingOfferId(null);
    }
  };

  /** Descarga un PDF con el catálogo completo de la tienda (todas las páginas, no solo la visible). */
  const handleDownloadCatalog = async () => {
    if (!selectedSellerId) return;
    setGeneratingPdf(true);
    setProductsError("");
    try {
      const query = new URLSearchParams({ page: "1", limit: "1000" });
      const data = await authFetch<{ items: StoreProductItem[]; store: StoreDetail }>(
        `/stores/${selectedSellerId}/products?${query.toString()}`
      );
      if (data.items.length === 0) {
        void Swal.fire({
          icon: "info",
          title: "Sin productos",
          text: "Esta tienda todavía no tiene productos para incluir en el catálogo.",
          confirmButtonColor: "#111827",
        });
        return;
      }
      generateStoreCatalogPdf(data.store, data.items);
    } catch (err) {
      setProductsError(errorMessage(err));
    } finally {
      setGeneratingPdf(false);
    }
  };

  /* --- Tabs: Mis Solicitudes (pending) y Mis Ofertas (accepted), agrupadas por tienda --- */
  const [storeApps, setStoreApps] = useState<StoreApplicationsGroup[]>([]);
  const [appsMeta, setAppsMeta] = useState<PaginationMeta>({ page: 1, totalPages: 1, total: 0, limit: 3 });
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const statusForTab: ApplicationStatus = tab === "mis-ofertas" ? "accepted" : "pending";

  const loadApplications = useCallback(async (page: number, status: ApplicationStatus) => {
    setAppsLoading(true);
    setAppsError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "3", status });
      const data = await authFetch<{ items: StoreApplicationsGroup[] } & PaginationMeta>(`/mis-ofertas?${query.toString()}`);
      setStoreApps(data.items);
      setAppsMeta({ page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit });
    } catch (err) {
      setAppsError(errorMessage(err));
    } finally {
      setAppsLoading(false);
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

  /* --- Tab: Ganancias, agrupada por tienda --- */
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
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

  useEffect(() => {
    void loadEarnings();
  }, [loadEarnings]);

  useEffect(() => {
    if (!earnings || alertShownRef.current) return;
    if (earnings.urgentSales.length === 0) return;
    alertShownRef.current = true;

    const totalUrgent = earnings.urgentSales.reduce((sum, s) => sum + s.commissionAmount, 0);
    const soonest = earnings.urgentSales[0];

    void Swal.fire({
      icon: "info",
      title: "Tenés un cobro por vencer",
      html: `
        <p>Tenés <strong>${formatMoney(totalUrgent)}</strong> por cobrar de tus últimas ventas.</p>
        <p>${daysLabel(soonest.daysRemaining)} el pago de <strong>${soonest.productName}</strong>
        (${formatMoney(soonest.commissionAmount)}) en <strong>${soonest.seller?.businessName ?? "una tienda"}</strong>.</p>
      `,
      confirmButtonText: "Ver mis ganancias",
      confirmButtonColor: "#111827",
    }).then((result) => {
      if (result.isConfirmed) setTab("ganancias");
    });
  }, [earnings]);

  const handleRejectPayment = async (saleId: string) => {
    const { value: reason, isDismissed } = await Swal.fire({
      title: "¿No recibiste este pago?",
      html: "Recordá que los pagos se hacen por fuera de la plataforma. Si el vendedor lo marcó como pagado pero no lo cobraste, contanos brevemente qué pasó.",
      input: "text",
      inputLabel: "Motivo",
      inputPlaceholder: "Ej: nunca recibí la transferencia",
      showCancelButton: true,
      confirmButtonText: "Rechazar pago",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      inputValidator: (value) => (!value ? "Contanos brevemente el motivo" : undefined),
    });
    if (isDismissed || !reason) return;

    setRejectingId(saleId);
    setEarningsError("");
    try {
      await authFetch(`/sales/${saleId}/reject-payment`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      await loadEarnings();
    } catch (err) {
      setEarningsError(errorMessage(err));
    } finally {
      setRejectingId(null);
    }
  };

  /* ============================ Render ============================ */

  return (
    <div className="affbuyer-dashboard">
      <ProfileEditCard />

      <div className="affbuyer-tabs">
        <button
          type="button"
          className={`affbuyer-tab ${tab === "tiendas" ? "affbuyer-tab-active" : ""}`}
          onClick={() => { setTab("tiendas"); handleBackToStores(); }}
        >
          <Store size={15} /> Tiendas
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

      {/* ---------- TAB TIENDAS ---------- */}
      {tab === "tiendas" && !selectedSellerId && (
        <div className="affbuyer-panel">
          <div className="affbuyer-subtabs">
            <button
              type="button"
              className={`affbuyer-subtab ${storeSubTab === "todas" ? "affbuyer-subtab-active" : ""}`}
              onClick={() => setStoreSubTab("todas")}
            >
              <Store size={14} /> Todas
            </button>
            <button
              type="button"
              className={`affbuyer-subtab ${storeSubTab === "nuevas" ? "affbuyer-subtab-active" : ""}`}
              onClick={() => setStoreSubTab("nuevas")}
            >
              <Sparkles size={14} /> Nuevas
            </button>
            <button
              type="button"
              className={`affbuyer-subtab ${storeSubTab === "mis-tiendas" ? "affbuyer-subtab-active" : ""}`}
              onClick={() => setStoreSubTab("mis-tiendas")}
            >
              <Users size={14} /> Mis tiendas
            </button>
          </div>

          <div className="affbuyer-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar tienda por nombre..."
              value={storesSearch}
              onChange={(e) => setStoresSearch(e.target.value)}
            />
          </div>

          {storesError && <p className="affbuyer-error">{storesError}</p>}

          {storesLoading ? (
            <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando tiendas...</div>
          ) : stores.length === 0 ? (
            <p className="affbuyer-empty">
              {storeSubTab === "mis-tiendas"
                ? "Todavía no sos afiliado de ninguna tienda."
                : storeSubTab === "nuevas"
                  ? "No hay tiendas nuevas por el momento."
                  : "No encontramos tiendas disponibles."}
            </p>
          ) : (
            <div className="affbuyer-store-grid">
              {stores.map((store) => (
                <StoreListCard key={store.sellerId} store={store} onView={handleViewStore} />
              ))}
            </div>
          )}

          <Pagination meta={storesMeta} onChange={(page) => void loadStores(page, storeSubTab, storesSearch)} />
        </div>
      )}

      {/* ---------- DETALLE DE TIENDA ---------- */}
      {tab === "tiendas" && selectedSellerId && (
        <div className="affbuyer-panel">
          <button type="button" className="affbuyer-back-btn" onClick={handleBackToStores}>
            <ArrowLeft size={15} /> Volver a tiendas
          </button>

          {storeDetail && (
            <div className="affbuyer-store-detail-header">
              <div className="affbuyer-carnet-header">
                <div className="affbuyer-carnet-avatar">{storeDetail.businessName?.[0]?.toUpperCase() ?? "?"}</div>
                <div>
                  <p className="affbuyer-carnet-name">{storeDetail.businessName}</p>
                  <p className="affbuyer-carnet-contact">{storeDetail.contactName}</p>
                </div>
              </div>
              {storeDetail.description && <p className="affbuyer-carnet-description">{storeDetail.description}</p>}
              <div className="affbuyer-store-detail-info">
                <p><span>Email</span> {storeDetail.email}</p>
                <p><span>Teléfono</span> {storeDetail.phone}</p>
                <p><span>Plazo de pago</span> {storeDetail.paymentTermDays} días</p>
              </div>
              <a
                href={buildWhatsAppLink(storeDetail.phone, buyerName)}
                target="_blank"
                rel="noopener noreferrer"
                className="affbuyer-whatsapp-btn"
              >
                <MessageCircle size={15} /> Contactar por WhatsApp
              </a>
            </div>
          )}

          <div className="affbuyer-store-detail-toolbar">
            <div className="affbuyer-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={productsSearch}
                onChange={(e) => setProductsSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="affbuyer-download-btn"
              disabled={generatingPdf}
              onClick={() => void handleDownloadCatalog()}
              title="Descarga un PDF con todos los productos de esta tienda"
            >
              {generatingPdf ? <Loader2 size={14} className="affbuyer-spin" /> : <Download size={14} />}
              Descargar catálogo PDF
            </button>
          </div>

          {productsError && <p className="affbuyer-error">{productsError}</p>}

          {productsLoading ? (
            <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando productos...</div>
          ) : storeProducts.length === 0 ? (
            <p className="affbuyer-empty">Esta tienda no tiene productos en oferta.</p>
          ) : (
            <div className="affbuyer-offer-list">
              {storeProducts.map((offer) => (
                <div key={offer.offerId} className="affbuyer-offer-row">
                  <div className="affbuyer-offer-info">
                    {offer.product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={offer.product.image} alt={offer.product.name} className="affbuyer-offer-thumb" />
                    ) : (
                      <div className="affbuyer-offer-thumb affbuyer-offer-thumb-empty" />
                    )}
                    <div>
                      <p className="affbuyer-offer-name">
                        {offer.product.name}
                        {offer.applicationStatus === null && <span className="affbuyer-new-badge">Nuevo</span>}
                      </p>
                      <div className="affbuyer-offer-meta-row">
                        <p className="affbuyer-offer-commission">Comisión: {offer.commissionPercentage}%</p>
                        <StockBadge item={offer} />
                      </div>
                    </div>
                  </div>
                  {offer.applicationStatus === null ? (
                    <button
                      type="button"
                      className="affbuyer-apply-btn"
                      disabled={applyingOfferId === offer.offerId}
                      onClick={() => void handleApply(offer.offerId)}
                    >
                      {applyingOfferId === offer.offerId ? <Loader2 size={14} className="affbuyer-spin" /> : <Send size={14} />}
                      Aplicar
                    </button>
                  ) : (
                    <StatusBadge status={offer.applicationStatus} />
                  )}
                </div>
              ))}
            </div>
          )}

          <Pagination meta={productsMeta} onChange={(page) => void loadStoreProducts(selectedSellerId, page, productsSearch)} />
        </div>
      )}

      {/* ---------- MIS SOLICITUDES / MIS OFERTAS (agrupadas por tienda) ---------- */}
      {(tab === "solicitudes" || tab === "mis-ofertas") && (
        <div className="affbuyer-panel">
          {appsError && <p className="affbuyer-error">{appsError}</p>}

          {appsLoading ? (
            <div className="affbuyer-loading"><Loader2 size={18} className="affbuyer-spin" /> Cargando...</div>
          ) : storeApps.length === 0 ? (
            <p className="affbuyer-empty">
              {tab === "solicitudes" ? "No tenés solicitudes pendientes." : "Todavía no tenés tiendas con ofertas aceptadas."}
            </p>
          ) : (
            <div className="affbuyer-carnet-grid">
              {storeApps.map((group) =>
                group.seller ? (
                  <SellerCarnet
                    key={group.sellerId}
                    seller={group.seller}
                    buyerName={buyerName}
                    footer={
                      <div className="affbuyer-application-footer">
                        {tab === "mis-ofertas" && (
                          <div className="affbuyer-amount-box">
                            <p className="affbuyer-amount-line">
                              <span>Monto total vendido</span>
                              <strong className="affbuyer-amount-value">{formatMoney(group.totalSalesAmount)}</strong>
                            </p>
                            <p className="affbuyer-amount-line">
                              <span>Tu comisión ganada</span>
                              <strong className="affbuyer-amount-value affbuyer-amount-positive">
                                {formatMoney(group.totalEarnedCommission)}
                              </strong>
                            </p>
                            {group.totalPendingCommission > 0 && (
                              <p className="affbuyer-amount-line">
                                <span>Pendiente de cobro</span>
                                <strong className="affbuyer-amount-value affbuyer-amount-pending">
                                  {formatMoney(group.totalPendingCommission)}
                                </strong>
                              </p>
                            )}
                          </div>
                        )}

                        <div className="affbuyer-store-app-list">
                          {group.applications.map((application) => (
                            <div key={application.applicationId} className="affbuyer-store-app-item">
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
                                <StatusBadge status={application.status} />
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
                                    <><Copy size={14} /> Copiar link</>
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                  />
                ) : null
              )}
            </div>
          )}

          <Pagination meta={appsMeta} onChange={(page) => void loadApplications(page, statusForTab)} />
        </div>
      )}

      {/* ---------- GANANCIAS (agrupadas por tienda) ---------- */}
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

              {earnings.stores.length === 0 ? (
                <p className="affbuyer-empty">Todavía no tenés ventas registradas.</p>
              ) : (
                <div className="affbuyer-store-earnings-list">
                  {earnings.stores.map((group) =>
                    group.seller ? (
                      <div key={group.sellerId} className="affbuyer-store-earnings-block">
                        <div className="affbuyer-store-earnings-header">
                          <div className="affbuyer-carnet-header">
                            <div className="affbuyer-carnet-avatar">{group.seller.businessName?.[0]?.toUpperCase() ?? "?"}</div>
                            <div>
                              <p className="affbuyer-carnet-name">{group.seller.businessName}</p>
                              <p className="affbuyer-carnet-contact">{group.seller.contactName}</p>
                            </div>
                          </div>
                          <div className="affbuyer-store-earnings-totals">
                            <span>Pendiente: <strong>{formatMoney(group.totalPending)}</strong></span>
                            <span>Cobrado: <strong>{formatMoney(group.totalCollected)}</strong></span>
                          </div>
                        </div>

                        {group.pendingSales.length > 0 && (
                          <div className="affbuyer-sales-list">
                            {group.pendingSales.map((sale) => (
                              <div
                                key={sale.saleId}
                                className={`affbuyer-sale-row ${sale.daysRemaining <= 5 ? "affbuyer-sale-row-urgent" : ""} ${
                                  sale.paymentDisputed ? "affbuyer-sale-row-disputed" : ""
                                }`}
                              >
                                <div>
                                  <p className="affbuyer-sale-product">{sale.productName}</p>
                                  <p className="affbuyer-sale-seller">{formatDate(sale.date)}</p>
                                  {sale.paymentDisputed && (
                                    <p className="affbuyer-dispute-note">Ya avisaste que no cobraste este pago.</p>
                                  )}
                                </div>
                                <div className="affbuyer-sale-amounts">
                                  <p className="affbuyer-sale-total">Venta: {formatMoney(sale.totalAmount)}</p>
                                  <p className="affbuyer-sale-commission">A cobrar: {formatMoney(sale.commissionAmount)}</p>
                                </div>
                                <div className="affbuyer-sale-due">
                                  <span className={`affbuyer-due-badge ${sale.daysRemaining <= 5 ? "affbuyer-due-badge-urgent" : ""}`}>
                                    {daysLabel(sale.daysRemaining)}
                                  </span>
                                  <span className="affbuyer-due-date">Vence: {formatDate(sale.dueDate)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {group.paidSales.length > 0 && (
                          <details className="affbuyer-history-section">
                            <summary className="affbuyer-history-title">
                              <History size={16} /> Cobros recibidos ({group.paidSales.length})
                            </summary>
                            <div className="affbuyer-sales-list">
                              {group.paidSales.map((sale) => (
                                <div key={sale.saleId} className="affbuyer-sale-row affbuyer-sale-row-paid">
                                  <div>
                                    <p className="affbuyer-sale-product">{sale.productName}</p>
                                    <p className="affbuyer-sale-seller">Vendido: {formatDate(sale.date)}</p>
                                  </div>
                                  <div className="affbuyer-sale-amounts">
                                    <p className="affbuyer-sale-total">Venta: {formatMoney(sale.totalAmount)}</p>
                                    <p className="affbuyer-sale-commission">Cobrado: {formatMoney(sale.commissionAmount)}</p>
                                  </div>
                                  <div className="affbuyer-sale-due">
                                    <span className="affbuyer-due-badge affbuyer-due-badge-paid">Pagado</span>
                                    <span className="affbuyer-due-date">El {formatDate(sale.paidAt)}</span>
                                  </div>
                                  <div className="affbuyer-paid-actions">
                                    {sale.proofUrl && (
                                      <a href={sale.proofUrl} target="_blank" rel="noopener noreferrer" className="affbuyer-proof-link">
                                        <FileText size={14} /> Ver comprobante
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      className="affbuyer-reject-payment-btn"
                                      disabled={rejectingId === sale.saleId}
                                      onClick={() => void handleRejectPayment(sale.saleId)}
                                    >
                                      {rejectingId === sale.saleId ? (
                                        <Loader2 size={14} className="affbuyer-spin" />
                                      ) : (
                                        <XOctagon size={14} />
                                      )}
                                      No recibí este pago
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
