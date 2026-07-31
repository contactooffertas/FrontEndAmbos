// app/negocio/[id]/estadisticas/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../componentes/MainLayout";
import Link from "next/link";
import { ArrowLeft, Eye, Users, Flame, Clock, ShoppingBag, TrendingUp, MousePointerClick, MessageCircle, Phone } from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";


export default function EstadisticasPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("marketplace_token");
    if (!id ||!token) return;

    fetch(`${API}/tracking/leads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
   .then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    })
   .then(setData)
   .catch(() => setData({ leads: [], topProducts: [], funnel: { views: 0, clicks: 0, conversions: 0 } }))
   .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <MainLayout><div style={{ padding: '4rem', textAlign: 'center' }}>Cargando tus métricas...</div></MainLayout>;
  }

  const leads = data?.leads || [];
  const topProducts = data?.topProducts || [];
  const totalViews = topProducts.reduce((a: any, b: any) => a + b.totalViews, 0);
  const hotLeads = leads.filter((l: any) => l.lead_score >= 70);
  const avgTime = leads.length? Math.round(leads.reduce((a: any, b: any) => a + (b.total_time_spent || 0), 0) / leads.length) : 0;

  return (
    <MainLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.2rem' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Volver
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: 0 }}>Mis estadísticas</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>Todo lo que pasa en tu negocio, por usuario único y sin duplicados</p>
          </div>
          <div style={{ background: '#f3f4f6', padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
            Negocio ID: {id?.toString().slice(-6)}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.2rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: 6 }}><Eye size={14} /> VISTAS DE PRODUCTOS</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{totalViews}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Cuántas veces vieron tus productos</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.2rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: 6 }}><Users size={14} /> VISITANTES ÚNICOS</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{leads.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Deduplicado por anon_id + fingerprint + IP</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg,#111827,#1f2937)', borderRadius: 16, padding: '1.2rem', color: '#fff' }}>
            <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: 6 }}><Flame size={14} /> LEADS CALIENTES</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{hotLeads.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#d1d5db' }}>Vieron +30s y dieron click en contacto</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.2rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: 6 }}><Clock size={14} /> TIEMPO PROMEDIO</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{avgTime}s</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Por visitante en tu tienda</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>

          {/* Top productos más vistos */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.2rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingBag size={18} /> ¿Qué producto miran más?</h3>
            {topProducts.length === 0? <p style={{ color: '#9ca3af' }}>Aún no hay datos</p> : topProducts.map((p: any) => (
              <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.product_name || p._id?.slice(0, 15) || 'Producto'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.totalViews} vistas · {Math.round(p.totalSeconds || 0)}s en total</div>
                </div>
                <div style={{ fontWeight: 800, color: '#f97316' }}>{p.totalViews}</div>
              </div>
            ))}
          </div>

          {/* Embudo de leads */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.2rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={18} /> Embudo de leads por usuario</h3>
            {leads.length === 0? <p style={{ color: '#9ca3af' }}>Nadie visitó tu tienda aún</p> : leads.slice(0, 20).map((lead: any) => (
              <div key={lead._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {lead.user_id? `Usuario logueado` : `Anónimo ${lead.anonymous_id?.slice(-6)}`}
                    {lead.lead_score >= 70 && <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10 }}>CALIENTE</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {Object.keys(lead.top_products || {}).length} productos · {new Date(lead.last_seen).toLocaleDateString()} · Score {lead.lead_score}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {lead.lead_score > 20 && <MousePointerClick size={14} color="#f97316" />}
                  {lead.lead_score > 50 && <MessageCircle size={14} color="#059669" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '1rem', fontSize: '0.8rem', color: '#92400e' }}>
          <b>Cómo funciona el anti-duplicado:</b> No usamos solo IP. Cada visitante recibe un `anonymous_id` guardado en localStorage + cookie. Si borra cookies, lo resucitamos con fingerprint. Si después se loguea, todo su historial anónimo se une a su `user_id`. Por eso en "Visitantes únicos" no tenés duplicados aunque entre 10 veces.
        </div>
      </div>
    </MainLayout>
  );
}
