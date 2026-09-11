"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ShieldAlert, Tag, Trash2, Pencil, Save, X } from "lucide-react";
import CategoryIcon from "./cateroryicon";

const API = "https://new-backend-lovat.vercel.app/api";

type Category = {
  _id: string;
  name: string;
  slug: string;
  iconName: string;
  active: boolean;
  order?: number;
};

type Keyword = {
  _id: string;
  keyword: string;
  category: string;
  source: "seed" | "product" | "admin";
  usageCount: number;
  active: boolean;
};

type Forbidden = {
  _id: string;
  term: string;
  exceptions?: string[];
  active: boolean;
  source: "seed" | "admin";
};

const ICON_OPTIONS = [
  "Monitor",
  "Shirt",
  "Home",
  "Dumbbell",
  "ShoppingBag",
  "Heart",
  "Car",
  "Gift",
  "BookOpen",
  "PawPrint",
  "Tag",
  "Package",
];

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "No se pudo completar la operación");
  return data;
}

export default function AdminSearchDictionary() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [forbidden, setForbidden] = useState<Forbidden[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [wordFilter, setWordFilter] = useState("");

  const [newCategory, setNewCategory] = useState({ name: "", slug: "", iconName: "Tag", keywords: "" });
  const [newKeyword, setNewKeyword] = useState({ keyword: "", category: "" });
  const [newForbidden, setNewForbidden] = useState({ term: "", exceptions: "" });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null);
  const [editingForbidden, setEditingForbidden] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/search-dictionary");
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setKeywords(Array.isArray(data.keywords) ? data.keywords : []);
      setForbidden(Array.isArray(data.forbidden) ? data.forbidden : []);
      if (!newKeyword.category && data.categories?.[0]?.slug) {
        setNewKeyword((prev) => ({ ...prev, category: data.categories[0].slug }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredKeywords = useMemo(() => {
    const q = wordFilter.trim().toLowerCase();
    return keywords.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (q && !item.keyword.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [keywords, categoryFilter, wordFilter]);

  const createCategory = async () => {
    if (!newCategory.name.trim()) return;
    await adminFetch("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: newCategory.name,
        slug: newCategory.slug,
        iconName: newCategory.iconName,
        keywords: newCategory.keywords
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    });
    setNewCategory({ name: "", slug: "", iconName: "Tag", keywords: "" });
    await load();
  };

  const updateCategory = async (category: Category) => {
    await adminFetch(`/categories/${category._id}`, {
      method: "PUT",
      body: JSON.stringify(category),
    });
    setEditingCategory(null);
    await load();
  };

  const disableCategory = async (id: string) => {
    await adminFetch(`/categories/${id}`, { method: "DELETE" });
    await load();
  };

  const createKeyword = async () => {
    if (!newKeyword.keyword.trim() || !newKeyword.category) return;
    await adminFetch("/search-dictionary/keywords", {
      method: "POST",
      body: JSON.stringify(newKeyword),
    });
    setNewKeyword((prev) => ({ ...prev, keyword: "" }));
    await load();
  };

  const updateKeyword = async (item: Keyword) => {
    await adminFetch(`/search-dictionary/keywords/${item._id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
    setEditingKeyword(null);
    await load();
  };

  const deleteKeyword = async (id: string) => {
    await adminFetch(`/search-dictionary/keywords/${id}`, { method: "DELETE" });
    await load();
  };

  const createForbidden = async () => {
    if (!newForbidden.term.trim()) return;
    await adminFetch("/search-dictionary/forbidden", {
      method: "POST",
      body: JSON.stringify({
        term: newForbidden.term,
        exceptions: newForbidden.exceptions
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    });
    setNewForbidden({ term: "", exceptions: "" });
    await load();
  };

  const updateForbidden = async (item: Forbidden) => {
    await adminFetch(`/search-dictionary/forbidden/${item._id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
    setEditingForbidden(null);
    await load();
  };

  const deleteForbidden = async (id: string) => {
    await adminFetch(`/search-dictionary/forbidden/${id}`, { method: "DELETE" });
    await load();
  };

  if (loading) {
    return <div style={{ padding: 24, color: "#94a3b8" }}>Cargando buscador inteligente...</div>;
  }

  const card: React.CSSProperties = {
    background: "var(--adm-surface, #111827)",
    border: "1px solid var(--adm-border2, rgba(255,255,255,.1))",
    borderRadius: 16,
    padding: 16,
  };

  const input: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--adm-border2, #334155)",
    background: "var(--adm-surface2, #0f172a)",
    color: "inherit",
    borderRadius: 9,
    padding: "9px 10px",
    fontSize: 13,
  };

  return (
    <div className="adm-content" style={{ display: "grid", gap: 16 }}>
      <div style={{ ...card, background: "linear-gradient(135deg,#111827,#172554)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Search size={21} color="#f97316" />
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Buscador inteligente</h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>
              Administrá categorías, palabras relacionadas y términos no permitidos. Las palabras nuevas de productos se incorporan automáticamente.
            </p>
          </div>
        </div>
      </div>

      <section style={card}>
        <h3 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 7 }}>
          <Tag size={17} color="#f97316" /> Categorías
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 14 }}>
          <input
            style={input}
            placeholder="Nombre"
            value={newCategory.name}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            style={input}
            placeholder="Slug opcional"
            value={newCategory.slug}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, slug: e.target.value }))}
          />
          <select
            style={input}
            value={newCategory.iconName}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, iconName: e.target.value }))}
          >
            {ICON_OPTIONS.map((icon) => (
              <option key={icon} value={icon}>{icon}</option>
            ))}
          </select>
          <input
            style={input}
            placeholder="Palabras iniciales: zapatilla, calzado..."
            value={newCategory.keywords}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, keywords: e.target.value }))}
          />
        </div>

        <button
          onClick={createCategory}
          style={{ border: 0, borderRadius: 9, padding: "9px 12px", background: "#f97316", color: "#fff", fontWeight: 800, cursor: "pointer" }}
        >
          <Plus size={14} style={{ verticalAlign: "middle", marginRight: 5 }} /> Agregar categoría
        </button>

        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {categories.map((category) => (
            <div key={category._id} style={{ display: "grid", gridTemplateColumns: "32px minmax(120px,1fr) minmax(110px,1fr) 130px auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 10, background: "rgba(255,255,255,.035)" }}>
              <CategoryIcon name={category.iconName} size={20} />
              {editingCategory === category._id ? (
                <>
                  <input style={input} value={category.name} onChange={(e) => setCategories((prev) => prev.map((item) => item._id === category._id ? { ...item, name: e.target.value } : item))} />
                  <input style={input} value={category.slug} onChange={(e) => setCategories((prev) => prev.map((item) => item._id === category._id ? { ...item, slug: e.target.value } : item))} />
                  <select style={input} value={category.iconName} onChange={(e) => setCategories((prev) => prev.map((item) => item._id === category._id ? { ...item, iconName: e.target.value } : item))}>
                    {ICON_OPTIONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <strong>{category.name}</strong>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{category.slug}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{category.iconName}</span>
                </>
              )}
              <div style={{ display: "flex", gap: 5 }}>
                {editingCategory === category._id ? (
                  <>
                    <button onClick={() => updateCategory(category)} title="Guardar"><Save size={14} /></button>
                    <button onClick={() => setEditingCategory(null)} title="Cancelar"><X size={14} /></button>
                  </>
                ) : (
                  <button onClick={() => setEditingCategory(category._id)} title="Editar"><Pencil size={14} /></button>
                )}
                <button onClick={() => disableCategory(category._id)} title="Desactivar"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h3 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 7 }}>
          <Search size={17} color="#f97316" /> Palabras clave
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 10 }}>
          <input style={input} placeholder="Nueva palabra o frase" value={newKeyword.keyword} onChange={(e) => setNewKeyword((prev) => ({ ...prev, keyword: e.target.value }))} />
          <select style={input} value={newKeyword.category} onChange={(e) => setNewKeyword((prev) => ({ ...prev, category: e.target.value }))}>
            {categories.filter((item) => item.active).map((item) => <option key={item._id} value={item.slug}>{item.name}</option>)}
          </select>
          <button onClick={createKeyword} style={{ border: 0, borderRadius: 9, background: "#f97316", color: "#fff", padding: "8px 12px", fontWeight: 800, cursor: "pointer" }}><Plus size={15} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <input style={input} placeholder="Filtrar palabras..." value={wordFilter} onChange={(e) => setWordFilter(e.target.value)} />
          <select style={input} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((item) => <option key={item._id} value={item.slug}>{item.name}</option>)}
          </select>
        </div>

        <div style={{ maxHeight: 380, overflowY: "auto", display: "grid", gap: 6 }}>
          {filteredKeywords.slice(0, 300).map((item) => (
            <div key={item._id} style={{ display: "grid", gridTemplateColumns: "minmax(150px,1fr) 130px 80px auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 9, background: "rgba(255,255,255,.03)" }}>
              {editingKeyword === item._id ? (
                <input style={input} value={item.keyword} onChange={(e) => setKeywords((prev) => prev.map((word) => word._id === item._id ? { ...word, keyword: e.target.value } : word))} />
              ) : <span style={{ fontWeight: 700 }}>{item.keyword}</span>}
              {editingKeyword === item._id ? (
                <select style={input} value={item.category} onChange={(e) => setKeywords((prev) => prev.map((word) => word._id === item._id ? { ...word, category: e.target.value } : word))}>
                  {categories.map((category) => <option key={category._id} value={category.slug}>{category.name}</option>)}
                </select>
              ) : <span style={{ color: "#94a3b8", fontSize: 11 }}>{item.category}</span>}
              <span style={{ color: "#64748b", fontSize: 10 }}>{item.source === "product" ? "aprendida" : item.source}</span>
              <div style={{ display: "flex", gap: 5 }}>
                {editingKeyword === item._id ? <button onClick={() => updateKeyword(item)}><Save size={13} /></button> : <button onClick={() => setEditingKeyword(item._id)}><Pencil size={13} /></button>}
                <button onClick={() => deleteKeyword(item._id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h3 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 7 }}>
          <ShieldAlert size={17} color="#ef4444" /> Palabras no permitidas
        </h3>
        <p style={{ margin: "0 0 12px", color: "#94a3b8", fontSize: 12 }}>
          Podés agregar excepciones separadas por coma. Ejemplo: “borracho” con excepción “palo borracho”.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginBottom: 12 }}>
          <input style={input} placeholder="Palabra" value={newForbidden.term} onChange={(e) => setNewForbidden((prev) => ({ ...prev, term: e.target.value }))} />
          <input style={input} placeholder="Excepciones separadas por coma" value={newForbidden.exceptions} onChange={(e) => setNewForbidden((prev) => ({ ...prev, exceptions: e.target.value }))} />
          <button onClick={createForbidden} style={{ border: 0, borderRadius: 9, background: "#ef4444", color: "#fff", padding: "8px 12px", fontWeight: 800, cursor: "pointer" }}><Plus size={15} /></button>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {forbidden.map((item) => (
            <div key={item._id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 9, background: "rgba(239,68,68,.06)" }}>
              {editingForbidden === item._id ? (
                <>
                  <input style={input} value={item.term} onChange={(e) => setForbidden((prev) => prev.map((word) => word._id === item._id ? { ...word, term: e.target.value } : word))} />
                  <input style={input} value={(item.exceptions || []).join(", ")} onChange={(e) => setForbidden((prev) => prev.map((word) => word._id === item._id ? { ...word, exceptions: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : word))} />
                </>
              ) : (
                <>
                  <strong>{item.term}</strong>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{item.exceptions?.length ? `Excepto: ${item.exceptions.join(", ")}` : "Sin excepciones"}</span>
                </>
              )}
              <div style={{ display: "flex", gap: 5 }}>
                {editingForbidden === item._id ? <button onClick={() => updateForbidden(item)}><Save size={13} /></button> : <button onClick={() => setEditingForbidden(item._id)}><Pencil size={13} /></button>}
                <button onClick={() => deleteForbidden(item._id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
