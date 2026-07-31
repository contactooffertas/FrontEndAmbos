"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Plus,
  PackageOpen,
  Tag,
  MapPin,
  ArrowRight,
  LayoutList,
  Zap,
  ZapOff,
} from "lucide-react";
import MainLayout from "../componentes/MainLayout";
import ProductModal from "../componentes/ProductModal";
import { useAuth } from "../context/authContext";
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setFlashOffer,
  cancelFlashOffer,
  CATEGORIES,
  type Product,
} from "../lib/productService";
import "../styles/misproductos.css";

// ── Celda de precio (reutilizable) ──────────────────────────
// Si hay oferta flash vigente, esa es la que manda sobre el descuento normal.
function PriceDisplay({ product }: { product: Product }) {
  const { price, discount } = product;
  const flashActive = product.flashOffer?.active;
  const effectiveDiscount = flashActive ? product.flashOffer!.discount : discount;

  if (!effectiveDiscount || effectiveDiscount === 0) {
    return <span className="mp-price">${price.toLocaleString()}</span>;
  }

  const final = (price * (1 - effectiveDiscount / 100)).toFixed(2);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
      <span className="mp-price-final">${Number(final).toLocaleString()}</span>
      <span className="mp-price-original-strike">${price.toLocaleString()}</span>
      <span
        className="mp-discount-pill"
        style={flashActive ? { background: "#facc15", color: "#111" } : undefined}
      >
        -{effectiveDiscount}%
      </span>
    </span>
  );
}

// ── Badge de oferta flash con tiempo restante ───────────────
function formatRestante(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function FlashBadge({ product }: { product: Product }) {
  if (!product.flashOffer?.active) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        fontSize: "0.7rem",
        fontWeight: 700,
        color: "#b45309",
        background: "#fef3c7",
        padding: "2px 6px",
        borderRadius: "999px",
        marginTop: "2px",
      }}
    >
      <Zap size={11} /> Flash · {formatRestante(product.flashOfferSecondsLeft)} restantes
    </span>
  );
}

export default function MisProductosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      const data = await getMyProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (p: Product) => { setEditTarget(p); setModalOpen(true); };

  const handleSubmit = async (formData: FormData) => {
    const Swal = (await import("sweetalert2")).default;
    try {
      setSaving(true);

      const position: any = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000
        });
      }).catch((err) => {
        console.warn("No se pudo obtener la ubicación:", err);
        return null;
      });

      if (position) {
        formData.append("lat", position.coords.latitude.toString());
        formData.append("lng", position.coords.longitude.toString());
      } else if (!editTarget) {
        console.log("Creando producto sin coordenadas específicas.");
      }

      if (editTarget) {
        const updated = await updateProduct(editTarget._id, formData);
        setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      } else {
        const created = await createProduct(formData);
        setProducts((prev) => [created, ...prev]);
      }

      setModalOpen(false);
      Swal.fire({
        icon: "success",
        title: editTarget ? "Producto actualizado" : "¡Producto agregado!",
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: e.message || "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `"${product.name}" será eliminado permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });
    if (!isConfirmed) return;
    try {
      await deleteProduct(product._id);
      setProducts((prev) => prev.filter((p) => p._id !== product._id));
      Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: e.message || "Error al eliminar" });
    }
  };

  // ── Oferta Flash: activar / cancelar ───────────────────────
  const handleFlashOffer = async (product: Product) => {
    const Swal = (await import("sweetalert2")).default;

    if (product.flashOffer?.active) {
      const { isConfirmed } = await Swal.fire({
        title: "¿Cancelar oferta flash?",
        text: `"${product.name}" volverá a su precio normal.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Cancelar oferta",
        cancelButtonText: "Volver",
        confirmButtonColor: "#ef4444",
      });
      if (!isConfirmed) return;
      try {
        const updated = await cancelFlashOffer(product._id);
        setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
        Swal.fire({ icon: "success", title: "Oferta flash cancelada", timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
      } catch (e: any) {
        Swal.fire({ icon: "error", title: e.message || "Error al cancelar la oferta" });
      }
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: "Oferta flash ⚡",
      html: `
        <div style="text-align:left; display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
          <label style="font-size:0.85rem; font-weight:600;">
            Duración (1 a 24 horas)
            <input id="flash-hours" type="number" min="1" max="24" value="6"
              style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid #ddd; margin-top:4px;" />
          </label>
          <label style="font-size:0.85rem; font-weight:600;">
            Descuento (%)
            <input id="flash-discount" type="number" min="1" max="90" value="20"
              style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid #ddd; margin-top:4px;" />
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Activar oferta",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#f97316",
      preConfirm: () => {
        const hours = parseFloat((document.getElementById("flash-hours") as HTMLInputElement).value);
        const discount = parseFloat((document.getElementById("flash-discount") as HTMLInputElement).value);
        if (!hours || hours < 1 || hours > 24) {
          Swal.showValidationMessage("La duración debe ser entre 1 y 24 horas");
          return;
        }
        if (!discount || discount < 1 || discount > 90) {
          Swal.showValidationMessage("El descuento debe ser entre 1% y 90%");
          return;
        }
        return { hours, discount };
      },
    });

    if (!formValues) return;

    try {
      const updated = await setFlashOffer(product._id, formValues.hours, formValues.discount);
      setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      Swal.fire({
        icon: "success",
        title: `¡Oferta flash activada por ${formValues.hours}hs!`,
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: e.message || "Error al activar la oferta" });
    }
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label ?? value;

  if (loading || !user) return null;

  return (
    <MainLayout>
      <div className="mp-page">
        {/* ── Topbar ── */}
        <div className="mp-topbar">
          <div>
            <h1 className="mp-title">Mis Productos</h1>
            <p className="mp-subtitle">
              {products.length} producto{products.length !== 1 ? "s" : ""} publicado{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {products.length < 20 && (
              <button className="mp-btn-add" onClick={openCreate}>
                <Plus size={16} /> Nuevo producto
              </button>
            )}
            <button className="ng-btn-manage" onClick={() => router.push("/negocio")}>
              <LayoutList size={15} /> Mi negocio <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="mp-table-card">
          {fetching ? (
            <div className="mp-loading">
              <div className="mp-spinner" />
              <p>Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="mp-empty">
              <PackageOpen size={56} strokeWidth={1} className="mp-empty-icon" />
              <h3>Aún no tenés productos</h3>
              <p>Publicá tu primer producto y empezá a vender por cercanía.</p>
              <button className="mp-btn-add" style={{ marginTop: "1rem" }} onClick={openCreate}>
                <Plus size={16} /> Agregar producto
              </button>
            </div>
          ) : (
            <>
              {/* TABLA (Desktop) */}
              <div className="mp-table-wrap">
                <table className="mp-table">
                  <thead>
                    <tr>
                      <th>Imagen</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <img
                            src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=200&background=f97316&color=fff`}
                            alt={p.name}
                            className="mp-table-img"
                          />
                        </td>
                        <td>
                          <div className="mp-product-name">{p.name}</div>
                          <div className="mp-product-desc">
                            {p.deliveryRadius ? (
                              <span style={{ fontSize: '0.7rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <MapPin size={10}/> Radio: {p.deliveryRadius}km
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#666' }}>Alcance: Nacional</span>
                            )}
                          </div>
                          <FlashBadge product={p} />
                        </td>
                        <td><span className="mp-badge">{getCategoryLabel(p.category)}</span></td>
                        <td><PriceDisplay product={p} /></td>
                        <td>
                          <span className={`mp-stock ${(p.stock || 0) < 5 ? "low" : "ok"}`}>
                            {p.stock ?? "—"}
                          </span>
                        </td>
                        <td>
                          <div className="mp-actions">
                            <button
                              className="mp-action-btn"
                              title={p.flashOffer?.active ? "Cancelar oferta flash" : "Activar oferta flash"}
                              style={p.flashOffer?.active ? { color: "#f59e0b" } : undefined}
                              onClick={() => handleFlashOffer(p)}
                            >
                              {p.flashOffer?.active ? <ZapOff size={15} /> : <Zap size={15} />}
                            </button>
                            <button className="mp-action-btn" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                            <button className="mp-action-btn danger" onClick={() => handleDelete(p)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CARDS (Mobile) */}
              <div className="mp-mobile-list">
                {products.map((p) => (
                  <div key={p._id} className="mp-card-item">
                    <img
                       src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=200&background=f97316&color=fff`}
                       alt={p.name}
                       className="mp-card-img"
                    />
                    <div className="mp-card-body">
                      <div className="mp-card-name">{p.name}</div>
                      <FlashBadge product={p} />
                      <div className="mp-card-meta">
                        <PriceDisplay product={p} />
                      </div>
                      <div className="mp-card-meta">
                         <span className="mp-badge">{getCategoryLabel(p.category)}</span>
                         {p.deliveryRadius > 0 && (
                            <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#f97316' }}>
                               <MapPin size={12}/> {p.deliveryRadius}km
                            </span>
                         )}
                      </div>
                      <div className="mp-card-actions">
                        <button
                          className="mp-action-btn"
                          title={p.flashOffer?.active ? "Cancelar oferta flash" : "Activar oferta flash"}
                          style={p.flashOffer?.active ? { color: "#f59e0b" } : undefined}
                          onClick={() => handleFlashOffer(p)}
                        >
                          {p.flashOffer?.active ? <ZapOff size={15} /> : <Zap size={15} />}
                        </button>
                        <button className="mp-action-btn" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                        <button className="mp-action-btn danger" onClick={() => handleDelete(p)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
        loading={saving}
      />
    </MainLayout>
  );
}
