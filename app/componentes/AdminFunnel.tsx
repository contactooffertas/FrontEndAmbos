"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, MousePointerClick, Smartphone, Users, UserRoundCheck, Globe2, RefreshCw, Trash2 } from "lucide-react";

const API = "https://new-backend-lovat.vercel.app/api";

type FunnelData = {
  rangeDays:number;
  funnel:{
    visitors:number; sessions:number; productViews:number; whatsappClicks:number;
    apkDownloads:number; apkUpdates:number; registrations:number; conversions:number;
    identifiedUsers:number; visitToProduct:number; visitToWhatsapp:number;
    visitToDownload:number; visitToConversion:number;
  };
  sources:{name:string;count:number}[];
  landings:{path:string;count:number}[];
  devices:{app:number;mobileWeb:number;desktop:number};
  timeline:{date:string;visits:number;downloads:number;conversions:number}[];
  recentLeads:{id:string;anonymousId:string;userId?:string|null;score:number;firstSeen:string;lastSeen:string;sessions:number;seconds:number}[];
};

function getToken(){ return typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null; }

export default function AdminFunnel(){
  const [days,setDays]=useState(30);
  const [data,setData]=useState<FunnelData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");\n  const [cleaning,setCleaning]=useState(false);

  const load=async()=>{
    setLoading(true); setError("");
    try{
      const res=await fetch(`${API}/admin/funnel?days=${days}`,{
        headers:{Authorization:`Bearer ${getToken()}`},cache:"no-store"
      });
      const json=await res.json();
      if(!res.ok) throw new Error(json.message||"No se pudo cargar el embudo");
      setData(json);
    }catch(e:any){ setError(e.message||"Error cargando métricas"); }
    finally{ setLoading(false); }
  };

  const clearData=async(mode:"range"|"all")=>{
    const scopeText=mode==="all"
      ?"TODOS los datos de Leads y tracking"
      : `los datos de Leads y tracking de los últimos ${days} días`;
    if(!window.confirm(`¿Seguro que querés borrar ${scopeText}? Esta acción no afecta usuarios, negocios, productos ni pedidos y no se puede deshacer.`)) return;

    setCleaning(true); setError("");
    try{
      const qs=mode==="all"?"mode=all":`mode=range&days=${days}`;
      const res=await fetch(`${API}/admin/funnel?${qs}`,{
        method:"DELETE",
        headers:{Authorization:`Bearer ${getToken()}`},
      });
      const json=await res.json();
      if(!res.ok) throw new Error(json.message||"No se pudieron limpiar los datos");
      await load();
      window.alert(`${json.message} Eventos borrados: ${json.deleted?.trackingEvents||0}. Leads borrados: ${json.deleted?.leadProfiles||0}.`);
    }catch(e:any){
      setError(e.message||"Error limpiando los datos");
    }finally{
      setCleaning(false);
    }
  };

  useEffect(()=>{ void load(); },[days]);

  const maxSource=useMemo(()=>Math.max(1,...(data?.sources||[]).map(x=>x.count)),[data]);

  if(loading&&!data) return <div className="adm-card" style={{padding:"2rem",textAlign:"center"}}>Cargando embudo...</div>;
  if(error&&!data) return <div className="adm-card" style={{padding:"2rem",color:"#fca5a5"}}>{error}</div>;
  if(!data) return null;

  const f=data.funnel;
  const cards=[
    ["Visitantes",f.visitors,Users,"Personas únicas detectadas"],
    ["Sesiones",f.sessions,Globe2,"Visitas totales agrupadas"],
    ["Vistas producto",f.productViews,MousePointerClick,`${f.visitToProduct}% de visitantes`],
    ["Clicks WhatsApp",f.whatsappClicks,MousePointerClick,`${f.visitToWhatsapp}% de visitantes`],
    ["Descargas APK",f.apkDownloads,Download,`${f.visitToDownload}% de visitantes`],
    ["Actualizaciones APK",f.apkUpdates,Smartphone,"Actualizaciones iniciadas"],
    ["Usuarios identificados",f.identifiedUsers,UserRoundCheck,"Usuarios logueados detectados"],
    ["Conversiones",f.conversions,BarChart3,`${f.visitToConversion}% de visitantes`],
  ] as const;

  return <div className="adm-content">
    <div className="adm-card" style={{padding:"1rem 1.1rem",marginBottom:"1rem",background:"linear-gradient(135deg,#17243a,#0d1728)",border:"1px solid rgba(249,115,22,.2)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:12,fontWeight:900,letterSpacing:1.2,color:"#fb923c",textTransform:"uppercase"}}>Embudo de adquisición</div>
          <h2 style={{margin:"4px 0",fontSize:"1.25rem",color:"#fff"}}>De dónde llegan y qué hacen</h2>
          <p style={{margin:0,color:"#9ca3af",fontSize:13}}>Visitas, origen, navegación, descargas de APK y señales de conversión.</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <select value={days} onChange={e=>setDays(Number(e.target.value))} style={{background:"#111827",color:"#fff",border:"1px solid rgba(255,255,255,.14)",borderRadius:10,padding:"9px 10px"}}>
            <option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option><option value={180}>180 días</option>
          </select>
          <button onClick={load} disabled={cleaning} aria-label="Actualizar embudo" style={{width:38,height:38,display:"grid",placeItems:"center",borderRadius:10,border:"1px solid rgba(249,115,22,.28)",background:"rgba(249,115,22,.08)",color:"#f97316",cursor:cleaning?"not-allowed":"pointer",opacity:cleaning?.6:1}}><RefreshCw size={16}/></button>
          <button onClick={()=>clearData("range")} disabled={cleaning} title={`Borrar solo los últimos ${days} días`} style={{display:"flex",alignItems:"center",gap:6,height:38,padding:"0 11px",borderRadius:10,border:"1px solid rgba(239,68,68,.32)",background:"rgba(239,68,68,.08)",color:"#fca5a5",fontSize:12,fontWeight:800,cursor:cleaning?"not-allowed":"pointer",opacity:cleaning?.6:1}}><Trash2 size={15}/>{cleaning?"Limpiando...":`Limpiar ${days}d`}</button>
          <button onClick={()=>clearData("all")} disabled={cleaning} title="Borrar todo el tracking y los perfiles de Leads" style={{display:"flex",alignItems:"center",gap:6,height:38,padding:"0 11px",borderRadius:10,border:"1px solid rgba(220,38,38,.45)",background:"rgba(127,29,29,.18)",color:"#fecaca",fontSize:12,fontWeight:800,cursor:cleaning?"not-allowed":"pointer",opacity:cleaning?.6:1}}><Trash2 size={15}/>Limpiar todo</button>
        </div>
      </div>
    </div>

    <div className="adm-stats-grid" style={{marginBottom:"1rem"}}>
      {cards.map(([label,value,Icon,sub])=><div className="adm-stat-card" key={label}>
        <div className="adm-stat-icon" style={{color:"#f97316"}}><Icon size={19}/></div>
        <div className="adm-stat-num">{value}</div>
        <div className="adm-stat-label">{label}</div>
        <div style={{fontSize:11,color:"#7f8da3",marginTop:4}}>{sub}</div>
      </div>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
      <div className="adm-card">
        <h3 className="adm-card-title"><Globe2 size={16}/> Origen del tráfico</h3>
        <div style={{display:"grid",gap:10}}>
          {data.sources.length===0?<p style={{color:"#7f8da3"}}>Todavía no hay datos suficientes.</p>:data.sources.map(s=><div key={s.name}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#dbe4ef",marginBottom:5}}><span>{s.name}</span><strong>{s.count}</strong></div>
            <div style={{height:7,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(4,(s.count/maxSource)*100)}%`,background:"#f97316",borderRadius:999}}/></div>
          </div>)}
        </div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card-title"><Smartphone size={16}/> Dispositivos</h3>
        {[["APK Android",data.devices.app],["Web móvil",data.devices.mobileWeb],["Escritorio",data.devices.desktop]].map(([label,value])=><div key={String(label)} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.07)",color:"#cbd5e1",fontSize:13}}><span>{label}</span><strong style={{color:"#fff"}}>{value}</strong></div>)}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:"1rem"}}>
      <div className="adm-card">
        <h3 className="adm-card-title"><MousePointerClick size={16}/> Páginas de entrada</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <tbody>{data.landings.map(x=><tr key={x.path}><td style={{padding:"9px 0",color:"#cbd5e1",borderBottom:"1px solid rgba(255,255,255,.06)"}}>{x.path}</td><td style={{padding:"9px 0",textAlign:"right",fontWeight:800,color:"#fff",borderBottom:"1px solid rgba(255,255,255,.06)"}}>{x.count}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card-title"><Users size={16}/> Leads recientes</h3>
        <div style={{maxHeight:360,overflow:"auto"}}>
          {data.recentLeads.length===0?<p style={{color:"#7f8da3"}}>Sin leads todavía.</p>:data.recentLeads.slice(0,25).map(l=><div key={l.id} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong style={{color:"#fff",fontSize:12}}>{l.userId?"Usuario identificado":"Lead anónimo"}</strong><span style={{fontSize:11,color:"#fb923c",fontWeight:800}}>Score {l.score}</span></div>
            <div style={{fontSize:11,color:"#7f8da3",marginTop:4}}>Última visita: {new Date(l.lastSeen).toLocaleString("es-AR")} · {l.sessions} sesión{l.sessions===1?"":"es"}</div>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}
