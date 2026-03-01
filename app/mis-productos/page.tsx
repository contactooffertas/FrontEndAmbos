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
  LayoutList 
} from "lucide-react";
import MainLayout from "../componentes/MainLayout";
import ProductModal from "../componentes/ProductModal";
import { useAuth } from "../context/authContext";
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  CATEGORIES,
  type Product,
} from "../lib/productService";
import "../styles/misproductos.css";

// ── Celda de precio (reutilizable) ──────────────────────────
function PriceDisplay({ price, discount }: { price: number; discount?: number }) {
  if (!discount || discount === 0) {
    return <span className="mp-price">${price.toLocaleString()}</span>;
  }
  const final = (price * (1 - discount / 100)).toFixed(2);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
      <span className="mp-price-final">${Number(final).toLocaleString()}</span>
      <span className="mp-price-original-strike">${price.toLocaleString()}</span>
      <span className="mp-discount-pill">-{discount}%</span>
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

      // --- LÓGICA DE GEOLOCALIZACIÓN ---
      // Obtenemos la ubicación actual del vendedor al momento de guardar
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
        // Si es un producto nuevo y no hay GPS, podrías alertar o dejarlo nacional
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
                        </td>
                        <td><span className="mp-badge">{getCategoryLabel(p.category)}</span></td>
                        <td><PriceDisplay price={p.price} discount={p.discount} /></td>
                        <td>
                          <span className={`mp-stock ${(p.stock || 0) < 5 ? "low" : "ok"}`}>
                            {p.stock ?? "—"}
                          </span>
                        </td>
                        <td>
                          <div className="mp-actions">
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
                      <div className="mp-card-meta">
                        <PriceDisplay price={p.price} discount={p.discount} />
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