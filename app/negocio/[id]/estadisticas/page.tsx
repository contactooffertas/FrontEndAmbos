// app/negocio/[id]/estadisticas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../componentes/MainLayout";
import {
  ArrowLeft, Eye, Users, Flame, Clock, ShoppingBag, TrendingUp,
  MousePointerClick, MessageCircle, Target, Lightbulb, ChevronRight,
  Activity, Sparkles,
} from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";

type Lead = {
  _id: string;
  user_id?: string;
  anonymous_id?: string;
  lead_score?: number;
  total_time_spent?: number;
  top_products?: Record<string, unknown>;
  last_seen?: string;
};

type TopProduct = {
  _id?: string;
  product_name?: string;
  totalViews?: number;
  totalSeconds?: number;
};

type StatsData = {
  leads?: Lead[];
  topProducts?: TopProduct[];
  funnel?: { views?: number; clicks?: number; conversions?: number };
};

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export default function EstadisticasPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("marketplace_token");
    if (!id || !token) {
      setLoading(false);
      return;
    }

    fetch(`${API}/tracking/leads/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar las métricas");
        return r.json();
      })
      .then(setData)
      .catch(() => setData({ leads: [], topProducts: [], funnel: { views: 0, clicks: 0, conversions: 0 } }))
      .finally(() => setLoading(false));
  }, [id]);

  const metrics = useMemo(() => {
    const leads = data?.leads || [];
    const products = data?.topProducts || [];
    const totalViews = products.reduce((sum, item) => sum + Number(item.totalViews || 0), 0);
    const hotLeads = leads.filter((lead) => Number(lead.lead_score || 0) >= 70);
    const engaged = leads.filter((lead) => Number(lead.lead_score || 0) >= 20);
    const contactIntent = leads.filter((lead) => Number(lead.lead_score || 0) >= 50);
    const avgTime = leads.length
      ? Math.round(leads.reduce((sum, lead) => sum + Number(lead.total_time_spent || 0), 0) / leads.length)
      : 0;

    return {
      leads, products, totalViews, hotLeads, engaged, contactIntent, avgTime,
      engagementRate: pct(engaged.length, leads.length),
      contactRate: pct(contactIntent.length, leads.length),
      hotRate: pct(hotLeads.length, leads.length),
    };
  }, [data]);

  if (loading) {
    return (
      <MainLayout>
        <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#64748b", fontWeight: 700 }}>
          Cargando rendimiento del negocio...
        </div>
      </MainLayout>
    );
  }

  const { leads, products, totalViews, hotLeads, avgTime, engagementRate, contactRate, hotRate } = metrics;

  const recommendations = [
    leads.length === 0
      ? { title: "Conseguí las primeras visitas", text: "Compartí tu tienda y publicá productos con foto, precio y una descripción clara. Cuando empiece a entrar tráfico vas a poder medir el embudo.", level: "Primer paso" }
      : null,
    leads.length > 0 && totalViews / Math.max(leads.length, 1) < 1.5
      ? { title: "Tus visitantes miran pocos productos", text: "Mejorá las fotos y títulos de los productos principales y asegurate de que la propuesta más atractiva aparezca primero.", level: "Oportunidad" }
      : null,
    leads.length > 0 && avgTime < 30
      ? { title: "La atención se pierde rápido", text: "El tiempo promedio es menor a 30 segundos. Hacé que precio, beneficio, entrega y contacto se entiendan sin esfuerzo al entrar.", level: "Prioridad" }
      : null,
    leads.length > 0 && contactRate < 20
      ? { title: "Hay margen para generar más intención", text: "Pocos visitantes llegan a una señal fuerte de contacto. Reforzá llamados a la acción y la información que ayuda a decidir.", level: "Conversión" }
      : null,
    leads.length > 0 && hotRate >= 20
      ? { title: "Tenés una audiencia con buena intención", text: "Una parte importante de tus visitantes ya muestra señales fuertes. Priorizá disponibilidad, respuesta rápida y productos destacados.", level: "Fortaleza" }
      : null,
  ].filter(Boolean) as { title: string; text: string; level: string }[];

  if (!recommendations.length) {
    recommendations.push({
      title: "El embudo está equilibrado",
      text: "Seguí observando qué productos concentran vistas y qué cambios hacen crecer la intención de contacto.",
      level: "Seguimiento",
    });
  }

  const kpis = [
    { label: "Vistas de productos", value: totalViews, sub: "Interés total generado", Icon: Eye },
    { label: "Visitantes únicos", value: leads.length, sub: "Personas distintas detectadas", Icon: Users },
    { label: "Leads calientes", value: hotLeads.length, sub: `${hotRate}% de tus visitantes`, Icon: Flame, dark: true },
    { label: "Tiempo promedio", value: `${avgTime}s`, sub: "Atención media por visitante", Icon: Clock },
  ];

  return (
    <MainLayout>
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "1rem clamp(1rem,3vw,1.5rem) 3rem" }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: 0, color: "#64748b", cursor: "pointer", fontWeight: 800, padding: "8px 0", marginBottom: 8 }}
        >
          <ArrowLeft size={16} /> Volver al negocio
        </button>

        <section style={{
          position: "relative", overflow: "hidden", borderRadius: 24, padding: "clamp(1.25rem,4vw,2rem)",
          background: "linear-gradient(135deg,#101d2f 0%,#172a40 65%,#203b50 100%)", color: "#fff",
          boxShadow: "0 18px 45px rgba(15,23,42,.16)", marginBottom: "1.25rem",
        }}>
          <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "rgba(249,115,22,.13)", right: -70, top: -95 }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ maxWidth: 690 }}>
              <div style={{ color: "#fb923c", fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Rosario Market · Rendimiento</div>
              <h1 style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)", lineHeight: 1.05, margin: 0, fontWeight: 950, letterSpacing: "-.035em" }}>Entendé qué atrae y qué convierte</h1>
              <p style={{ color: "#cbd5e1", maxWidth: 650, margin: "12px 0 0", lineHeight: 1.55, fontSize: 14 }}>
                Métricas claras para decidir qué producto impulsar y dónde mejorar el recorrido de tus compradores.
              </p>
            </div>
            <div style={{ border: "1px solid rgba(251,146,60,.35)", background: "rgba(249,115,22,.1)", borderRadius: 16, padding: "10px 13px", display: "flex", gap: 9, alignItems: "center" }}>
              <Activity size={18} color="#fb923c" />
              <div><div style={{ fontSize: 11, color: "#cbd5e1" }}>Estado</div><strong style={{ fontSize: 13 }}>Datos en vivo</strong></div>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 12, marginBottom: 16 }}>
          {kpis.map(({ label, value, sub, Icon, dark }) => (
            <article key={label} style={{
              borderRadius: 18, padding: "1rem", minHeight: 140,
              background: dark ? "#142337" : "#fff", color: dark ? "#fff" : "#142033",
              border: dark ? "1px solid #243b54" : "1px solid #e5e7eb",
              boxShadow: "0 7px 24px rgba(15,23,42,.055)",
            }}>
              <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 11, background: dark ? "rgba(249,115,22,.14)" : "#fff7ed", color: "#f97316", marginBottom: 12 }}><Icon size={17} /></div>
              <div style={{ fontSize: 12, fontWeight: 850, color: dark ? "#cbd5e1" : "#64748b" }}>{label}</div>
              <div style={{ fontSize: "2rem", fontWeight: 950, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: dark ? "#94a3b8" : "#94a3b8", marginTop: 6 }}>{sub}</div>
            </article>
          ))}
        </section>

        <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "1.1rem", marginBottom: 16, boxShadow: "0 7px 24px rgba(15,23,42,.045)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900, color: "#142033" }}><Target size={18} color="#f97316" /> Tu embudo</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>De visitante a una señal fuerte de interés</div>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{leads.length ? "Basado en tus visitantes actuales" : "Esperando las primeras visitas"}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            {[
              ["Visitantes", leads.length, 100],
              ["Interesados", metrics.engaged.length, engagementRate],
              ["Intención de contacto", metrics.contactIntent.length, contactRate],
              ["Leads calientes", hotLeads.length, hotRate],
            ].map(([label, value, rate], index) => (
              <div key={String(label)} style={{ padding: "14px 13px", borderRadius: 15, background: index === 3 ? "#fff7ed" : "#f8fafc", border: index === 3 ? "1px solid #fed7aa" : "1px solid #eef2f7" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b" }}>{label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 5 }}><strong style={{ fontSize: 23, color: "#142033" }}>{value}</strong><span style={{ fontSize: 11, color: "#f97316", fontWeight: 800 }}>{rate}%</span></div>
                <div style={{ height: 6, borderRadius: 99, background: "#e8edf3", marginTop: 9, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Number(rate))}%`, background: "#f97316", borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, marginBottom: 16 }}>
          <article style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "1.1rem", boxShadow: "0 7px 24px rgba(15,23,42,.045)" }}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8, color: "#142033" }}><ShoppingBag size={17} color="#f97316" /> Productos que generan atención</h2>
            {products.length === 0 ? (
              <div style={{ padding: "24px 4px", color: "#94a3b8", fontSize: 13 }}>Cuando tus productos reciban visitas, vas a ver acá cuáles despiertan más interés.</div>
            ) : products.slice(0, 8).map((product, index) => (
              <div key={product._id || index} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 27, height: 27, borderRadius: 9, background: index < 3 ? "#fff7ed" : "#f8fafc", color: index < 3 ? "#f97316" : "#64748b", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 11 }}>{index + 1}</div>
                <div><div style={{ fontWeight: 800, fontSize: 13, color: "#142033" }}>{product.product_name || "Producto"}</div><div style={{ color: "#94a3b8", fontSize: 11 }}>{Math.round(Number(product.totalSeconds || 0))}s de atención acumulada</div></div>
                <strong style={{ color: "#f97316", fontSize: 13 }}>{Number(product.totalViews || 0)} vistas</strong>
              </div>
            ))}
          </article>

          <article style={{ background: "#142337", border: "1px solid #243b54", borderRadius: 20, padding: "1.1rem", color: "#fff", boxShadow: "0 10px 30px rgba(15,23,42,.12)" }}>
            <h2 style={{ fontSize: 16, margin: "0 0 5px", display: "flex", alignItems: "center", gap: 8 }}><Lightbulb size={17} color="#fb923c" /> Qué mejorar ahora</h2>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 12px" }}>Sugerencias automáticas según el comportamiento de tus visitantes.</p>
            {recommendations.slice(0, 3).map((item, index) => (
              <div key={item.title} style={{ padding: "13px 0", borderBottom: index < recommendations.slice(0, 3).length - 1 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
                <div style={{ color: "#fb923c", textTransform: "uppercase", fontSize: 9, letterSpacing: 1, fontWeight: 900 }}>{item.level}</div>
                <div style={{ fontWeight: 850, fontSize: 13, marginTop: 4, display: "flex", justifyContent: "space-between", gap: 8 }}>{item.title}<ChevronRight size={15} color="#64748b" /></div>
                <div style={{ color: "#b7c3d2", fontSize: 11.5, lineHeight: 1.55, marginTop: 5 }}>{item.text}</div>
              </div>
            ))}
          </article>
        </section>

        <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "1.1rem", boxShadow: "0 7px 24px rgba(15,23,42,.045)" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 5px", display: "flex", alignItems: "center", gap: 8, color: "#142033" }}><TrendingUp size={17} color="#f97316" /> Señales de tus visitantes</h2>
          <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 12px" }}>Priorizá a quienes muestran más intención, sin exponer datos técnicos innecesarios.</p>
          {leads.length === 0 ? (
            <div style={{ padding: "22px 0", color: "#94a3b8", fontSize: 13 }}>Todavía no hay señales suficientes para analizar.</div>
          ) : leads.slice(0, 20).map((lead) => {
            const score = Number(lead.lead_score || 0);
            const status = score >= 70 ? "Alta intención" : score >= 50 ? "Interés creciente" : score >= 20 ? "Explorando" : "Primera visita";
            return (
              <div key={lead._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13, color: "#142033" }}>{lead.user_id ? "Usuario identificado" : "Visitante anónimo"}</strong>
                    <span style={{ background: score >= 70 ? "#fff7ed" : "#f1f5f9", color: score >= 70 ? "#c2410c" : "#64748b", borderRadius: 99, padding: "3px 7px", fontSize: 9, fontWeight: 900 }}>{status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{Object.keys(lead.top_products || {}).length} productos explorados · {lead.last_seen ? new Date(lead.last_seen).toLocaleDateString("es-AR") : "Sin fecha"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#f97316" }}>
                  {score >= 20 && <MousePointerClick size={14} />}
                  {score >= 50 && <MessageCircle size={14} />}
                  {score >= 70 && <Sparkles size={14} />}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </MainLayout>
  );
}
