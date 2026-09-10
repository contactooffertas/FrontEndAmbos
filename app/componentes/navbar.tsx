"use client";
// app/componentes/Navbar.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import CategoryIcon from "./cateroryicon";
import "../styles/navbar.css";
import {
  Home, Search, User, Package, Store, LogOut, ChevronDown,
  ShoppingCart, Bell, X,
} from "lucide-react";

const NAV_CATEGORIES = [
  { id: "1", name: "Electrónica", iconName: "Monitor", slug: "electronica" },
  { id: "2", name: "Ropa y Moda", iconName: "Shirt", slug: "ropa-moda" },
  { id: "3", name: "Hogar", iconName: "Home", slug: "hogar" },
  { id: "4", name: "Deportes", iconName: "Dumbbell", slug: "deportes" },
  { id: "5", name: "Alimentos", iconName: "ShoppingBag", slug: "alimentos" },
  { id: "6", name: "Salud y Belleza", iconName: "Heart", slug: "salud-belleza" },
  { id: "7", name: "Automotriz", iconName: "Car", slug: "automotriz" },
  { id: "8", name: "Juguetes", iconName: "Gift", slug: "juguetes" },
  { id: "9", name: "Libros", iconName: "BookOpen", slug: "libros" },
  { id: "10", name: "Mascotas", iconName: "PawPrint", slug: "mascotas" },
];

const API = "https://new-backend-lovat.vercel.app/api";
const WS_URL = "https://renderbackendconsocket.onrender.com";
const VAPID_PUBLIC_KEY = "BLR8fiu0VNED_-qHI0rOQn_UPEtJptD4wiYJXuBQxgBhFFRf_SvU54F95IBaBG86V-cv3wwZ4l_NlLD236io1rw";

interface PushNotif { id:string; title:string; body:string; url?:string; receivedAt:number; isAnnouncement?:boolean; markedRead?:boolean; }

function urlBase64ToUint8Array(base64String:string):ArrayBuffer {
  const padding="=".repeat((4-(base64String.length%4))%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=window.atob(base64); const buffer=new ArrayBuffer(raw.length); const arr=new Uint8Array(buffer);
  for(let i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i); return buffer;
}
async function updateBadge(count:number){ if("setAppBadge" in navigator){try{if(count>0)await(navigator as any).setAppBadge(count);else await(navigator as any).clearAppBadge();}catch{}} }

export default function Navbar(){
 const {user,logout}=useAuth(); const {cartCount}=useCart(); const pathname=usePathname(); const router=useRouter();
 const [dropdownOpen,setDropdownOpen]=useState(false),[searchQuery,setSearchQuery]=useState(""),[pendingOrders,setPendingOrders]=useState(0),[shippedOrders,setShippedOrders]=useState(0);
 const [pushNotifs,setPushNotifs]=useState<PushNotif[]>([]),[toastNotif,setToastNotif]=useState<PushNotif|null>(null),[notifPanelOpen,setNotifPanelOpen]=useState(false);
 const dropdownRef=useRef<HTMLDivElement>(null),notifRef=useRef<HTMLDivElement>(null),prevShippedIds=useRef<Set<string>>(new Set()),shippedInitialized=useRef(false),announcementSocketRef=useRef<ReturnType<typeof import("socket.io-client")["io"]>|null>(null),toastTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const pathnameRef=useRef(pathname); useEffect(()=>{pathnameRef.current=pathname},[pathname]);
 useEffect(()=>{if(!toastNotif)return;if(toastTimerRef.current)clearTimeout(toastTimerRef.current);toastTimerRef.current=setTimeout(()=>setToastNotif(null),6000);return()=>{if(toastTimerRef.current)clearTimeout(toastTimerRef.current)}},[toastNotif]);
 useEffect(()=>{const handler=(event:MessageEvent)=>{if(event.data?.type==="NAVIGATE"&&event.data.url)router.push(event.data.url);if(event.data?.type==="PUSH_RECEIVED"){const n={id:`${Date.now()}-${Math.random()}`,title:event.data.title||"Nueva notificación",body:event.data.body||"",url:event.data.url,receivedAt:Date.now()};setPushNotifs(p=>[n,...p].slice(0,20));setToastNotif(n);setNotifPanelOpen(false)}};navigator.serviceWorker?.addEventListener("message",handler);return()=>navigator.serviceWorker?.removeEventListener("message",handler)},[router]);
 useEffect(()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})},[]);
 useEffect(()=>{if(!user||!("serviceWorker" in navigator)||!("PushManager" in window))return;(async()=>{try{const reg=await navigator.serviceWorker.ready;if(Notification.permission==="default")await Notification.requestPermission();if(Notification.permission!=="granted")return;const token=localStorage.getItem("marketplace_token");if(!token)return;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});await fetch(`${API}/push/subscribe`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({subscription:sub.toJSON()})})}catch{}})()},[user]);
 useEffect(()=>{if(!user)return;const token=localStorage.getItem("marketplace_token");if(!token)return;fetch(`${API}/announcements/active`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():{announcements:[]}).then(data=>{const a=(data.announcements||[]).map((x:any)=>({id:x._id,title:x.title,body:x.message,url:x.link,receivedAt:new Date(x.createdAt).getTime(),isAnnouncement:true,markedRead:false}));setPushNotifs(p=>[...a.filter((x:PushNotif)=>!p.some(y=>y.id===x.id)),...p])}).catch(()=>{})},[user]);
 useEffect(()=>{if(!user)return;let cleanup:()=>void;(async()=>{const {io}=await import("socket.io-client");const token=localStorage.getItem("marketplace_token"),myId=(user as any)?._id||(user as any)?.id;const socket=io(WS_URL,{auth:{token},reconnectionAttempts:10,reconnectionDelay:1000});announcementSocketRef.current=socket;socket.on("connect",()=>socket.emit("join_user_room",myId));socket.on("new_announcement",(p:any)=>{const n={id:p._id,title:p.title,body:p.message,url:p.link,receivedAt:Date.now(),isAnnouncement:true,markedRead:false};setPushNotifs(x=>x.some(y=>y.id===n.id)?x:[n,...x].slice(0,20));setToastNotif(n)});socket.on("new_message",(m:any)=>{const senderId=m?.sender?._id||m?.sender;if(!senderId||senderId===myId)return;const n={id:m._id||`${Date.now()}-${Math.random()}`,title:`Mensaje de ${m?.sender?.name||"un usuario"}`,body:m?.text||(m?.image?"📷 Imagen":""),url:m?.conversation?`/chat?conversationId=${m.conversation}`:"/chat",receivedAt:Date.now()};setPushNotifs(x=>x.some(y=>y.id===n.id)?x:[n,...x].slice(0,20));if(!pathnameRef.current.startsWith("/chat"))setToastNotif(n)});cleanup=()=>socket.disconnect()})();return()=>cleanup?.()},[user]);
 useEffect(()=>{function h(e:MouseEvent){if(dropdownRef.current&&!dropdownRef.current.contains(e.target as Node))setDropdownOpen(false);if(notifRef.current&&!notifRef.current.contains(e.target as Node))setNotifPanelOpen(false)}document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]); useEffect(()=>setDropdownOpen(false),[pathname]);
 useEffect(()=>{if(!user||user.role!=="seller")return;(async()=>{try{const token=localStorage.getItem("marketplace_token"),res=await fetch(`${API}/orders/seller`,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return;const data=await res.json();setPendingOrders(data.filter((o:any)=>o.status==="pending").length)}catch{}})()},[user]);
 useEffect(()=>{if(!user)return;const check=async()=>{try{const token=localStorage.getItem("marketplace_token"),res=await fetch(`${API}/orders/my-orders`,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)return;const data=await res.json(),shipped=data.filter((o:any)=>o.status==="shipped"),ids=new Set<string>(shipped.map((o:any)=>String(o._id)));if(shippedInitialized.current){const fresh=shipped.filter((o:any)=>!prevShippedIds.current.has(String(o._id)));if(fresh.length)setToastNotif({id:`ship-${Date.now()}`,title:"¡Tu pedido fue enviado!",body:"Revisá el estado de tu compra.",url:"/mis-compras",receivedAt:Date.now()})}prevShippedIds.current=ids;shippedInitialized.current=true;setShippedOrders(shipped.length)}catch{}};check();const t=setInterval(check,30000);return()=>clearInterval(t)},[user]);
 const handleSearch=(e:React.FormEvent)=>{e.preventDefault();if(searchQuery.trim())router.push(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`)};
 const unreadNotifs=pushNotifs.filter(n=>!n.markedRead).length; useEffect(()=>{updateBadge(unreadNotifs)},[unreadNotifs]);
 const markAllAnnouncementsRead=useCallback(()=>{const token=localStorage.getItem("marketplace_token"),toMark=pushNotifs.filter(n=>n.isAnnouncement&&!n.markedRead);if(token)toMark.forEach(n=>fetch(`${API}/announcements/${n.id}/read`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`}}).catch(()=>{}));setPushNotifs(p=>p.map(n=>n.isAnnouncement?{...n,markedRead:true}:n))},[pushNotifs]);
 const toggleNotifPanel=()=>setNotifPanelOpen(p=>{const n=!p;if(n){setToastNotif(null);markAllAnnouncementsRead()}return n});
 const clearAllNotifs=()=>{setPushNotifs([]);setToastNotif(null)};
 const currentSlug=pathname.startsWith("/categoria/")?(pathname.split("/categoria/")[1]?.split("?")[0]??""):"";
 return <>
 {toastNotif&&!notifPanelOpen&&<div style={{position:"fixed",top:"4.75rem",right:"1rem",zIndex:99999,maxWidth:320,width:"calc(100vw - 2rem)"}}><div style={{background:"rgba(15,15,15,.97)",border:"1px solid rgba(249,115,22,.35)",borderLeft:"3px solid #f97316",borderRadius:12,padding:".8rem 1rem",display:"flex",gap:10,color:"white"}}><Bell size={15} color="#f97316"/><div style={{flex:1}}><b>{toastNotif.title}</b><div>{toastNotif.body}</div></div><button onClick={()=>setToastNotif(null)} style={{background:"none",border:0,color:"white"}}><X size={13}/></button></div></div>}
 <header className="navbar"><div className="navbar-inner">
 <Link href="/" className="navbar-logo" aria-label="RosarioMarket — Ir al inicio"><span className="navbar-logo-badge"><img src="/assets/navbarbolsa.png" alt="" className="navbar-logo-badge-img"/></span><span className="navbar-logo-wordmark"><span className="navbar-logo-word-main">Rosario</span><span className="navbar-logo-word-accent">Market</span></span></Link>
 <form className="navbar-search" onSubmit={handleSearch}><Search size={16} className="navbar-search-icon"/><input placeholder="Buscar productos, negocios..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></form>
 <div className="navbar-actions">
 {user&&<div ref={notifRef} style={{position:"relative"}}><button className={`bell-btn${notifPanelOpen?" active":""}`} onClick={toggleNotifPanel} title="Notificaciones"><Bell size={17}/>{unreadNotifs>0&&<span className="badge">{unreadNotifs>9?"9+":unreadNotifs}</span>}</button>{notifPanelOpen&&<div className="notif-panel"><div className="notif-head"><b>Notificaciones</b>{pushNotifs.length>0&&<button onClick={clearAllNotifs}>Limpiar</button>}</div>{pushNotifs.length===0?<div className="notif-empty">No tenés notificaciones</div>:pushNotifs.map(n=><button key={n.id} className="notif-row" onClick={()=>{setNotifPanelOpen(false);if(n.url)router.push(n.url)}}><b>{n.title}</b><span>{n.body}</span></button>)}</div>}</div>}
 <Link href="/carrito" className="cart-button" aria-label="Carrito"><ShoppingCart size={20}/>{cartCount>0&&<span className="cart-badge">{cartCount}</span>}</Link>
 {user?<div className="user-menu" ref={dropdownRef}><button className="user-button" onClick={()=>setDropdownOpen(!dropdownOpen)}>{user.avatar?<img src={user.avatar} alt=""/>:<User size={18}/>}<span>{user.name}</span><ChevronDown size={15}/></button>{dropdownOpen&&<div className="user-dropdown"><Link href="/perfil"><User size={15}/>Mi perfil</Link>{user.role==="seller"&&<><Link href="/vendedor"><Store size={15}/>Mi negocio</Link><Link href="/pedidos"><Package size={15}/>Pedidos{pendingOrders>0&&<b>{pendingOrders}</b>}</Link></>}<Link href="/mis-compras"><Package size={15}/>Mis compras{shippedOrders>0&&<b>{shippedOrders}</b>}</Link><button onClick={()=>logout()}><LogOut size={15}/>Cerrar sesión</button></div>}</div>:<div className="auth-buttons"><Link href="/login" className="login-link">Iniciar sesión</Link><Link href="/register" className="register-button">Registrarse</Link></div>}
 </div></div></header>
 <nav className="category-bar"><div className="category-bar-inner"><Link href="/" className={`category-item ${pathname==="/"?"active":""}`}><Home size={20}/></Link>{NAV_CATEGORIES.map(c=><Link key={c.id} href={`/categoria/${c.slug}`} className={`category-item ${currentSlug===c.slug?"active":""}`} title={c.name}><CategoryIcon iconName={c.iconName} size={21}/></Link>)}</div></nav>
 <style>{`.bell-btn{position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:1.5px solid #f97316;background:#1c1c1c;color:#f97316;cursor:pointer}.badge{position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;border-radius:99px;font-size:9px;padding:2px 4px}.notif-panel{position:fixed;top:4.5rem;left:.5rem;right:.5rem;max-width:340px;margin-left:auto;max-height:70vh;overflow:auto;background:#111;border:1px solid #ffffff1a;border-radius:14px;z-index:99999;color:white}.notif-head{display:flex;justify-content:space-between;padding:.75rem 1rem}.notif-head button,.notif-row{background:none;border:0;color:inherit}.notif-row{width:100%;display:flex;flex-direction:column;text-align:left;padding:.75rem 1rem;border-top:1px solid #ffffff12}.notif-empty{padding:1rem;color:#aaa}`}</style>
 </>;
}
