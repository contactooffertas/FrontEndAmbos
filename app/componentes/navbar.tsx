"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import CategoryIcon from "./cateroryicon";
import "../styles/navbar.css";
import { Home, Search, User, Package, Store, LogOut, ChevronDown, ShoppingCart, Bell, MessageCircle, Handshake, Shield, MapPin } from "lucide-react";

const NAV_CATEGORIES = [
  { id:"1",name:"Electrónica",iconName:"Monitor",slug:"electronica" },
  { id:"2",name:"Ropa y Moda",iconName:"Shirt",slug:"ropa-moda" },
  { id:"3",name:"Hogar",iconName:"Home",slug:"hogar" },
  { id:"4",name:"Deportes",iconName:"Dumbbell",slug:"deportes" },
  { id:"5",name:"Alimentos",iconName:"ShoppingBag",slug:"alimentos" },
  { id:"6",name:"Salud y Belleza",iconName:"Heart",slug:"salud-belleza" },
  { id:"7",name:"Automotriz",iconName:"Car",slug:"automotriz" },
  { id:"8",name:"Juguetes",iconName:"Gift",slug:"juguetes" },
  { id:"9",name:"Libros",iconName:"BookOpen",slug:"libros" },
  { id:"10",name:"Mascotas",iconName:"PawPrint",slug:"mascotas" },
];

const API="https://new-backend-lovat.vercel.app/api";
type Notice={id:string;title:string;body:string;url?:string;kind?:"announcement"|"chat"};

export default function Navbar(){
  const {user,logout}=useAuth();
  const {cartCount}=useCart();
  const pathname=usePathname() || "/";
  const router=useRouter();
  const [dropdownOpen,setDropdownOpen]=useState(false);
  const [searchQuery,setSearchQuery]=useState("");
  const [notices,setNotices]=useState<Notice[]>([]);
  const [notifOpen,setNotifOpen]=useState(false);\n  const [chatUnread,setChatUnread]=useState(0);
  const dropdownRef=useRef<HTMLDivElement>(null);
  const notifRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const close=(e:MouseEvent)=>{
      if(dropdownRef.current&&!dropdownRef.current.contains(e.target as Node))setDropdownOpen(false);
      if(notifRef.current&&!notifRef.current.contains(e.target as Node))setNotifOpen(false);
    };
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[]);

  useEffect(()=>{setDropdownOpen(false);setNotifOpen(false)},[pathname]);

  useEffect(()=>{
    if(!user)return;
    const token=localStorage.getItem("marketplace_token");
    if(!token)return;
    let cancelled=false;

    const loadCenter=async()=>{
      try{
        const [annRes,chatRes]=await Promise.all([
          fetch(`${API}/announcements/active`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}),
          fetch(`${API}/chat/conversations`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"})
        ]);

        if(cancelled)return;
        const annData=annRes.ok?await annRes.json():{announcements:[]};
        const chats=chatRes.ok?await chatRes.json():[];
        if(cancelled)return;

        const announcements=Array.isArray(annData?.announcements)?annData.announcements:[];
        const unseenAnnouncements=announcements.filter((x:any)=>!localStorage.getItem(`rm_nav_ann_seen_${x._id}`));
        const chatItems=Array.isArray(chats)?chats.filter((c:any)=>Number(c.unreadCount||0)>0):[];
        const unreadTotal=chatItems.reduce((sum:number,c:any)=>sum+Number(c.unreadCount||0),0);
        setChatUnread(unreadTotal);

        const annNotices:Notice[]=unseenAnnouncements.slice(0,20).map((x:any)=>({
          id:String(x._id),
          title:String(x.title||"Aviso de Rosario Market"),
          body:String(x.message||""),
          url:x.link,
          kind:"announcement"
        }));
        const chatNotices:Notice[]=chatItems.slice(0,10).map((c:any)=>({
          id:`chat-${c._id}`,
          title:`Mensaje de ${c.other?.name||"un usuario"}`,
          body:c.lastMessage?.text?String(c.lastMessage.text):"Te enviaron una imagen",
          url:`/chatpage?conversationId=${c._id}`,
          kind:"chat"
        }));
        setNotices([...chatNotices,...annNotices]);
      }catch{}
    };

    void loadCenter();
    const interval=setInterval(loadCenter,10000);
    const onFocus=()=>void loadCenter();
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onFocus);
    return()=>{cancelled=true;clearInterval(interval);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onFocus)};
  },[user?.id]);

  const handleSearch=(e:React.FormEvent)=>{e.preventDefault();const q=searchQuery.trim();if(q)router.push(`/buscar?q=${encodeURIComponent(q)}`)};
  const currentSlug=pathname.startsWith("/categoria/")?(pathname.split("/categoria/")[1]?.split("?")[0]??""):"";

  return <>
    <header className="navbar"><div className="navbar-inner">
      <Link href="/" className="navbar-logo" aria-label="Rosario Market — Ir al inicio">
        <span className="navbar-logo-badge"><img src="/assets/navbarbolsa.png" alt="" className="navbar-logo-badge-img"/></span>
        <span className="navbar-logo-wordmark"><span className="navbar-logo-word-main">Rosario</span><span className="navbar-logo-word-accent">Market</span></span>
      </Link>
      <form className="navbar-search" onSubmit={handleSearch}><Search size={16} className="navbar-search-icon"/><input placeholder="Buscar productos, negocios..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></form>
      <div className="navbar-actions">
        {user&&<div ref={notifRef} style={{position:"relative"}}>
          <button className="bell-btn" onClick={()=>setNotifOpen(v=>!v)} title="Notificaciones" aria-label="Notificaciones"><Bell size={17}/>{notices.length>0&&<span className="badge">{notices.length>9?"9+":notices.length}</span>}</button>
          {notifOpen&&<div className="notif-panel"><div className="notif-head"><b>Notificaciones</b>{notices.length>0&&<button onClick={()=>setNotices([])}>Limpiar</button>}</div>{notices.length===0?<div className="notif-empty">No tenés notificaciones</div>:notices.map(n=><button key={n.id} className="notif-row" onClick={()=>{setNotifOpen(false);if(n.url)router.push(n.url)}}><b>{n.title}</b><span>{n.body}</span></button>)}</div>}
        </div>}
        {user&&<Link href="/panel?tab=cart" className="cart-button" aria-label="Carrito"><ShoppingCart size={20}/>{cartCount>0&&<span className="cart-badge">{cartCount}</span>}</Link>}
        {user?<div className="user-menu" ref={dropdownRef}>
          <button className="user-button" onClick={()=>setDropdownOpen(v=>!v)}>{user.avatar?<img src={user.avatar} alt=""/>:<User size={18}/>}<span>{user.name||"Mi cuenta"}</span><ChevronDown size={15}/></button>
          {dropdownOpen&&<div className="user-dropdown">
            <Link href="/profile"><User size={15}/>Mi perfil y configuración</Link>
            <Link href="/profile"><MapPin size={15}/>Negocios cerca</Link>
            <Link href="/chatpage"><MessageCircle size={15}/>Mensajes / Chat</Link>
            <Link href="/programa-afiliados"><Handshake size={15}/>Programa de Afiliados</Link>
            {user.role==="seller"&&<><Link href="/negocio"><Store size={15}/>Mi negocio</Link><Link href="/mis-productos"><Package size={15}/>Mis productos</Link><Link href="/ordenes"><Package size={15}/>Pedidos recibidos</Link></>}
            <Link href="/panel?tab=purchases"><Package size={15}/>Mis compras</Link>
            <Link href="/eliminaUsuario"><Shield size={15}/>Seguridad y eliminar cuenta</Link>
            <button onClick={()=>void logout()}><LogOut size={15}/>Cerrar sesión</button>
          </div>}
        </div>:<div className="auth-buttons"><Link href="/login" className="login-link">Iniciar sesión</Link><Link href="/register" className="register-button">Registrarse</Link></div>}
      </div>
    </div></header>
    <nav className="category-bar"><div className="category-bar-inner"><Link href="/" className={`category-item ${pathname==="/"?"active":""}`}><Home size={20}/></Link>{NAV_CATEGORIES.map(c=><Link key={c.id} href={`/categoria/${c.slug}`} className={`category-item ${currentSlug===c.slug?"active":""}`} title={c.name}><CategoryIcon name={c.iconName} size={21}/></Link>)}</div></nav>
    <style>{`.bell-btn{position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;border:1.5px solid #f97316;background:#1c1c1c;color:#f97316;cursor:pointer}.badge{position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;border-radius:99px;font-size:9px;padding:2px 4px}.notif-panel{position:fixed;top:4.5rem;left:.5rem;right:.5rem;max-width:340px;margin-left:auto;max-height:70vh;overflow:auto;background:#111;border:1px solid #ffffff1a;border-radius:14px;z-index:99999;color:white}.notif-head{display:flex;justify-content:space-between;padding:.75rem 1rem}.notif-head button,.notif-row{background:none;border:0;color:inherit}.notif-row{width:100%;display:flex;flex-direction:column;text-align:left;padding:.75rem 1rem;border-top:1px solid #ffffff12}.notif-empty{padding:1rem;color:#aaa}`}</style>
  </>;
}
