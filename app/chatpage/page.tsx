"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import Link from "next/link";

import ReportModal from "../componentes/reportModal";
import {
  Send,
  ImageIcon,
  Trash2,
  ArrowLeft,
  Search,
  CheckCheck,
  Check,
  X,
  MessageCircle,
  Loader2,
  SmilePlus,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Bell,
  Flag,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import "../styles/chatpage.css";

const API = "https://vercel-backend-ochre-nine.vercel.app/api";
const WS_URL = "https://renderbackendconsocket.onrender.com";

const SECURITY_SEEN_KEY = "chat_security_seen_v1";

interface Participant {
  _id: string;
  name: string;
  logo?: string;
  avatar?: string;
}
interface ConvLastMsg {
  text?: string;
  image?: string;
  createdAt: string;
}
interface Conversation {
  _id: string;
  participants: Participant[];
  other: Participant;
  lastMessage?: ConvLastMsg | null;
  updatedAt: string;
  unreadCount: number;
  isBlocked?: boolean;
  blockedBy?: string | null;
}
interface Message {
  _id: string;
  conversation: string;
  sender: Participant;
  text?: string;
  image?: string;
  createdAt: string;
  readBy: string[];
}

interface Announcement {
  _id: string;
  title: string;
  message: string;
  audience: "all" | "seller" | "buyer";
  durationHours: number;
  link?: string;
  createdAt: string;
  expiresAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  const d = new Date(iso);
  if (diff < 86_400_000)
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString("es", { weekday: "short" });
  return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}
function timeFull(iso: string) {
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function dateSep(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 86_400_000) return "Hoy";
  if (diff < 2 * 86_400_000) return "Ayer";
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function avatarUrl(p?: Partial<Participant> | null) {
  if (p?.logo) return p.logo;
  if (p?.avatar) return p.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.name || "?")}&background=f97316&color=fff&size=96&bold=true`;
}

// ── FIX 1: Web Audio API — no depende de archivos externos ni sufre CORS/autoplay block ──
function playNotif() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);

    // Cerrar el contexto para liberar recursos
    oscillator.onended = () => ctx.close();
  } catch {
    /* silent */
  }
}

function ConvSkeleton() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
          }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            {[`${50 + i * 7}%`, `${40 + i * 5}%`].map((w, j) => (
              <div key={j} style={{
                height: j === 0 ? 13 : 11, width: w, borderRadius: 6,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s ease-in-out infinite",
              }} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Announcement countdown ───────────────────────────────────────────────────
function useCountdown(expiresAt: string) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setText("Expirado"); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setText(h > 0 ? `${h}h ${m}m restantes` : `${m}m restantes`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return text;
}

// ─── Banner Modal ─────────────────────────────────────────────────────────────
function BannerModal({
  announcements,
  seenAnnouncements,
  onSeenAnnouncement,
  onClose,
}: {
  announcements: Announcement[];
  seenAnnouncements: Set<string>;
  onSeenAnnouncement: (id: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const activeAnns = announcements.filter((a) => new Date(a.expiresAt) > now);
  const total = activeAnns.length + 1;
  const [idx, setIdx] = useState(() => {
    const firstUnseen = activeAnns.findIndex((a) => !seenAnnouncements.has(a._id));
    return firstUnseen >= 0 ? firstUnseen : 0;
  });

  const current = idx < activeAnns.length ? activeAnns[idx] : null;
  const isSecurity = idx >= activeAnns.length;

  useEffect(() => {
    if (current && !seenAnnouncements.has(current._id)) onSeenAnnouncement(current._id);
  }, [idx, current]);

  const countdown = current ? current.expiresAt : "";
  const cdText = useCountdown(countdown || new Date(Date.now() + 99999999).toISOString());

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "clamp(8px,3vw,24px)", paddingTop: "clamp(48px,8vh,96px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)",
          width: "100%", maxWidth: 420, overflow: "hidden",
          animation: "bannerSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{
          background: isSecurity
            ? "linear-gradient(135deg,#1e3a5f,#2563eb)"
            : "linear-gradient(135deg,#f97316,#ea580c)",
          padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSecurity ? <ShieldCheck size={18} color="#fff" /> : <Bell size={18} color="#fff" />}
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.88rem" }}>
              {isSecurity ? "Seguridad primero" : "Anuncio importante"}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8,
              padding: "4px 8px", cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          {isSecurity ? (
            <>
              <p style={{ fontSize: "0.84rem", color: "#374151", lineHeight: 1.65, margin: "0 0 14px" }}>
                Para tu tranquilidad, acordá el pago y la entrega por este chat.
                Nunca compartas fotos de tu tarjeta de crédito, claves de cajero
                ni datos bancarios sensibles. El trato es directo entre vos y el
                vendedor: la plataforma no interviene en las transacciones.
              </p>
              <a href="/terminos" style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: "0.78rem", color: "#2563eb", fontWeight: 600, textDecoration: "none",
              }}>
                <ExternalLink size={13} /> Ver términos y condiciones
              </a>
            </>
          ) : current ? (
            <>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111", margin: "0 0 10px" }}>
                {current.title}
              </h3>
              <p style={{ fontSize: "0.84rem", color: "#374151", lineHeight: 1.65, margin: "0 0 12px" }}>
                {current.message}
              </p>
              {current.link && (
                <a href={current.link} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: "0.78rem", color: "#f97316", fontWeight: 600,
                  textDecoration: "none", marginBottom: 10,
                }}>
                  <ExternalLink size={13} />
                  {current.link.length > 40 ? current.link.slice(0, 40) + "…" : current.link}
                </a>
              )}
              <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 4 }}>
                {countdown ? cdText : ""}
              </div>
            </>
          ) : null}
        </div>

        {total > 1 && (
          <div style={{
            borderTop: "1px solid #f0f0f0", padding: "12px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
              style={{ background: "none", border: "none", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1, padding: 4, display: "flex", alignItems: "center" }}>
              <ChevronLeft size={18} color="#6b7280" />
            </button>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {Array.from({ length: total }).map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} style={{
                  width: i === idx ? 20 : 7, height: 7, borderRadius: 999,
                  background: i === idx ? (i >= activeAnns.length ? "#2563eb" : "#f97316") : "#e5e7eb",
                  border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s",
                }} />
              ))}
            </div>
            <button onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} disabled={idx === total - 1}
              style={{ background: "none", border: "none", cursor: idx === total - 1 ? "not-allowed" : "pointer", opacity: idx === total - 1 ? 0.3 : 1, padding: 4, display: "flex", alignItems: "center" }}>
              <ChevronRight size={18} color="#6b7280" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Banner Trigger Button ────────────────────────────────────────────────────
function BannerTrigger({ hasUnseen, glowActive, onClick }: {
  hasUnseen: boolean;
  glowActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 13px", borderRadius: 10, border: "none",
        background: hasUnseen
          ? "linear-gradient(135deg,#f97316,#ea580c)"
          : "rgba(37,99,235,0.08)",
        color: hasUnseen ? "#fff" : "#2563eb",
        fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
        marginBottom: 10, position: "relative", transition: "all 0.2s",
        boxShadow: glowActive
          ? "0 0 0 4px rgba(249,115,22,0.18), 0 0 16px rgba(249,115,22,0.25)"
          : "none",
        animation: glowActive ? "glowPulse 1.8s ease-in-out infinite" : "none",
      }}
    >
      {hasUnseen ? <Bell size={14} /> : <ShieldCheck size={14} />}
      {hasUnseen ? "Nuevo anuncio" : "Aviso de seguridad"}
      {hasUnseen && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          width: 10, height: 10, borderRadius: "50%",
          background: "#ef4444", border: "2px solid #fff",
        }} />
      )}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
function ChatPageInner() {
  const { user } = useAuth();
  const router   = useRouter();
  const params   = useSearchParams();

  const token  = typeof window !== "undefined" ? localStorage.getItem("marketplace_token") : null;
  const userId = (user as any)?._id || (user as any)?.id || "";
  const isAdmin = (user as any)?.role === "admin";

  const [conversations, setConversations]   = useState<Conversation[]>([]);
  const [activeId, setActiveId]             = useState<string | null>(null);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [text, setText]                     = useState("");
  const [imgFile, setImgFile]               = useState<File | null>(null);
  const [imgPreview, setImgPreview]         = useState<string | null>(null);
  const [convsLoading, setConvsLoading]     = useState(true);
  const [msgsLoading, setMsgsLoading]       = useState(false);
  const [sending, setSending]               = useState(false);
  const [search, setSearch]                 = useState("");
  const [typing, setTyping]                 = useState(false);
  const [mobileView, setMobileView]         = useState<"list" | "chat">("list");
  const [lightbox, setLightbox]             = useState<string | null>(null);

  // ── Banner state ──────────────────────────────────────────────────────────
  const [announcements, setAnnouncements]         = useState<Announcement[]>([]);
  const [seenAnnouncements, setSeenAnnouncements] = useState<Set<string>>(new Set());
  const [bannerOpen, setBannerOpen]               = useState(false);
  const [glowActive, setGlowActive]               = useState(false);

  // ── Report / blocked state ────────────────────────────────────────────────
  const [reportTarget, setReportTarget] = useState<Participant | null>(null);
  const [convBlocked, setConvBlocked]   = useState<{ isBlocked: boolean; blockedBy: string | null } | null>(null);

  const convsLoadedRef = useRef(false);
  const socketRef      = useRef<Socket | null>(null);
  const msgsEndRef     = useRef<HTMLDivElement | null>(null);
  const msgsAreaRef    = useRef<HTMLDivElement | null>(null);
  const fileRef        = useRef<HTMLInputElement | null>(null);
  const typingTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef    = useRef<string | null>(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const activeConv = conversations.find((c) => c._id === activeId) ?? null;
  const effectiveConv =
    activeConv ??
    (activeId
      ? ({
          _id: activeId, participants: [],
          other: { _id: "", name: "Cargando...", logo: undefined, avatar: undefined },
          lastMessage: null, updatedAt: new Date().toISOString(), unreadCount: 0,
        } as Conversation)
      : null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    // ── FIX 4: setTimeout 0 para esperar que el DOM se actualice ──
    setTimeout(() => {
      msgsEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }, 0);
  }, []);

  // ── Load announcements ────────────────────────────────────────────────────
  const loadAnnouncements = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/announcements/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const items: Announcement[] = data.announcements || [];
      const now = new Date();
      const active = items.filter((a) => new Date(a.expiresAt) > now);
      setAnnouncements(active);
      const seen = new Set<string>();
      active.forEach((a) => {
        if (localStorage.getItem(`chat_ann_seen_${a._id}`)) seen.add(a._id);
      });
      setSeenAnnouncements(seen);
      return active;
    } catch { /* silent */ }
    return [];
  }, [token]);

  useEffect(() => {
    if (!convsLoading && !convsLoadedRef.current) {
      convsLoadedRef.current = true;
      loadAnnouncements().then((active) => {
        if (!active) return;
        const now = new Date();
        const validActive = active.filter((a) => new Date(a.expiresAt) > now);
        const securitySeen = !!localStorage.getItem(SECURITY_SEEN_KEY);
        const hasUnseenAnn = validActive.some((a) => !localStorage.getItem(`chat_ann_seen_${a._id}`));
        if (hasUnseenAnn || !securitySeen) {
          setGlowActive(true);
          setTimeout(() => setGlowActive(false), 8000);
        }
      });
    }
  }, [convsLoading, loadAnnouncements]);

  const handleSeenAnnouncement = (id: string) => {
    localStorage.setItem(`chat_ann_seen_${id}`, Date.now().toString());
    setSeenAnnouncements((prev) => new Set([...prev, id]));
  };

  const openBanner = () => {
    localStorage.setItem(SECURITY_SEEN_KEY, Date.now().toString());
    setGlowActive(false);
    setBannerOpen(true);
  };

  const now = new Date();
  const activeAnns   = announcements.filter((a) => new Date(a.expiresAt) > now);
  const hasUnseenAnn = activeAnns.some((a) => !seenAnnouncements.has(a._id));

  // ── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(WS_URL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // ── FIX 2: Al conectar/reconectar:
    //    1) unirse a sala personal user_${userId} (donde el backend emite new_message)
    //    2) re-join conversación activa si ya hay una abierta ──
    socket.on("connect", () => {
      console.log("[socket] conectado", socket.id);
      // CRÍTICO: el backend hace io.to(`user_${pid}`).emit(...)
      // sin esta línea nunca llegan los mensajes en tiempo real
      if (userId) socket.emit("join_user_room", { userId });
      if (activeIdRef.current) {
        socket.emit("join_conv", { conversationId: activeIdRef.current });
      }
    });

    socket.on("new_message", (msg: Message) => {
      const isActive = msg.conversation === activeIdRef.current;
      const isMe     = msg.sender._id === userId;

      if (isActive) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
        fetch(`${API}/chat/conversations/${msg.conversation}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // ── Solo sonar si el mensaje es de otra persona ──
      if (!isMe) playNotif();

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === msg.conversation);
        const updated = prev.map((c) =>
          c._id !== msg.conversation ? c : {
            ...c,
            lastMessage: { text: msg.text, image: msg.image, createdAt: msg.createdAt },
            updatedAt:   msg.createdAt,
            unreadCount: isActive ? 0 : c.unreadCount + (isMe ? 0 : 1),
          }
        );
        if (!exists) {
          fetch(`${API}/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data: Conversation[]) => {
              setConversations(data.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              ));
            })
            .catch(() => {});
          return prev;
        }
        return [...updated].sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });

    socket.on("messages_read", ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeIdRef.current)
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            readBy: m.readBy.includes(userId) ? m.readBy : [...m.readBy, userId],
          }))
        );
    });

    socket.on("typing", ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeIdRef.current) setTyping(true);
    });
    socket.on("stop_typing", ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeIdRef.current) setTyping(false);
    });
    socket.on("message_deleted", ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (conversationId === activeIdRef.current)
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on("conversation_blocked", ({ conversationId, blockedBy }: { conversationId: string; blockedBy: string; reason: string }) => {
      setConversations(prev => prev.map(c =>
        c._id === conversationId ? { ...c, isBlocked: true, blockedBy } : c
      ));
      if (conversationId === activeIdRef.current) {
        setConvBlocked({ isBlocked: true, blockedBy });
      }
    });

    socket.on("conversation_unblocked", ({ conversationId }: { conversationId: string }) => {
      setConversations(prev => prev.map(c =>
        c._id === conversationId ? { ...c, isBlocked: false, blockedBy: null } : c
      ));
      if (conversationId === activeIdRef.current) {
        setConvBlocked(null);
      }
    });

    socket.on("new_announcement", (ann: Announcement) => {
      setAnnouncements((prev) => prev.some((a) => a._id === ann._id) ? prev : [ann, ...prev]);
      setGlowActive(true);
      setTimeout(() => setGlowActive(false), 8000);
    });

    socket.on("disconnect", (reason) => console.log("[socket] desconectado:", reason));

    return () => { socket.disconnect(); };
  }, [token, userId]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setConvsLoading(true);
    try {
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: Conversation[] = await res.json();
      setConversations(data.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch { /* silent */ }
    finally { setConvsLoading(false); }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!token || convsLoading) return;
    const convId = params.get("conversationId");
    const bId    = params.get("businessId");
    if (convId) {
      const exists = conversations.find((c) => c._id === convId);
      if (exists) { openConversation(convId); } else {
        (async () => { await loadConversations(); openConversation(convId); })();
      }
      return;
    }
    if (bId) {
      (async () => {
        try {
          const res = await fetch(`${API}/chat/start`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: bId }),
          });
          const data = await res.json();
          if (data._id) { await loadConversations(); openConversation(data._id); }
        } catch { /* silent */ }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, token, convsLoading]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setTyping(false);
    setMessages([]);
    setConvBlocked(null);
    setMsgsLoading(true);
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c))
    );
    try {
      const res = await fetch(`${API}/chat/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) { setMessages([]); return; }
        throw new Error();
      }
      const data = await res.json();

      const msgs: Message[] = Array.isArray(data) ? data : (data.messages ?? []);
      setMessages(msgs);

      if (!Array.isArray(data) && data.isBlocked) {
        setConvBlocked({ isBlocked: true, blockedBy: data.blockedBy });
        setConversations(prev => prev.map(c =>
          c._id === id ? { ...c, isBlocked: true, blockedBy: data.blockedBy } : c
        ));
      }

      await fetch(`${API}/chat/conversations/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      socketRef.current?.emit("join_conv", { conversationId: id });
    } catch { /* silent */ }
    finally { setMsgsLoading(false); }
  };

  // ── FIX 4: scroll con setTimeout para esperar render del DOM ──
  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom(messages.length <= 2 ? "instant" : "smooth");
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (typing) scrollToBottom("smooth");
  }, [typing, scrollToBottom]);

  // ── FIX 3: handleSend agrega el mensaje desde la respuesta del backend ──
  const handleSend = async () => {
    if ((!text.trim() && !imgFile) || !activeId || sending) return;
    setSending(true);

    // Guardar valores antes de limpiar
    const sentText = text.trim();
    const sentFile = imgFile;

    // Limpiar UI inmediatamente (optimista)
    setText("");
    setImgFile(null);
    setImgPreview(null);
    const ta = document.querySelector<HTMLTextAreaElement>(".input-ta");
    if (ta) ta.style.height = "auto";

    socketRef.current?.emit("stop_typing", { conversationId: activeId });

    try {
      const fd = new FormData();
      fd.append("conversationId", activeId);
      if (sentText) fd.append("text", sentText);
      if (sentFile) fd.append("image", sentFile);

      const res = await fetch(`${API}/chat/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();

      // ── Parsear respuesta del backend y agregar si el socket no lo hizo aún ──
      const newMsg: Message = await res.json();
      if (newMsg?._id) {
        setMessages((prev) =>
          prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]
        );
        // Actualizar último mensaje en sidebar
        setConversations((prev) =>
          [...prev.map((c) =>
            c._id === activeId ? {
              ...c,
              lastMessage: { text: newMsg.text, image: newMsg.image, createdAt: newMsg.createdAt },
              updatedAt: newMsg.createdAt,
            } : c
          )].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        );
      }
    } catch {
      // Si falló, restaurar texto para que el usuario no pierda lo que escribió
      setText(sentText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!activeId) return;
    socketRef.current?.emit("typing", { conversationId: activeId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { conversationId: activeId });
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("La imagen no puede superar 5 MB"); return; }
    setImgFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Borrar esta conversación? Solo la eliminás de tu vista.")) return;
    try {
      await fetch(`${API}/chat/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); setMobileView("list"); }
    } catch { /* silent */ }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await fetch(`${API}/chat/messages/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    } catch { /* silent */ }
  };

  const filtered    = conversations.filter((c) =>
    c.other?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user)
    return (
      <MainLayout>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
          <MessageCircle size={52} strokeWidth={1.2} style={{ color: "#d1d5db" }} />
          <p style={{ fontWeight: 600, fontSize: "1.1rem", color: "#374151" }}>
            Necesitás iniciar sesión para ver tus chats
          </p>
          <button onClick={() => router.push("/login")} style={{
            background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
            border: "none", borderRadius: 12, padding: "11px 28px",
            fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
          }}>
            Iniciar sesión
          </button>
        </div>
      </MainLayout>
    );

  return (
    <MainLayout>
      <style>{`
        @keyframes bannerSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.0); }
          50%       { box-shadow: 0 0 0 6px rgba(249,115,22,0.22), 0 0 22px rgba(249,115,22,0.18); }
        }
        .ci + .ci {
          border-top: 1.5px solid transparent;
          background-clip: padding-box;
          position: relative;
        }
        .ci + .ci::before {
          content: '';
          position: absolute;
          top: 0; left: 14px; right: 14px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(249,115,22,0.28) 20%, rgba(249,115,22,0.28) 80%, transparent);
          pointer-events: none;
        }
      `}</style>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="imagen" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} style={{
            position: "absolute", top: 20, right: 20,
            background: "rgba(255,255,255,.12)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.2)", color: "#fff",
            borderRadius: 12, padding: "9px 18px", cursor: "pointer",
            fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6,
          }}>
            <X size={15} /> Cerrar
          </button>
        </div>
      )}

      {/* ── Banner modal ── */}
      {bannerOpen && (
        <BannerModal
          announcements={activeAnns}
          seenAnnouncements={seenAnnouncements}
          onSeenAnnouncement={handleSeenAnnouncement}
          onClose={() => setBannerOpen(false)}
        />
      )}

      {/* ── Report modal ── */}
      {reportTarget && (
        <ReportModal
          targetType="user"
          targetId={reportTarget._id}
          targetName={reportTarget.name}
          token={token || ""}
          onRequireAuth={async () => router.push("/login")}
          isOpenExternal={true}
          onCloseExternal={() => setReportTarget(null)}
        />
      )}

      <div className="chat-root">
        {/* ══ SIDEBAR ══ */}
        <div className={`cs${mobileView === "chat" ? " hide" : ""}`}>
          <div className="cs-header">
            <h2 className="cs-title">
              <Link href="/" className="brand-link">
                <span className="brand-logo"><span className="brand-off">Off</span></span>
                <span className="brand-ertas">ertas</span>
              </Link>
              <MessageCircle size={20} className="chat-icon" />
              {totalUnread > 0 && (
                <span className="unread-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
              )}
            </h2>

            <BannerTrigger
              hasUnseen={hasUnseenAnn}
              glowActive={glowActive}
              onClick={openBanner}
            />

            <div className="cs-search">
              <Search size={14} style={{ color: "#bbb", flexShrink: 0 }} />
              <input
                placeholder="Buscar conversación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", lineHeight: 0, padding: 0 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="cs-list">
            {convsLoading ? (
              <ConvSkeleton />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#bbb" }}>
                <MessageCircle size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#888" }}>
                  {search ? "Sin resultados" : "No tenés conversaciones aún"}
                </p>
                {!search && (
                  <p style={{ fontSize: "0.8rem", color: "#bbb", marginTop: 4 }}>
                    Contactá un negocio para comenzar
                  </p>
                )}
              </div>
            ) : (
              filtered.map((conv, idx) => {
                const isActive = activeId === conv._id;
                const lastText =
                  conv.lastMessage?.image && !conv.lastMessage?.text
                    ? "Imagen"
                    : conv.lastMessage?.text || "";
                return (
                  <div
                    key={conv._id}
                    className={`ci${isActive ? " active" : ""}`}
                    onClick={() => openConversation(conv._id)}
                    style={{ borderTop: idx === 0 ? "none" : "1px solid rgba(249,115,22,0.13)" }}
                  >
                    {isActive && (
                      <div style={{
                        position: "absolute", left: 0, top: "15%", bottom: "15%",
                        width: 3, borderRadius: "0 3px 3px 0",
                        background: "linear-gradient(180deg,#f97316,#ea580c)",
                      }} />
                    )}
                    <img
                      src={avatarUrl(conv.other)}
                      alt={conv.other?.name || "Usuario"}
                      className="ci-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other?.name || "?")}&background=f97316&color=fff&size=96`;
                      }}
                    />
                    <div className="ci-info">
                      <div className="ci-name">{conv.other?.name || "Usuario"}</div>
                      <div className={`ci-last${conv.unreadCount > 0 ? " unread" : ""}`}>
                        {lastText || (
                          <span style={{ color: "#ccc", fontStyle: "italic", fontSize: "0.75rem" }}>
                            Sin mensajes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ci-meta">
                      <span className="ci-time">
                        {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ""}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <button className="ci-del" onClick={(e) => deleteConversation(conv._id, e)} title="Borrar conversación">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ══ CHAT AREA ══ */}
        <div className={`ca${mobileView === "chat" ? " active" : ""}`}>
          {!effectiveConv ? (
            <div className="ca-empty">
              <div className="ca-empty-icon">
                <MessageCircle size={36} style={{ color: "#f97316" }} strokeWidth={1.5} />
              </div>
              <h3>Seleccioná una conversación</h3>
              <p>O contactá un negocio desde su página<br />para comenzar a chatear</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="ca-header">
                <button
                  className="icon-btn btn-back-mobile btn-attach"
                  style={{ width: 36, height: 36 }}
                  onClick={() => { setMobileView("list"); setActiveId(null); }}
                >
                  <ArrowLeft size={18} />
                </button>

                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={avatarUrl(effectiveConv!.other)}
                    alt={effectiveConv!.other?.name}
                    style={{
                      width: 46, height: 46, borderRadius: "50%", objectFit: "cover",
                      border: "2px solid #ffe5cc", boxShadow: "0 2px 8px rgba(0,0,0,.1)", display: "block",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv!.other?.name || "?")}&background=f97316&color=fff&size=96`;
                    }}
                  />
                  <span style={{
                    position: "absolute", bottom: 1, right: 1,
                    width: 12, height: 12, borderRadius: "50%",
                    background: typing ? "#f97316" : "#22c55e",
                    border: "2px solid #fff", transition: "background .4s",
                    animation: typing ? "blink 1s ease-in-out infinite" : "none",
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ca-header-name">{effectiveConv!.other?.name}</div>
                  <div className="ca-header-sub">
                    {typing ? (
                      <>
                        <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.71rem" }}>escribiendo</span>
                        <span className="typing-header-dots">
                          <span className="typing-header-dot" />
                          <span className="typing-header-dot" />
                          <span className="typing-header-dot" />
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 2px rgba(34,197,94,.25)" }} />
                        <span>En línea</span>
                      </>
                    )}
                  </div>
                </div>

                {!isAdmin && effectiveConv?.other?._id && (
                  <button
                    onClick={() => setReportTarget(effectiveConv!.other)}
                    title={`Reportar a ${effectiveConv!.other?.name}`}
                    style={{
                      background: "rgba(239,68,68,0.07)",
                      border: "1.5px solid rgba(239,68,68,0.18)",
                      borderRadius: 10,
                      padding: "7px 12px",
                      cursor: "pointer",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      transition: "all .18s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.18)";
                    }}
                  >
                    <Flag size={13} />
                    <span style={{ display: "none" }} className="report-label-desktop">Reportar</span>
                  </button>
                )}
              </div>

              {/* Messages area */}
              <div className="ca-messages" ref={msgsAreaRef}>
                {convBlocked?.isBlocked && (
                  <div style={{
                    margin: "16px 16px 8px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1.5px solid rgba(239,68,68,0.25)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <ShieldCheck size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f87171", marginBottom: 3 }}>
                        Conversación bloqueada por reporte
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(248,113,113,0.7)", lineHeight: 1.5 }}>
                        {convBlocked.blockedBy === userId
                          ? "Reportaste a este usuario. El equipo está revisando el caso."
                          : "Esta conversación fue bloqueada por un reporte. El equipo está revisando el caso."}
                        {" "}Los mensajes anteriores siguen visibles.
                      </div>
                    </div>
                  </div>
                )}

                {msgsLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "#bbb", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: "0.85rem" }}>Cargando mensajes...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#bbb", fontSize: "0.85rem", padding: "3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <SmilePlus size={36} strokeWidth={1} />
                    <span>No hay mensajes aún.<br />¡Mandá el primero!</span>
                  </div>
                ) : (
                  (() => {
                    let lastDateLabel = "";
                    return messages.map((msg) => {
                      const mine      = msg.sender._id === userId;
                      const dateLabel = dateSep(msg.createdAt);
                      const showDate  = dateLabel !== lastDateLabel;
                      lastDateLabel   = dateLabel;
                      const allRead   = msg.readBy.length >= 2;
                      const imgOnly   = !!msg.image && !msg.text;
                      const canReport =
                        !mine &&
                        !isAdmin &&
                        effectiveConv?.other?._id === msg.sender._id;

                      return (
                        <div key={msg._id}>
                          {showDate && (
                            <div className="date-sep"><span>{dateLabel}</span></div>
                          )}
                          <div className={`brow ${mine ? "mine" : "theirs"}`}>
                            {!mine && (
                              <img
                                src={avatarUrl(effectiveConv?.other)}
                                alt=""
                                className="b-avatar"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv?.other?.name || "?")}&background=f97316&color=fff&size=56`;
                                }}
                              />
                            )}
                            <div className="b-wrap">
                              {mine && (
                                <button
                                  className="b-del-btn right"
                                  onClick={() => deleteMessage(msg._id)}
                                  title="Borrar"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                              {canReport && (
                                <button
                                  className="b-report-btn"
                                  onClick={() => setReportTarget(effectiveConv!.other)}
                                  title={`Reportar a ${effectiveConv!.other?.name}`}
                                >
                                  <Flag size={11} />
                                </button>
                              )}
                              <div className={`bubble ${mine ? "mine" : "theirs"}`}>
                                {msg.image && (
                                  <div className={`b-img-wrap${imgOnly ? " img-only" : ""}`}>
                                    <img
                                      src={msg.image}
                                      alt="imagen"
                                      className="b-img"
                                      onClick={() => setLightbox(msg.image!)}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                {msg.text && (
                                  <span style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                    {msg.text}
                                  </span>
                                )}
                                <div className={`b-meta${mine && allRead ? " read-ticks" : ""}`}>
                                  <span>{timeFull(msg.createdAt)}</span>
                                  {mine && (
                                    allRead
                                      ? <CheckCheck size={12} style={{ color: "#60a5fa" }} />
                                      : <Check size={12} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}

                {typing && (
                  <div className="brow theirs" style={{ alignItems: "flex-end", gap: 8 }}>
                    <img
                      src={avatarUrl(effectiveConv?.other)}
                      alt=""
                      className="b-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveConv?.other?.name || "?")}&background=f97316&color=fff&size=56`;
                      }}
                    />
                    <div className="typing-bubble">
                      <div className="t-dot" />
                      <div className="t-dot" />
                      <div className="t-dot" />
                    </div>
                  </div>
                )}

                <div ref={msgsEndRef} style={{ height: 1 }} />
              </div>

              {/* Image preview */}
              {imgPreview && (
                <div className="img-preview-bar">
                  <img src={imgPreview} alt="preview" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f97316" }}>Imagen lista</div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>
                      {imgFile?.name} · {((imgFile?.size || 0) / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button onClick={() => { setImgFile(null); setImgPreview(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", lineHeight: 0 }}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Input — hidden when conversation is blocked */}
              {convBlocked?.isBlocked ? (
                <div style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #1a0a0a, #2d0f0f)",
                  borderTop: "1.5px solid rgba(239,68,68,0.25)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={18} style={{ color: "#ef4444" }} />
                    <span style={{ color: "#f87171", fontWeight: 700, fontSize: "0.88rem" }}>
                      Conversación bloqueada
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(248,113,113,0.7)", textAlign: "center", lineHeight: 1.5 }}>
                    {convBlocked.blockedBy === userId
                      ? "Reportaste a este usuario. El equipo está revisando el caso. Mientras tanto, no podés enviar mensajes."
                      : "Un reporte está siendo revisado por el equipo. No podés enviar mensajes por ahora."}
                  </p>
                </div>
              ) : (
                <div className="ca-input">
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                  <button className="icon-btn btn-attach" onClick={() => fileRef.current?.click()} title="Adjuntar imagen">
                    <ImageIcon size={18} />
                  </button>
                  <textarea
                    className="input-ta"
                    placeholder="Escribí un mensaje... (Enter para enviar)"
                    value={text}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 120) + "px";
                    }}
                  />
                  <button
                    className="icon-btn btn-send"
                    onClick={handleSend}
                    disabled={(!text.trim() && !imgFile) || sending}
                    title="Enviar"
                  >
                    {sending
                      ? <Loader2 size={17} style={{ animation: "spin 0.8s linear infinite" }} />
                      : <Send size={17} />
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <Loader2 size={32} style={{ color: "#f97316" }} />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}