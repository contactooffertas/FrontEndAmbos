"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RefreshCw, ShoppingBag } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Rosario Market page error:", error); }, [error]);
  return (
    <main style={{minHeight:"100dvh",background:"linear-gradient(160deg,#0b0f19 0%,#111827 58%,#1b120d 100%)",color:"#fff",display:"grid",placeItems:"center",padding:24}}>
      <section style={{width:"100%",maxWidth:520,textAlign:"center",background:"rgba(17,24,39,.86)",border:"1px solid rgba(249,115,22,.28)",borderRadius:24,padding:"42px 24px",boxShadow:"0 24px 80px rgba(0,0,0,.38)"}}>
        <div style={{width:74,height:74,borderRadius:22,margin:"0 auto 20px",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#f97316,#ea580c)",boxShadow:"0 12px 35px rgba(249,115,22,.28)"}}><ShoppingBag size={36}/></div>
        <div style={{fontSize:13,fontWeight:900,letterSpacing:2,textTransform:"uppercase",color:"#fb923c",marginBottom:10}}>Rosario Market</div>
        <h1 style={{fontSize:"clamp(30px,8vw,48px)",lineHeight:1.05,margin:"0 0 14px",fontWeight:900}}>Algo no salió como esperábamos</h1>
        <p style={{margin:"0 auto 26px",maxWidth:390,color:"#cbd5e1",fontSize:15,lineHeight:1.6}}>Podés intentar nuevamente sin salir de Rosario Market o volver al inicio.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={() => reset()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 18px",border:0,borderRadius:12,background:"#f97316",color:"#fff",fontWeight:800,cursor:"pointer"}}><RefreshCw size={17}/>Reintentar</button>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,.18)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:800,textDecoration:"none"}}><Home size={17}/>Volver al inicio</Link>
        </div>
      </section>
    </main>
  );
}
