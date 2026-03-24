"use client";
// app/profile/page.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail, Store, ShoppingBag, LogOut, Bell, MapPin, Package, Save, KeyRound,
  User, Pin, Camera, TrendingUp, Heart, LayoutGrid, MessageCircle, ChevronRight,
  Clock, ExternalLink, X, Star, Navigation, CheckCircle2, RefreshCw, Flag,
  AlertTriangle, CheckCircle, XCircle, Shield, ShieldCheck, ChevronLeft, Locate, LocateOff,
} from "lucide-react";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import { io, Socket } from "socket.io-client";
import ReportModal from "../componentes/reportModal";
import "../styles/profile.css";

const API     = "https://new-backend-lovat.vercel.app/api";
const WS_URL  = "https://renderbackendconsocket.onrender.com";
const SECURITY_SEEN_KEY = "profile_security_seen_v1";

const RADIUS_OPTIONS = [
  { label: "3 km",          value: 3000  },
  { label: "5 km",          value: 5000  },
  { label: "10 km",         value: 10000 },
  { label: "Todo el país",  value: 0     },
];

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

interface Stats          { purchases: number; favorites: number; products: number; }
interface ChatParticipant{ _id: string; name: string; logo?: string; avatar?: string; }
interface RecentConv     { _id: string; other: ChatParticipant; lastMessage?: { text?: string; image?: string; createdAt: string } | null; unreadCount: number; updatedAt: string; }
interface FollowedBusiness{ _id: string; name: string; logo?: string; city?: string; rating?: number; totalRatings?: number; verified?: boolean; }
interface NearbyBusiness  { _id: string; name: string; logo?: string; city?: string; address?: string; rating?: number; totalRatings?: number; verified?: boolean; categories?: string[]; distanceMeters: number; distanceLabel: string; followers?: string[]; }
interface MyReport        { _id: string; targetType: "product"|"business"; targetName: string; status: "pending"|"reviewed"|"dismissed"|"action_taken"; category: string; adminNote?: string; adminAction?: string; createdAt: string; resolvedAt?: string; autoBlocked: boolean; }
interface ReportOnContent { _id: string; targetType: "product"|"business"; targetName: string; status: "pending"|"reviewed"|"dismissed"|"action_taken"; category: string; adminNote?: string; adminAction?: string; reason: string; detectedKeywords: string[]; createdAt: string; resolvedAt?: string; autoBlocked: boolean; }
interface Announcement    { _id: string; title: string; message: string; audience: "all"|"seller"|"buyer"; durationHours: number; link?: string; createdAt: string; expiresAt: string; }

// ── GPS dinámico ─────────────────────────────────────────────────────────────
type GpsStatus = "idle" | "loading" | "ok" | "denied" | "error";
interface GpsState { lat: number | null; lng: number | null; status: GpsStatus; updatedAt: Date | null; }

/**
 * watchPosition → se actualiza automáticamente cuando el usuario se mueve.
 * Igual que Uber: la posición es siempre la real, nunca la guardada en perfil.
 */
function useDynamicGps() {
  const [gps, setGps] = useState<GpsState>({ lat: null, lng: null, status: "idle", updatedAt: null });
  const watchRef = useRef<number | null>(null);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) { setGps(p => ({ ...p, status: "error" })); return; }
    setGps(p => ({ ...p, status: "loading" }));
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, status: "ok", updatedAt: new Date() }),
      (err) => setGps(p => ({ ...p, status: err.code === 1 ? "denied" : "error", lat: null, lng: null })),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  }, []);

  useEffect(() => {
    startWatch();
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [startWatch]);

  const refresh = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    startWatch();
  }, [startWatch]);

  return { gps, refresh };
}

// ── Badge GPS ─────────────────────────────────────────────────────────────────
function GpsBadge({ gps, onRefresh }: { gps: GpsState; onRefresh: () => void }) {
  const timeStr = gps.updatedAt
    ? gps.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  if (gps.status === "loading")
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#6b7280", background:"#f3f4f6", padding:"3px 10px", borderRadius:20 }}>
        <div style={{ width:8, height:8, border:"2px solid #f97316", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
        Obteniendo GPS…
      </span>
    );
  if (gps.status === "ok")
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#059669", background:"#d1fae5", padding:"3px 10px", borderRadius:20 }}>
        <Locate size={11} /> GPS activo · {timeStr}
        <button onClick={onRefresh} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", color:"#059669" }}><RefreshCw size={11} /></button>
      </span>
    );
  if (gps.status === "denied" || gps.status === "error")
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#b45309", background:"#fef3c7", padding:"3px 10px", borderRadius:20 }}>
        <LocateOff size={11} /> GPS bloqueado · distancias desde perfil
        <button onClick={onRefresh} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", color:"#b45309" }}><RefreshCw size={11} /></button>
      </span>
    );
  return null;
}

const CATEGORY_LABELS: Record<string,string> = { fraud:"Estafa/Fraude", adult:"Adulto", drugs:"Drogas", weapons:"Armas", violence:"Violencia", spam:"Spam", other:"Otro" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)}m`;
  const d = new Date(iso);
  if (diff < 86_400_000) return d.toLocaleTimeString("es",{ hour:"2-digit", minute:"2-digit" });
  return d.toLocaleDateString("es",{ day:"2-digit", month:"2-digit" });
}
function avatarUrl(p?: Partial<ChatParticipant>|null) {
  if (p?.logo)   return p.logo;
  if (p?.avatar) return p.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.name||"?")}&background=f97316&color=fff&size=80&bold=true`;
}
function bizLogoUrl(name: string, logo?: string) {
  if (logo) return logo;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff&size=80&bold=true`;
}

function useCountdown(expiresAt: string) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setText("Expirado"); return; }
      const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
      setText(h > 0 ? `${h}h ${m}m restantes` : `${m}m restantes`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return text;
}

function RadiusSelector({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", marginTop:"0.5rem" }}>
      {RADIUS_OPTIONS.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} type="button" disabled={disabled} onClick={() => onChange(opt.value)}
            style={{ padding:"0.28rem 0.75rem", borderRadius:20, border:`1.5px solid ${active?"#f97316":"#111"}`, background:active?"#f97316":"#fff", color:active?"#fff":"#111", fontSize:"0.75rem", fontWeight:active?700:500, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, transition:"all 0.15s", whiteSpace:"nowrap" }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ReportStatusChip({ status }: { status: string }) {
  const map: Record<string,{label:string;color:string;bg:string;border:string;icon:React.ReactNode}> = {
    pending:      { label:"Pendiente",    color:"#f59e0b", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.3)",  icon:<Clock size={10}/>        },
    action_taken: { label:"Resuelto",     color:"#22c55e", bg:"rgba(34,197,94,0.1)",   border:"rgba(34,197,94,0.3)",   icon:<CheckCircle size={10}/>   },
    dismissed:    { label:"Desestimado",  color:"#94a3b8", bg:"rgba(148,163,184,0.1)", border:"rgba(148,163,184,0.3)", icon:<XCircle size={10}/>       },
    reviewed:     { label:"Revisado",     color:"#60a5fa", bg:"rgba(96,165,250,0.1)",  border:"rgba(96,165,250,0.3)",  icon:<Shield size={10}/>        },
  };
  const s = map[status]||map.pending;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:s.bg, color:s.color, border:`1px solid ${s.border}`, borderRadius:20, padding:"0.15rem 0.55rem", fontSize:"0.68rem", fontWeight:700 }}>
      {s.icon} {s.label}
    </span>
  );
}

function ProfileBannerModal({ announcements, seenAnnouncements, onSeenAnnouncement, onClose }: { announcements: Announcement[]; seenAnnouncements: Set<string>; onSeenAnnouncement:(id:string)=>void; onClose:()=>void; }) {
  const now = new Date();
  const activeAnns = announcements.filter(a => new Date(a.expiresAt) > now);
  const total = activeAnns.length + 1;
  const [idx, setIdx] = useState(() => { const f = activeAnns.findIndex(a => !seenAnnouncements.has(a._id)); return f>=0?f:0; });
  const current  = idx < activeAnns.length ? activeAnns[idx] : null;
  const isSecurity = idx >= activeAnns.length;
  const cdText   = useCountdown(current?.expiresAt||new Date(Date.now()+99999999).toISOString());
  useEffect(() => { if (current && !seenAnnouncements.has(current._id)) onSeenAnnouncement(current._id); }, [idx, current]);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"clamp(8px,3vw,24px)", paddingTop:"clamp(48px,8vh,96px)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, boxShadow:"0 20px 60px rgba(0,0,0,0.18),0 4px 16px rgba(0,0,0,0.1)", width:"100%", maxWidth:420, overflow:"hidden", animation:"profileBannerSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ background:isSecurity?"linear-gradient(135deg,#1e3a5f,#2563eb)":"linear-gradient(135deg,#f97316,#ea580c)", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {isSecurity?<ShieldCheck size={18} color="#fff"/>:<Bell size={18} color="#fff"/>}
            <span style={{ color:"#fff", fontWeight:800, fontSize:"0.88rem" }}>{isSecurity?"Seguridad primero":"Anuncio importante"}</span>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, padding:"4px 8px", cursor:"pointer", color:"#fff", display:"flex", alignItems:"center" }}><X size={15}/></button>
        </div>
        <div style={{ padding:"18px 20px" }}>
          {isSecurity ? (
            <>
              <p style={{ fontSize:"0.84rem", color:"#374151", lineHeight:1.65, margin:"0 0 14px" }}>Para tu tranquilidad, acordá el pago y la entrega por el chat. Nunca compartas fotos de tu tarjeta de crédito, claves de cajero ni datos bancarios sensibles. El trato es directo entre vos y el vendedor: la plataforma no interviene en las transacciones.</p>
              <a href="/terminos-y-condiciones" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.78rem", color:"#2563eb", fontWeight:600, textDecoration:"none" }}><ExternalLink size={13}/>Ver términos y condiciones</a>
            </>
          ) : current ? (
            <>
              <h3 style={{ fontSize:"0.95rem", fontWeight:800, color:"#111", margin:"0 0 10px" }}>{current.title}</h3>
              <p style={{ fontSize:"0.84rem", color:"#374151", lineHeight:1.65, margin:"0 0 12px" }}>{current.message}</p>
              {current.link && <a href={current.link} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.78rem", color:"#f97316", fontWeight:600, textDecoration:"none", marginBottom:10 }}><ExternalLink size={13}/>{current.link.length>40?current.link.slice(0,40)+"…":current.link}</a>}
              <div style={{ fontSize:"0.7rem", color:"#9ca3af", marginTop:4 }}>{cdText}</div>
            </>
          ) : null}
        </div>
        {total > 1 && (
          <div style={{ borderTop:"1px solid #f0f0f0", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0} style={{ background:"none", border:"none", cursor:idx===0?"not-allowed":"pointer", opacity:idx===0?0.3:1, padding:4, display:"flex", alignItems:"center" }}><ChevronLeft size={18} color="#6b7280"/></button>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {Array.from({length:total}).map((_,i)=>(<button key={i} onClick={()=>setIdx(i)} style={{ width:i===idx?20:7, height:7, borderRadius:999, background:i===idx?(i>=activeAnns.length?"#2563eb":"#f97316"):"#e5e7eb", border:"none", cursor:"pointer", padding:0, transition:"all 0.2s" }}/>))}
            </div>
            <button onClick={()=>setIdx(i=>Math.min(total-1,i+1))} disabled={idx===total-1} style={{ background:"none", border:"none", cursor:idx===total-1?"not-allowed":"pointer", opacity:idx===total-1?0.3:1, padding:4, display:"flex", alignItems:"center" }}><ChevronRight size={18} color="#6b7280"/></button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileBannerTrigger({ hasUnseen, glowActive, onClick }: { hasUnseen:boolean; glowActive:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:10, border:"none", background:hasUnseen?"linear-gradient(135deg,#f97316,#ea580c)":"rgba(37,99,235,0.1)", color:hasUnseen?"#fff":"#2563eb", fontSize:"0.78rem", fontWeight:700, cursor:"pointer", position:"relative", transition:"all 0.2s", boxShadow:glowActive?"0 0 0 4px rgba(249,115,22,0.2),0 0 16px rgba(249,115,22,0.25)":"none", animation:glowActive?"profileGlowPulse 1.8s ease-in-out infinite":"none", flexShrink:0 }}>
      {hasUnseen?<Bell size={14}/>:<ShieldCheck size={14}/>}
      {hasUnseen?"Nuevo anuncio":"Aviso de seguridad"}
      {hasUnseen&&<span style={{ position:"absolute", top:-4, right:-4, width:10, height:10, borderRadius:"50%", background:"#ef4444", border:"2px solid #fff" }}/>}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { user, loading, logout, enableNotifications, updateUser } = useAuth();
  const router         = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const socketRef      = useRef<Socket|null>(null);

  // ── GPS dinámico ──────────────────────────────────────────────────────────
  const { gps, refresh: refreshGps } = useDynamicGps();

  const [stats,          setStats]          = useState<Stats>({ purchases:0, favorites:0, products:0 });
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [avatarPreview,  setAvatarPreview]  = useState<string|null>(null);
  const [avatarLoading,  setAvatarLoading]  = useState(false);
  const [profileName,    setProfileName]    = useState("");
  const [profileEmail,   setProfileEmail]   = useState("");
  const [profileSaving,  setProfileSaving]  = useState(false);
  const [currentPwd,     setCurrentPwd]     = useState("");
  const [newPwd,         setNewPwd]         = useState("");
  const [confirmPwd,     setConfirmPwd]     = useState("");
  const [pwdSaving,      setPwdSaving]      = useState(false);
  const [recentConvs,    setRecentConvs]    = useState<RecentConv[]>([]);
  const [convsLoading,   setConvsLoading]   = useState(true);
  const [totalUnread,    setTotalUnread]    = useState(0);
  const [latestConvId,   setLatestConvId]   = useState<string|null>(null);
  const [showBanner,     setShowBanner]     = useState(false);
  const [followedBiz,    setFollowedBiz]    = useState<FollowedBusiness[]>([]);
  const [followedBizLoading, setFollowedBizLoading] = useState(false);
  const [nearbyBiz,      setNearbyBiz]      = useState<NearbyBusiness[]>([]);
  const [nearbyLoading,  setNearbyLoading]  = useState(false);
  const [nearbyError,    setNearbyError]    = useState("");
  const [selectedRadius, setSelectedRadius] = useState<number>(() => {
    if (typeof window === "undefined") return 3000;
    const s = localStorage.getItem("nearbyRadius");
    return s ? parseInt(s) : 3000;
  });
  const [myReports,           setMyReports]           = useState<MyReport[]>([]);
  const [myReportsLoading,    setMyReportsLoading]    = useState(false);
  const [contentReports,      setContentReports]      = useState<ReportOnContent[]>([]);
  const [contentReportsLoading,setContentReportsLoading]=useState(false);
  const [reportNotifs,        setReportNotifs]        = useState<{message:string;type:string;id:string}[]>([]);
  const [announcements,       setAnnouncements]       = useState<Announcement[]>([]);
  const [seenAnnouncements,   setSeenAnnouncements]   = useState<Set<string>>(new Set());
  const [bannerOpen,          setBannerOpen]          = useState(false);
  const [glowActive,          setGlowActive]          = useState(false);
  const [annsLoaded,          setAnnsLoaded]          = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (user) { setProfileName(user.name); setProfileEmail(user.email); } }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) { setStatsLoading(false); return; }
    setStatsLoading(true);
    fetch(`${API}/user/profile`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => { const ct = r.headers.get("content-type")||""; if (!ct.includes("application/json")) throw new Error("HTML"); return r.json(); })
      .then(data => { if (data.stats) setStats(data.stats); if (data.name) setProfileName(data.name); if (data.email) setProfileEmail(data.email); if (data.avatar && data.avatar !== user.avatar) updateUser({ avatar: data.avatar }); })
      .catch(err => console.warn("[profile] Stats:", err.message))
      .finally(() => setStatsLoading(false));
  }, [user?.id]);

  const loadAnnouncements = useCallback(async () => {
    const token = getToken();
    if (!token || annsLoaded) return;
    try {
      const res = await fetch(`${API}/announcements/active`, { headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const items: Announcement[] = data.announcements||[];
      const now = new Date();
      const active = items.filter(a => new Date(a.expiresAt) > now);
      setAnnouncements(active);
      const seen = new Set<string>();
      active.forEach(a => { if (localStorage.getItem(`profile_ann_seen_${a._id}`)) seen.add(a._id); });
      setSeenAnnouncements(seen);
      const securitySeen  = !!localStorage.getItem(SECURITY_SEEN_KEY);
      const hasUnseenAnn  = active.some(a => !localStorage.getItem(`profile_ann_seen_${a._id}`));
      if (hasUnseenAnn || !securitySeen) { setGlowActive(true); setTimeout(()=>setGlowActive(false), 8000); }
      setAnnsLoaded(true);
    } catch {}
  }, [annsLoaded]);

  useEffect(() => { if (user) loadAnnouncements(); }, [user?.id, loadAnnouncements]);

  const loadMyReports = useCallback(async () => {
    const token = getToken(); if (!token) return;
    setMyReportsLoading(true);
    try { const res = await fetch(`${API}/reports/my-reports`, { headers:{ Authorization:`Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setMyReports(data.reports||[]); } } catch {} finally { setMyReportsLoading(false); }
  }, []);

  const loadContentReports = useCallback(async () => {
    const token = getToken(); if (!token) return;
    setContentReportsLoading(true);
    try { const res = await fetch(`${API}/reports/on-my-content`, { headers:{ Authorization:`Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setContentReports(data.reports||[]); } } catch {} finally { setContentReportsLoading(false); }
  }, []);

  useEffect(() => { if (!user) return; loadMyReports(); if (user.role === "seller") loadContentReports(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const token = getToken(); if (!token) return;
    setFollowedBizLoading(true);
    fetch(`${API}/user/following-businesses`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setFollowedBiz(Array.isArray(data)?data:[]))
      .catch(()=>setFollowedBiz([]))
      .finally(()=>setFollowedBizLoading(false));
  }, [user?.id]);

  // ── fetchNearby — recibe siempre las coords actuales ─────────────────────
  const fetchNearby = useCallback(async (lat: number, lng: number, radius: number) => {
    setNearbyLoading(true);
    setNearbyError("");
    try {
      const effectiveRadius = radius === 0 ? 999999999 : radius;
      const res = await fetch(`${API}/business/nearby?lat=${lat}&lng=${lng}&radius=${effectiveRadius}`);
      if (!res.ok) throw new Error();
      const data: NearbyBusiness[] = await res.json();
      setNearbyBiz(data);
    } catch { setNearbyError("No se pudieron cargar los negocios cercanos."); }
    finally  { setNearbyLoading(false); }
  }, []);

  /**
   * Re-fetch automático cada vez que el GPS actualiza las coordenadas.
   * Si el GPS está denegado y el perfil tiene coords guardadas, usa esas como fallback.
   */
  useEffect(() => {
    if (gps.status === "idle" || gps.status === "loading") return;

    const u = user as any;

    if (gps.status === "ok" && gps.lat !== null && gps.lng !== null) {
      // 📍 Ubicación real del dispositivo → siempre la más fresca
      fetchNearby(gps.lat, gps.lng, selectedRadius);
    } else if ((gps.status === "denied" || gps.status === "error") && u?.locationEnabled && u?.lat && u?.lng) {
      // GPS bloqueado → fallback a la dirección guardada en el perfil
      fetchNearby(u.lat, u.lng, selectedRadius);
    }
    // Si no hay ninguna ubicación disponible no hacemos nada
  }, [gps.lat, gps.lng, gps.status, selectedRadius]);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setSelectedRadius(newRadius);
    localStorage.setItem("nearbyRadius", String(newRadius));
    // El useEffect anterior se dispara automáticamente al cambiar selectedRadius
  }, []);

  const loadConvs = useCallback(async () => {
    const token = getToken(); if (!token) { setConvsLoading(false); return; }
    setConvsLoading(true);
    try {
      const res = await fetch(`${API}/chat/conversations`, { headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data: RecentConv[] = await res.json();
      const sorted = data.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setRecentConvs(sorted.slice(0,5));
      const unread = sorted.reduce((acc,c) => acc+(c.unreadCount||0), 0);
      setTotalUnread(unread);
      const firstUnread = sorted.find(c=>c.unreadCount>0);
      if (firstUnread) setLatestConvId(firstUnread._id);
      if (unread > 0) setShowBanner(true);
    } catch { setRecentConvs([]); } finally { setConvsLoading(false); }
  }, []);

  useEffect(() => { if (user) loadConvs(); }, [user?.id, loadConvs]);

  useEffect(() => {
    const token = getToken(); if (!token || !user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/chat/conversations`, { headers:{ Authorization:`Bearer ${token}` } });
        if (!res.ok) return;
        const data: RecentConv[] = await res.json();
        const sorted = data.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const unread = sorted.reduce((acc,c) => acc+(c.unreadCount||0), 0);
        setTotalUnread(unread); setRecentConvs(sorted.slice(0,5));
        const firstUnread = sorted.find(c=>c.unreadCount>0);
        if (firstUnread) setLatestConvId(firstUnread._id);
        if (unread > 0) setShowBanner(true);
      } catch {}
    }, 15_000);
    const socket = io(WS_URL, { auth:{ token }, reconnectionAttempts:5 });
    socketRef.current = socket;
    socket.on("new_message", (msg:any) => {
      const userId = (user as any)?._id||(user as any)?.id||"";
      if (msg.sender?._id === userId) return;
      setRecentConvs(prev => {
        const exists = prev.find(c => c._id === msg.conversation);
        let updated: RecentConv[];
        if (exists) {
          updated = prev.map(c => c._id !== msg.conversation ? c : { ...c, lastMessage:{ text:msg.text, image:msg.image, createdAt:msg.createdAt }, updatedAt:msg.createdAt, unreadCount:c.unreadCount+1 });
        } else { loadConvs(); return prev; }
        const sorted = [...updated].sort((a,b) => new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
        setTotalUnread(sorted.reduce((acc,c)=>acc+c.unreadCount,0));
        const firstUnread = sorted.find(c=>c.unreadCount>0);
        if (firstUnread) setLatestConvId(firstUnread._id);
        setShowBanner(true);
        return sorted;
      });
    });
    socket.on("report_action_taken", (data:any)  => { setReportNotifs(p=>[{ id:Date.now().toString(), message:data.message, type:data.isDismissed?"info":"success" },...p.slice(0,4)]); loadMyReports(); });
    socket.on("report_received",     (data:any)  => { setReportNotifs(p=>[{ id:Date.now().toString(), message:data.message, type:"warning" },...p.slice(0,4)]); if((user as any)?.role==="seller") loadContentReports(); });
    socket.on("report_resolved",     (data:any)  => { setReportNotifs(p=>[{ id:Date.now().toString(), message:data.message, type:"info" },...p.slice(0,4)]); if((user as any)?.role==="seller") loadContentReports(); });
    socket.on("product_moderated",   (data:any)  => { setReportNotifs(p=>[{ id:Date.now().toString(), message:data.message, type:data.action==="unblock"?"success":data.action==="permanent_block"?"error":"warning" },...p.slice(0,4)]); if((user as any)?.role==="seller") loadContentReports(); });
    socket.on("product_deleted_admin",(data:any) => { setReportNotifs(p=>[{ id:Date.now().toString(), message:data.message, type:"error" },...p.slice(0,4)]); });
    socket.on("new_announcement",    (ann:Announcement) => { setAnnouncements(p => p.some(a=>a._id===ann._id)?p:[ann,...p]); setGlowActive(true); setTimeout(()=>setGlowActive(false),8000); });
    socket.on("subscription_expiring",(data:any) => { setReportNotifs(p=>[{ id:Date.now().toString(), message:data.message, type:"warning" },...p.slice(0,4)]); });
    return () => { clearInterval(interval); socket.disconnect(); };
  }, [user?.id, loadConvs]);

  if (loading || !user) return null;

  const u             = user as any;
  // La ubicación "activa" para mostrar coords en sidebar es la del GPS o la del perfil
  const displayLat    = gps.status === "ok" ? gps.lat : u.lat;
  const displayLng    = gps.status === "ok" ? gps.lng : u.lng;
  const locationActive = gps.status === "ok" || !!(u.locationEnabled && u.lat && u.lng);

  const nowAnn        = new Date();
  const activeAnns    = announcements.filter(a => new Date(a.expiresAt) > nowAnn);
  const hasUnseenAnn  = activeAnns.some(a => !seenAnnouncements.has(a._id));

  const openBanner = () => { localStorage.setItem(SECURITY_SEEN_KEY, Date.now().toString()); setGlowActive(false); setBannerOpen(true); };
  const handleSeenAnnouncement = (id: string) => { localStorage.setItem(`profile_ann_seen_${id}`, Date.now().toString()); setSeenAnnouncements(p => new Set([...p,id])); };

  // handleLocationToggle ahora solo activa GPS dinámico
  const handleLocationToggle = async () => {
    const Swal = (await import("sweetalert2")).default;
    if (gps.status === "ok") {
      // "Desactivar" en este modelo simplemente muestra aviso; el watch sigue activo
      Swal.fire({ icon:"info", title:"El GPS sigue activo en el dispositivo", text:"Para desactivarlo completamente, denegá el permiso desde el navegador.", confirmButtonColor:"#f97316" });
      return;
    }
    refreshGps();
    Swal.fire({ icon:"info", title:"Solicitando GPS…", timer:1500, showConfirmButton:false, toast:true, position:"top-end" });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    const Swal = (await import("sweetalert2")).default;
    setAvatarLoading(true);
    try {
      const fd = new FormData(); fd.append("avatar", file);
      const res = await fetch(`${API}/user/avatar`, { method:"POST", headers:{ Authorization:`Bearer ${getToken()}` }, body:fd });
      const ct = res.headers.get("content-type")||""; if (!ct.includes("application/json")) throw new Error("Respuesta inválida");
      const data = await res.json(); if (!res.ok) throw new Error(data.message||"Error subiendo avatar");
      updateUser({ avatar: data.avatar });
      Swal.fire({ icon:"success", title:"¡Avatar actualizado!", timer:1500, showConfirmButton:false, toast:true, position:"top-end" });
    } catch(err:any) { Swal.fire({ icon:"error", title:err.message||"Error", timer:2500, showConfirmButton:false, toast:true, position:"top-end" }); setAvatarPreview(null); }
    finally { setAvatarLoading(false); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const Swal = (await import("sweetalert2")).default;
    setProfileSaving(true);
    try {
      const res = await fetch(`${API}/user/update`, { method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ name:profileName, email:profileEmail }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message||"Error");
      updateUser({ name:data.user.name, email:data.user.email });
      Swal.fire({ icon:"success", title:"Datos guardados", timer:1500, showConfirmButton:false, toast:true, position:"top-end" });
    } catch(err:any) { Swal.fire({ icon:"error", title:err.message }); } finally { setProfileSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const Swal = (await import("sweetalert2")).default;
    if (newPwd !== confirmPwd) { Swal.fire({ icon:"warning", title:"Las contraseñas no coinciden" }); return; }
    if (newPwd.length < 6)    { Swal.fire({ icon:"warning", title:"Mínimo 6 caracteres" }); return; }
    setPwdSaving(true);
    try {
      const res = await fetch(`${API}/user/change-password`, { method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ currentPassword:currentPwd, newPassword:newPwd }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message||"Error");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      Swal.fire({ icon:"success", title:"Contraseña actualizada", timer:1800, showConfirmButton:false, toast:true, position:"top-end" });
    } catch(err:any) { Swal.fire({ icon:"error", title:err.message }); } finally { setPwdSaving(false); }
  };

  const handleNotifToggle = async () => {
    const Swal = (await import("sweetalert2")).default;
    if (user.notificationsEnabled) { updateUser({ notificationsEnabled:false }); Swal.fire({ icon:"info", title:"Notificaciones desactivadas", timer:1500, showConfirmButton:false, toast:true, position:"top-end" }); return; }
    if (!("Notification" in window)) { Swal.fire({ icon:"error", title:"No soportado" }); return; }
    if (Notification.permission === "denied") { Swal.fire({ icon:"warning", title:"Permisos bloqueados", html:"Hacé click en el candado 🔒 → Notificaciones → Permitir", confirmButtonColor:"#f97316" }); return; }
    Swal.fire({ title:"Activando...", allowOutsideClick:false, didOpen:()=>Swal.showLoading() });
    const ok = await enableNotifications();
    Swal.close();
    Swal.fire(ok ? { icon:"success", title:"¡Notificaciones activadas!", timer:2000, showConfirmButton:false, toast:true, position:"top-end" } : { icon:"warning", title:"No se pudo activar", confirmButtonColor:"#f97316" });
  };

  const handleLogout = async () => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({ title:"¿Cerrar sesión?", icon:"question", showCancelButton:true, confirmButtonText:"Sí, salir", cancelButtonText:"Cancelar", confirmButtonColor:"#ef4444" });
    if (isConfirmed) { logout(); router.push("/"); }
  };

  const handleUnfollow = async (bizId: string, bizName: string) => {
    const Swal = (await import("sweetalert2")).default;
    const { isConfirmed } = await Swal.fire({ title:`¿Dejar de seguir a ${bizName}?`, icon:"question", showCancelButton:true, confirmButtonText:"Sí, dejar", cancelButtonText:"Cancelar", confirmButtonColor:"#ef4444" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API}/business/${bizId}/unfollow`, { method:"POST", headers:{ Authorization:`Bearer ${getToken()}` } });
      if (res.ok) { setFollowedBiz(p=>p.filter(b=>b._id!==bizId)); Swal.fire({ icon:"info", title:"Dejaste de seguir", timer:1400, showConfirmButton:false, toast:true, position:"top-end" }); }
    } catch {}
  };

  const currentAvatar = avatarPreview || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=90&background=f97316&color=fff`;
  const statItems = [
    { icon:<TrendingUp size={14}/>, value:stats.purchases, label:"Compras" },
    { icon:<Heart size={14}/>,      value:stats.favorites, label:"Favoritos" },
    ...(user.role==="seller"?[{ icon:<LayoutGrid size={14}/>, value:stats.products, label:"Productos" }]:[]),
  ];
  const radiusLabel          = RADIUS_OPTIONS.find(o=>o.value===selectedRadius)?.label||"3 km";
  const pendingMyReports     = myReports.filter(r=>r.status==="pending").length;
  const pendingContentReports= contentReports.filter(r=>r.status==="pending").length;

  return (
    <MainLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes profileBannerSlideIn { from { opacity:0; transform:translateY(-20px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes profileGlowPulse { 0%,100% { box-shadow:0 0 0 0 rgba(249,115,22,0.0); } 50% { box-shadow:0 0 0 6px rgba(249,115,22,0.22),0 0 22px rgba(249,115,22,0.18); } }
      `}</style>

      {bannerOpen && <ProfileBannerModal announcements={activeAnns} seenAnnouncements={seenAnnouncements} onSeenAnnouncement={handleSeenAnnouncement} onClose={()=>setBannerOpen(false)}/>}

      <div className="profile-page">
        {/* Toasts reportes */}
        {reportNotifs.length > 0 && (
          <div style={{ position:"fixed", top:80, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:"0.5rem", maxWidth:360 }}>
            {reportNotifs.map(n => (
              <div key={n.id} style={{ padding:"0.75rem 1rem", borderRadius:12, background:n.type==="success"?"rgba(34,197,94,0.15)":n.type==="warning"?"rgba(245,158,11,0.15)":n.type==="error"?"rgba(239,68,68,0.15)":"rgba(96,165,250,0.15)", border:`1px solid ${n.type==="success"?"rgba(34,197,94,0.3)":n.type==="warning"?"rgba(245,158,11,0.3)":n.type==="error"?"rgba(239,68,68,0.3)":"rgba(96,165,250,0.3)"}`, color:n.type==="success"?"#4ade80":n.type==="warning"?"#f59e0b":n.type==="error"?"#f87171":"#93c5fd", fontSize:"0.82rem", fontWeight:600, backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-start", gap:8, boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
                <Flag size={14} style={{ flexShrink:0, marginTop:1 }}/>
                <span style={{ flex:1, lineHeight:1.4 }}>{n.message}</span>
                <button onClick={()=>setReportNotifs(p=>p.filter(x=>x.id!==n.id))} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, flexShrink:0 }}><X size={13}/></button>
              </div>
            ))}
          </div>
        )}

        {showBanner && totalUnread > 0 && (
          <div className="profile-chat-banner">
            <div className="profile-chat-banner-left">
              <div className="profile-chat-banner-badge">{totalUnread>99?"99+":totalUnread}</div>
              <div>
                <p className="profile-chat-banner-title">💬 {totalUnread===1?"Tenés 1 mensaje nuevo":`Tenés ${totalUnread} mensajes sin leer`}</p>
                <p className="profile-chat-banner-sub">Alguien está esperando tu respuesta</p>
              </div>
            </div>
            <div className="profile-chat-banner-actions">
              <button className="profile-chat-banner-btn" onClick={()=>router.push(latestConvId?`/chatpage?conversationId=${latestConvId}`:"/chatpage")}><MessageCircle size={14}/> Ver chat</button>
              <button className="profile-chat-banner-close" onClick={()=>setShowBanner(false)}><X size={15}/></button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img src={currentAvatar} alt={user.name} className="profile-avatar"/>
            <button className="profile-avatar-btn" onClick={()=>avatarInputRef.current?.click()} disabled={avatarLoading}><Camera size={13}/></button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange}/>
            {avatarLoading && <div className="profile-avatar-loading"/>}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user.name}</div>
            <div className="profile-email"><Mail size={13} strokeWidth={1.75}/> {user.email}</div>
            <span className="profile-role">
              {user.role==="seller"?<><Store size={12} strokeWidth={1.75}/> Vendedor</>:user.role==="admin"?<><LayoutGrid size={12} strokeWidth={1.75}/> Administrador</>:<><ShoppingBag size={12} strokeWidth={1.75}/> Comprador</>}
            </span>
            <div style={{ marginTop:10 }}>
              <ProfileBannerTrigger hasUnseen={hasUnseenAnn} glowActive={glowActive} onClick={openBanner}/>
            </div>
          </div>
          <div className="profile-stats">
            {statItems.map(({icon,value,label})=>(
              <div key={label} className="profile-stat">
                <div className="profile-stat-num">{statsLoading?<span className="profile-stat-skeleton"/>:value}</div>
                <div className="profile-stat-label">{icon} {label}</div>
              </div>
            ))}
            <div className="profile-stat profile-stat--chat" onClick={()=>router.push("/chatpage")}>
              <div className="profile-stat-num">{totalUnread>0?<span className="profile-stat-unread">{totalUnread>99?"99+":totalUnread}</span>:<MessageCircle size={20} strokeWidth={1.75} style={{ color:"#f97316" }}/>}</div>
              <div className="profile-stat-label"><MessageCircle size={14}/> Mensajes</div>
            </div>
          </div>
        </div>

        <div className="profile-body">
          {/* SIDEBAR */}
          <div className="profile-sidebar">
            <div className="profile-card">
              <h3>Configuración</h3>
              <div className="profile-setting">
                <div className="profile-setting-info">
                  <h4><Bell size={13} strokeWidth={1.75}/> Notificaciones</h4>
                  <p>{user.notificationsEnabled?"Activas":"Inactivas"}</p>
                </div>
                <label className="toggle"><input type="checkbox" checked={!!user.notificationsEnabled} onChange={handleNotifToggle}/><span className="toggle-slider"/></label>
              </div>

              {/* Toggle de ubicación → ahora refleja el GPS dinámico */}
              <div className="profile-setting">
                <div className="profile-setting-info">
                  <h4>
                    <MapPin size={13} strokeWidth={1.75}/> Ubicación
                    {gps.status === "ok" && <CheckCircle2 size={11} style={{ color:"#4ade80", marginLeft:4, display:"inline" }}/>}
                  </h4>
                  <p style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    {gps.status === "loading" && "Obteniendo GPS…"}
                    {gps.status === "ok"      && `GPS activo · ${radiusLabel}`}
                    {(gps.status === "denied" || gps.status === "error") && (u.lat ? `Perfil · ${radiusLabel}` : "Sin ubicación")}
                    {gps.status === "idle"    && "Inactiva"}
                  </p>
                  {/* Badge GPS inline en sidebar */}
                  <GpsBadge gps={gps} onRefresh={refreshGps}/>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={locationActive} onChange={handleLocationToggle}/>
                  <span className="toggle-slider"/>
                </label>
              </div>

              {locationActive && (
                <div style={{ marginTop:"0.15rem", paddingTop:"0.6rem", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ fontSize:"0.73rem", color:"rgba(255,255,255,0.6)", fontWeight:600, marginBottom:"0.1rem" }}>Radio de búsqueda</p>
                  <RadiusSelector value={selectedRadius} onChange={handleRadiusChange} disabled={nearbyLoading}/>
                </div>
              )}

              {displayLat && (
                <div className="profile-coords" style={{ marginTop:"0.5rem" }}>
                  <Pin size={12} strokeWidth={1.75}/>
                  {displayLat.toFixed(4)}, {displayLng?.toFixed(4)}
                  {gps.status === "ok" && <span style={{ fontSize:"0.65rem", color:"#4ade80", marginLeft:4 }}>• live</span>}
                  <button onClick={refreshGps} title="Actualizar GPS" style={{ background:"none", border:"none", cursor:"pointer", color:"#f97316", padding:"0 4px", display:"inline-flex", alignItems:"center" }}><RefreshCw size={11}/></button>
                </div>
              )}
            </div>

            <div className="profile-card">
              <h3>Accesos rápidos</h3>
              <div className="profile-quick-links">
                <Link href="/mis-productos" className="btn btn-outline profile-quick-btn"><Package size={15} strokeWidth={1.75}/> Mis productos</Link>
                {u.businessId && <Link href={`/negocio?id=${u.businessId}`} className="btn btn-outline profile-quick-btn"><Store size={15} strokeWidth={1.75}/> Mi negocio</Link>}
                <Link href={latestConvId&&totalUnread>0?`/chatpage?conversationId=${latestConvId}`:"/chatpage"} className="btn profile-quick-btn profile-chat-btn">
                  <MessageCircle size={15} strokeWidth={1.75}/>
                  {totalUnread>0?`Ver chats (${totalUnread>99?"99+":totalUnread})`:"Ir a mis chats"}
                  {totalUnread>0?<span className="profile-chat-badge">{totalUnread>99?"99+":totalUnread}</span>:<ExternalLink size={13} style={{ marginLeft:"auto", opacity:0.5 }}/>}
                </Link>
                <button className="btn btn-ghost profile-logout-btn" onClick={handleLogout}><LogOut size={15} strokeWidth={1.75}/> Cerrar sesión</button>
              </div>
            </div>
          </div>

          {/* MAIN */}
          <div className="profile-main">

            {/* NEGOCIOS CERCANOS */}
            <div className="profile-card">
              <div className="profile-chat-header">
                <h3>
                  <Navigation size={15} strokeWidth={1.75}/>
                  Negocios cerca tuyo
                  {nearbyBiz.length>0 && <span className="profile-chat-badge profile-chat-badge--title">{nearbyBiz.length}</span>}
                </h3>
                {locationActive && (
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                    <div style={{ display:"flex", gap:"0.25rem", flexWrap:"wrap" }}>
                      {RADIUS_OPTIONS.map(opt=>(
                        <button key={opt.value} onClick={()=>handleRadiusChange(opt.value)} disabled={nearbyLoading}
                          style={{ padding:"0.22rem 0.6rem", borderRadius:20, border:`1.5px solid ${opt.value===selectedRadius?"#f97316":"#111"}`, background:opt.value===selectedRadius?"#f97316":"#fff", color:opt.value===selectedRadius?"#fff":"#111", fontSize:"0.7rem", fontWeight:opt.value===selectedRadius?700:500, cursor:nearbyLoading?"not-allowed":"pointer", transition:"all 0.15s", whiteSpace:"nowrap", opacity:nearbyLoading?0.5:1 }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={refreshGps} disabled={nearbyLoading}
                      style={{ background:"none", border:"1px solid rgba(249,115,22,0.3)", borderRadius:8, padding:"0.28rem 0.6rem", color:"#f97316", fontSize:"0.72rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                      <RefreshCw size={10} style={{ animation:nearbyLoading?"spin 1s linear infinite":"none" }}/>
                    </button>
                  </div>
                )}
              </div>

              {/* Estado GPS pendiente */}
              {(gps.status==="idle"||gps.status==="loading") && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#fef9f0", border:"1px solid #fed7aa", borderRadius:8, marginBottom:12, fontSize:"0.8rem", color:"#92400e" }}>
                  <div style={{ width:14, height:14, border:"2px solid #f97316", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }}/>
                  Obteniendo tu ubicación actual…
                </div>
              )}

              {!locationActive ? (
                <div className="profile-chat-empty">
                  <div style={{ width:56, height:56, borderRadius:"50%", margin:"0 auto 1rem", background:"linear-gradient(135deg,rgba(249,115,22,0.2),rgba(249,115,22,0.05))", border:"1.5px solid rgba(249,115,22,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}><MapPin size={24} style={{ color:"#f97316" }}/></div>
                  <p style={{ fontWeight:700, color:"rgba(255,255,255,0.85)", marginBottom:"0.4rem" }}>Activá tu ubicación</p>
                  <p style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.5)", marginBottom:"0.75rem", lineHeight:1.5 }}>Descubrí negocios cercanos y elegí el radio que mejor te sirva.</p>
                  <div style={{ marginBottom:"1rem" }}><RadiusSelector value={selectedRadius} onChange={setSelectedRadius}/></div>
                  <button onClick={handleLocationToggle} style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", borderRadius:10, padding:"0.6rem 1.4rem", color:"#fff", fontWeight:700, fontSize:"0.85rem", cursor:"pointer", display:"flex", alignItems:"center", gap:6, margin:"0 auto", boxShadow:"0 4px 14px rgba(249,115,22,0.35)" }}>
                    <Navigation size={15}/> Activar · buscar en {radiusLabel}
                  </button>
                </div>
              ) : nearbyLoading ? (
                <div className="profile-chat-skeletons">{[...Array(3)].map((_,i)=><div key={i} className="profile-chat-skeleton"/>)}</div>
              ) : nearbyError ? (
                <div className="profile-chat-empty">
                  <p style={{ color:"#fca5a5" }}>{nearbyError}</p>
                  <button onClick={refreshGps} style={{ marginTop:"0.5rem", color:"#f97316", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Reintentar</button>
                </div>
              ) : nearbyBiz.length === 0 ? (
                <div className="profile-chat-empty">
                  <Store size={32} strokeWidth={1} style={{ color:"#d1d5db" }}/>
                  <p>No hay negocios en {radiusLabel}.</p>
                  <p style={{ fontSize:"0.8rem", color:"#bbb", marginBottom:"0.75rem" }}>Probá con un radio más amplio:</p>
                  <RadiusSelector value={selectedRadius} onChange={handleRadiusChange} disabled={nearbyLoading}/>
                </div>
              ) : (
                <div className="profile-followed-biz-list">
                  {nearbyBiz.map(biz=>(
                    <div key={biz._id} className="profile-followed-biz-item">
                      <Link href={`/negocio/${biz._id}`} className="profile-followed-biz-info">
                        <img src={bizLogoUrl(biz.name,biz.logo)} alt={biz.name} className="profile-followed-biz-logo" onError={e=>{(e.target as HTMLImageElement).src=`https://ui-avatars.com/api/?name=${encodeURIComponent(biz.name)}&background=f97316&color=fff&size=80`;}}/>
                        <div className="profile-followed-biz-meta">
                          <div className="profile-followed-biz-name">{biz.name}{biz.verified&&<span style={{ color:"#f97316", fontSize:"0.75rem" }}>✓</span>}</div>
                          <div className="profile-followed-biz-sub">
                            <span style={{ display:"flex", alignItems:"center", gap:3, color:"#4ade80", fontWeight:700 }}><Navigation size={10}/> {biz.distanceLabel}</span>
                            {biz.address&&<span style={{ display:"flex", alignItems:"center", gap:3 }}><MapPin size={10}/> {biz.address.split(",").slice(0,2).join(",")}</span>}
                            {(biz.rating??0)>0&&<span style={{ display:"flex", alignItems:"center", gap:2 }}><Star size={10} fill="#f97316" stroke="#f97316"/>{biz.rating?.toFixed(1)} ({biz.totalRatings})</span>}
                          </div>
                        </div>
                      </Link>
                      <div className="profile-followed-biz-actions">
                        <Link href={`/negocio/${biz._id}`} className="profile-followed-biz-btn profile-followed-biz-btn--visit">Ver tienda</Link>
                        <ReportModal targetType="business" targetId={biz._id} targetName={biz.name} token={getToken()||""} onRequireAuth={async()=>{}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MIS REPORTES */}
            <div className="profile-card">
              <div className="profile-chat-header">
                <h3><Flag size={15} strokeWidth={1.75}/>Mis reportes enviados{pendingMyReports>0&&<span className="profile-chat-badge profile-chat-badge--title" style={{ background:"#f59e0b" }}>{pendingMyReports} pendiente{pendingMyReports!==1?"s":""}</span>}</h3>
                <button onClick={loadMyReports} style={{ background:"none", border:"none", cursor:"pointer", color:"#f97316", display:"flex", alignItems:"center", gap:4, fontSize:"0.78rem", fontWeight:600 }}><RefreshCw size={12} style={{ animation:myReportsLoading?"spin 1s linear infinite":"none" }}/></button>
              </div>
              {myReportsLoading ? (
                <div className="profile-chat-skeletons">{[...Array(2)].map((_,i)=><div key={i} className="profile-chat-skeleton"/>)}</div>
              ) : myReports.length===0 ? (
                <div className="profile-chat-empty"><Flag size={28} strokeWidth={1} style={{ color:"#d1d5db" }}/><p style={{ fontSize:"0.85rem" }}>No enviaste reportes aún.</p></div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                  {myReports.map(r=>(
                    <div key={r._id} style={{ background:"var(--surface-alt,rgba(255,255,255,0.04))", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"0.75rem 1rem", borderLeft:`3px solid ${r.status==="action_taken"?"#22c55e":r.status==="dismissed"?"#94a3b8":"#f59e0b"}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap", marginBottom:"0.35rem" }}>
                        <span style={{ fontSize:"0.8rem", fontWeight:700, color:"var(--text,#f1f5f9)", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {r.targetType==="product"?<Package size={12} style={{ display:"inline", marginRight:4 }}/>:<Store size={12} style={{ display:"inline", marginRight:4 }}/>}{r.targetName}
                        </span>
                        <ReportStatusChip status={r.status}/>
                      </div>
                      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", fontSize:"0.72rem", color:"rgba(255,255,255,0.45)", marginBottom:r.adminNote?"0.35rem":0 }}>
                        <span>{CATEGORY_LABELS[r.category]||r.category}</span>
                        <span><Clock size={9} style={{ display:"inline", marginRight:2 }}/>{new Date(r.createdAt).toLocaleDateString("es-AR")}</span>
                        {r.resolvedAt&&<span>Resuelto: {new Date(r.resolvedAt).toLocaleDateString("es-AR")}</span>}
                      </div>
                      {r.adminNote&&<div style={{ marginTop:"0.4rem", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:8, padding:"0.35rem 0.6rem", fontSize:"0.73rem", color:"rgba(253,186,116,0.9)", fontStyle:"italic" }}>💬 Nota del admin: "{r.adminNote}"</div>}
                      {r.adminAction&&r.adminAction!=="none"&&<div style={{ marginTop:"0.3rem", fontSize:"0.7rem", color:"#4ade80", fontWeight:700 }}>✅ Acciones: {r.adminAction.split(",").map((a:string)=>a.trim()).join(" · ")}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* REPORTES SOBRE MI CONTENIDO (solo vendedores) */}
            {u.role==="seller" && (
              <div className="profile-card">
                <div className="profile-chat-header">
                  <h3><AlertTriangle size={15} strokeWidth={1.75}/>Reportes sobre mi contenido{pendingContentReports>0&&<span className="profile-chat-badge profile-chat-badge--title" style={{ background:"#ef4444" }}>{pendingContentReports}</span>}</h3>
                  <button onClick={loadContentReports} style={{ background:"none", border:"none", cursor:"pointer", color:"#f97316", display:"flex", alignItems:"center", gap:4, fontSize:"0.78rem", fontWeight:600 }}><RefreshCw size={12} style={{ animation:contentReportsLoading?"spin 1s linear infinite":"none" }}/></button>
                </div>
                {contentReportsLoading ? (
                  <div className="profile-chat-skeletons">{[...Array(2)].map((_,i)=><div key={i} className="profile-chat-skeleton"/>)}</div>
                ) : contentReports.length===0 ? (
                  <div className="profile-chat-empty"><Shield size={28} strokeWidth={1} style={{ color:"#d1d5db" }}/><p style={{ fontSize:"0.85rem" }}>No tenés reportes sobre tu contenido. ¡Todo en orden!</p></div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                    {contentReports.map(r=>(
                      <div key={r._id} style={{ background:"var(--surface-alt,rgba(255,255,255,0.04))", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"0.75rem 1rem", borderLeft:`3px solid ${r.status==="action_taken"?"#ef4444":r.status==="dismissed"?"#94a3b8":"#f59e0b"}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap", marginBottom:"0.35rem" }}>
                          <span style={{ fontSize:"0.8rem", fontWeight:700, color:"var(--text,#f1f5f9)", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {r.targetType==="product"?<Package size={12} style={{ display:"inline", marginRight:4 }}/>:<Store size={12} style={{ display:"inline", marginRight:4 }}/>}{r.targetName}
                          </span>
                          <ReportStatusChip status={r.status}/>
                          {r.autoBlocked&&<span style={{ fontSize:"0.65rem", fontWeight:700, background:"rgba(239,68,68,0.15)", color:"#f87171", border:"1px solid rgba(239,68,68,0.3)", borderRadius:20, padding:"0.1rem 0.45rem" }}>Auto-bloqueado</span>}
                        </div>
                        <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.45)", marginBottom:"0.35rem" }}>{CATEGORY_LABELS[r.category]||r.category}<span style={{ marginLeft:"0.75rem" }}><Clock size={9} style={{ display:"inline", marginRight:2 }}/>{new Date(r.createdAt).toLocaleDateString("es-AR")}</span></div>
                        <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:8, padding:"0.35rem 0.6rem", marginBottom:"0.35rem", fontSize:"0.72rem", color:"rgba(252,165,165,0.85)", fontStyle:"italic" }}>"{r.reason}"</div>
                        {r.detectedKeywords?.length>0&&<div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap", marginBottom:"0.35rem" }}><span style={{ fontSize:"0.65rem", color:"#f87171", fontWeight:700 }}>Palabras:</span>{r.detectedKeywords.map(kw=><span key={kw} style={{ fontSize:"0.62rem", background:"rgba(239,68,68,0.12)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.2)", borderRadius:20, padding:"0.1rem 0.4rem", fontWeight:700 }}>{kw}</span>)}</div>}
                        {r.adminNote&&<div style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:8, padding:"0.35rem 0.6rem", fontSize:"0.73rem", color:"rgba(253,186,116,0.9)", fontStyle:"italic" }}>💬 Admin: "{r.adminNote}"</div>}
                        {r.adminAction&&r.adminAction!=="none"&&<div style={{ marginTop:"0.3rem", fontSize:"0.7rem", color:"#f87171", fontWeight:700 }}>🚨 Acciones: {r.adminAction.split(",").map((a:string)=>a.trim()).join(" · ")}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MENSAJES RECIENTES */}
            <div className="profile-card profile-chat-card">
              <div className="profile-chat-header">
                <h3><MessageCircle size={15} strokeWidth={1.75}/>Mensajes recientes{totalUnread>0&&<span className="profile-chat-badge profile-chat-badge--title">{totalUnread>99?"99+":totalUnread} nuevo{totalUnread!==1?"s":""}</span>}</h3>
                <Link href={latestConvId&&totalUnread>0?`/chatpage?conversationId=${latestConvId}`:"/chatpage"} className="profile-chat-see-all">Abrir chat <ExternalLink size={13}/></Link>
              </div>
              {convsLoading ? (
                <div className="profile-chat-skeletons">{[...Array(3)].map((_,i)=><div key={i} className="profile-chat-skeleton"/>)}</div>
              ) : recentConvs.length===0 ? (
                <div className="profile-chat-empty"><MessageCircle size={32} strokeWidth={1} style={{ color:"#d1d5db" }}/><p>No tenés conversaciones aún.</p><p style={{ fontSize:"0.8rem", color:"#bbb" }}>Visitá un negocio y contactalos para comenzar.</p></div>
              ) : (
                <div className="profile-chat-list">
                  {recentConvs.map(conv=>{
                    const lastText = conv.lastMessage?.image&&!conv.lastMessage?.text?"📷 Imagen":conv.lastMessage?.text||"";
                    return (
                      <Link key={conv._id} href={`/chatpage?conversationId=${conv._id}`} className={`profile-conv-item${conv.unreadCount>0?" has-unread":""}`}>
                        <div className="profile-conv-avatar-wrap">
                          <img src={avatarUrl(conv.other)} alt={conv.other?.name||"Usuario"} className="profile-conv-avatar" onError={e=>{(e.target as HTMLImageElement).src=`https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other?.name||"?")}&background=f97316&color=fff&size=80`;}}/>
                          {conv.unreadCount>0&&<span className="profile-conv-dot"/>}
                        </div>
                        <div className="profile-conv-info">
                          <div className="profile-conv-name">{conv.other?.name||"Usuario"}</div>
                          <div className={`profile-conv-last${conv.unreadCount>0?" unread":""}`}>{lastText||<span style={{ fontStyle:"italic", color:"#ccc" }}>Sin mensajes</span>}</div>
                        </div>
                        <div className="profile-conv-meta">
                          {conv.lastMessage&&<span className="profile-conv-time"><Clock size={10}/> {timeAgo(conv.lastMessage.createdAt)}</span>}
                          {conv.unreadCount>0&&<span className="profile-conv-badge">{conv.unreadCount>99?"99+":conv.unreadCount}</span>}
                        </div>
                      </Link>
                    );
                  })}
                  <Link href="/chatpage" className="profile-chat-all-btn">Ver todas las conversaciones <ChevronRight size={15}/></Link>
                </div>
              )}
            </div>

            {/* TIENDAS SEGUIDAS */}
            <div className="profile-card">
              <div className="profile-chat-header">
                <h3><Store size={15} strokeWidth={1.75}/>Tiendas que seguís{followedBiz.length>0&&<span className="profile-chat-badge profile-chat-badge--title">{followedBiz.length}</span>}</h3>
              </div>
              {followedBizLoading ? (
                <div className="profile-chat-skeletons">{[...Array(2)].map((_,i)=><div key={i} className="profile-chat-skeleton"/>)}</div>
              ) : followedBiz.length===0 ? (
                <div className="profile-chat-empty"><Store size={32} strokeWidth={1} style={{ color:"#d1d5db" }}/><p>No seguís ninguna tienda aún.</p><Link href="/" className="btn btn-primary" style={{ marginTop:"0.75rem", fontSize:"0.82rem", padding:"0.45rem 1rem" }}>Explorar tiendas</Link></div>
              ) : (
                <div className="profile-followed-biz-list">
                  {followedBiz.map(biz=>(
                    <div key={biz._id} className="profile-followed-biz-item">
                      <Link href={`/negocio/${biz._id}`} className="profile-followed-biz-info">
                        <img src={bizLogoUrl(biz.name,biz.logo)} alt={biz.name} className="profile-followed-biz-logo" onError={e=>{(e.target as HTMLImageElement).src=`https://ui-avatars.com/api/?name=${encodeURIComponent(biz.name)}&background=f97316&color=fff&size=80`;}}/>
                        <div className="profile-followed-biz-meta">
                          <div className="profile-followed-biz-name">{biz.name}{biz.verified&&<span style={{ color:"#f97316", fontSize:"0.75rem" }}>✓</span>}</div>
                          <div className="profile-followed-biz-sub">
                            {biz.city&&<span><MapPin size={10}/> {biz.city}</span>}
                            {(biz.rating??0)>0&&<span style={{ display:"flex", alignItems:"center", gap:2 }}><Star size={10} fill="#f97316" stroke="#f97316"/>{biz.rating?.toFixed(1)} ({biz.totalRatings})</span>}
                          </div>
                        </div>
                      </Link>
                      <div className="profile-followed-biz-actions">
                        <Link href={`/negocio/${biz._id}`} className="profile-followed-biz-btn profile-followed-biz-btn--visit">Ver tienda</Link>
                        <ReportModal targetType="business" targetId={biz._id} targetName={biz.name} token={getToken()||""} onRequireAuth={async()=>{}}/>
                        <button className="profile-followed-biz-btn profile-followed-biz-btn--unfollow" onClick={()=>handleUnfollow(biz._id,biz.name)}>Dejar de seguir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DATOS PERSONALES */}
            <div className="profile-card">
              <h3><User size={15} strokeWidth={1.75}/> Datos personales</h3>
              <form className="profile-form" onSubmit={handleSaveProfile}>
                <div className="profile-form-grid">
                  <div className="profile-field"><label>Nombre</label><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></div>
                  <div className="profile-field"><label>Email</label><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></div>
                </div>
                <button type="submit" className="btn btn-primary profile-save-btn" disabled={profileSaving}><Save size={15} strokeWidth={1.75}/>{profileSaving?"Guardando...":"Guardar cambios"}</button>
              </form>
            </div>

            {/* SEGURIDAD */}
            <div className="profile-card">
              <h3><KeyRound size={15} strokeWidth={1.75}/> Seguridad</h3>
              <form className="profile-form" onSubmit={handleChangePassword}>
                <div className="profile-form-grid profile-form-grid-3">
                  <div className="profile-field"><label>Contraseña actual</label><input type="password" placeholder="••••••" value={currentPwd} onChange={e=>setCurrentPwd(e.target.value)} required/></div>
                  <div className="profile-field"><label>Nueva contraseña</label><input type="password" placeholder="••••••" value={newPwd} onChange={e=>setNewPwd(e.target.value)} required/></div>
                  <div className="profile-field"><label>Confirmar nueva</label><input type="password" placeholder="••••••" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} required/></div>
                </div>
                <button type="submit" className="btn btn-outline profile-save-btn" disabled={pwdSaving}><KeyRound size={15} strokeWidth={1.75}/>{pwdSaving?"Cambiando...":"Cambiar contraseña"}</button>
              </form>
              <div className="profile-card" style={{ borderColor:"rgba(239,68,68,0.3)" }}>
                <h3 style={{ color:"#ef4444" }}><AlertTriangle size={15} strokeWidth={1.75}/> Zona de peligro</h3>
                <div className="profile-danger-zone">
                  <div className="profile-danger-info"><h4>Eliminar cuenta permanentemente</h4><p>Una vez eliminada, no podrás recuperar tus datos, productos ni conversaciones.</p></div>
                  <Link href="/eliminausuario" className="profile-danger-btn"><XCircle size={16} strokeWidth={1.75}/>Eliminar cuenta</Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
