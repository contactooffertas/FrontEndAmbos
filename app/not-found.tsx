import Link from "next/link";
import { Home, ArrowLeft, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <main style={{minHeight:"100dvh",background:"linear-gradient(160deg,#0b0f19 0%,#111827 55%,#1c120c 100%)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"inherit"}}>
      <section style={{width:"100%",maxWidth:520,textAlign:"center",background:"rgba(17,24,39,.78)",border:"1px solid rgba(249,115,22,.28)",borderRadius:24,padding:"42px 24px",boxShadow:"0 24px 80px rgba(0,0,0,.38)"}}>
        <div style={{width:76,height:76,borderRadius:22,margin:"0 auto 20px",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#f97316,#ea580c)",boxShadow:"0 12px 35px rgba(249,115,22,.3)"}}><ShoppingBag size={38}/></div>
        <div style={{fontSize:14,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:"#fb923c",marginBottom:10}}>Rosario Market</div>
        <h1 style={{fontSize:"clamp(34px,9vw,58px)",lineHeight:1,margin:"0 0 14px",fontWeight:900}}>Ups, por acá no es</h1>
        <p style={{margin:"0 auto 26px",maxWidth:390,color:"#cbd5e1",fontSize:16,lineHeight:1.6}}>La página que buscás no está disponible o cambió de lugar. Rosario Market sigue funcionando: podés volver al inicio y continuar navegando.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:12,background:"#f97316",color:"#fff",fontWeight:800,textDecoration:"none",boxShadow:"0 8px 24px rgba(249,115,22,.25)"}}><Home size={18}/>Volver al inicio</Link>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:12,border:"1px solid rgba(255,255,255,.18)",color:"#e5e7eb",fontWeight:700,textDecoration:"none",background:"rgba(255,255,255,.05)"}}><ArrowLeft size={18}/>Seguir comprando</Link>
        </div>
        <p style={{margin:"26px 0 0",fontSize:12,color:"#64748b"}}>Todo Rosario, en un solo lugar.</p>
      </section>
    </main>
  );
}
