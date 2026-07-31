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
  ShoppingCart, Download, Smartphone, Bell, X,
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

const NAV_CATEGORIES = [
  { id: "1",  name: "Electrónica",     iconName: "Monitor",     slug: "electronica"   },
  { id: "2",  name: "Ropa y Moda",     iconName: "Shirt",       slug: "ropa-moda"     },
  { id: "3",  name: "Hogar",           iconName: "Home",        slug: "hogar"         },
  { id: "4",  name: "Deportes",        iconName: "Dumbbell",    slug: "deportes"      },
  { id: "5",  name: "Alimentos",       iconName: "ShoppingBag", slug: "alimentos"     },
  { id: "6",  name: "Salud y Belleza", iconName: "Heart",       slug: "salud-belleza" },
  { id: "7",  name: "Automotriz",      iconName: "Car",         slug: "automotriz"    },
  { id: "8",  name: "Juguetes",        iconName: "Gift",        slug: "juguetes"      },
  { id: "9",  name: "Libros",          iconName: "BookOpen",    slug: "libros"        },
  { id: "10", name: "Mascotas",        iconName: "PawPrint",    slug: "mascotas"      },
];

const API = "https://new-backend-lovat.vercel.app/api";

// Mismo servidor de sockets que usa el chat (app/chat/page.tsx -> WS_URL).
// Antes acá se apuntaba a NEXT_PUBLIC_SOCKET_URL/localhost, un server distinto
// al de Render donde el backend realmente emite los eventos -> por eso nunca
// llegaban ni anuncios en vivo con certeza ni mensajes de chat.
const WS_URL = "https://renderbackendconsocket.onrender.com";

// VAPID public key — tiene que coincidir exactamente con la del backend
const VAPID_PUBLIC_KEY = "BLR8fiu0VNED_-qHI0rOQn_UPEtJptD4wiYJXuBQxgBhFFRf_SvU54F95IBaBG86V-cv3wwZ4l_NlLD236io1rw";

interface PushNotif {
  id: string;
  title: string;
  body: string;
  url?: string;
  receivedAt: number;
  /** true si viene de un anuncio del admin (persistente en BD, se marca leído por usuario) */
  isAnnouncement?: boolean;
  /** true una vez que ya avisamos al backend que este usuario lo leyó */
  markedRead?: boolean;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  const buffer  = new ArrayBuffer(raw.length);
  const arr     = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return buffer;
}

async function updateBadge(count: number) {
  if ("setAppBadge" in navigator) {
    try {
      if (count > 0) await (navigator as any).setAppBadge(count);
      else           await (navigator as any).clearAppBadge();
    } catch (e) {
      console.warn("Badge API no disponible:", e);
    }
  }
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount }    = useCart();
  const pathname         = usePathname();
  const router           = useRouter();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [pendingOrders,  setPendingOrders]  = useState(0);
  const [shippedOrders,  setShippedOrders]  = useState(0);
  const [installing,     setInstalling]     = useState(false);
  const [pushNotifs,     setPushNotifs]     = useState<PushNotif[]>([]);
  // ── Toast flotante: SOLO para eventos que llegan en vivo (push/socket),
  //    nunca para lo que ya traemos del historial al montar ─────────────────
  const [toastNotif,     setToastNotif]     = useState<PushNotif | null>(null);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [isIOSDevice,    setIsIOSDevice]    = useState(false);

  const dropdownRef           = useRef<HTMLDivElement>(null);
  const notifRef               = useRef<HTMLDivElement>(null);
  const prevShippedIds        = useRef<Set<string>>(new Set());
  const shippedInitialized    = useRef(false);
  const announcementSocketRef = useRef<ReturnType<typeof import("socket.io-client")["io"]> | null>(null);
  const toastTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ref de pathname para usar el valor actual dentro del socket sin tener
  //    que reconectar el socket cada vez que cambia la ruta ─────────────────
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    setIsIOSDevice(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  // ── Auto-ocultar el toast a los 6s ────────────────────────────────────────
  useEffect(() => {
    if (!toastNotif) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastNotif(null), 6000);
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [toastNotif]);

  // ── Escuchar mensajes del SW ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE" && event.data.url) {
        router.push(event.data.url);
      }
      if (event.data?.type === "PUSH_RECEIVED") {
        const notif: PushNotif = {
          id:         `${Date.now()}-${Math.random()}`,
          title:      event.data.title || "Nueva notificación",
          body:       event.data.body  || "",
          url:        event.data.url,
          receivedAt: Date.now(),
        };
        setPushNotifs(prev => [notif, ...prev].slice(0, 20));
        setToastNotif(notif); // ← esto SÍ es en vivo, se muestra como toast
        setNotifPanelOpen(false);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [router]);

  // ── Registrar SW siempre (incluso sin usuario logueado) ──────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("[SW] register error:", e);
    });
  }, []);

  // ── Suscribir a push cuando hay usuario logueado ──────────────────────────
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;

        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") return;

        const token = localStorage.getItem("marketplace_token");
        if (!token) return;

        const existing = await reg.pushManager.getSubscription();

        if (existing) {
          await fetch(`${API}/push/subscribe`, {
            method:  "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ subscription: existing.toJSON() }),
          }).catch(() => {});
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch(`${API}/push/subscribe`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ subscription: sub.toJSON() }),
        });

        console.log("[Push] Suscripción nueva guardada ✅");
      } catch (e) {
        console.warn("[Push] setup error:", e);
      }
    };

    setup();
  }, [user]);

  // ── Anuncios del admin: traer los que este usuario todavía no leyó ───────
  //    Van SOLO a la lista del panel — NUNCA disparan el toast, porque no
  //    son un evento nuevo, son historial que ya podría haber visto.
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("marketplace_token");
    if (!token) return;

    fetch(`${API}/announcements/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : { announcements: [] }))
      .then(data => {
        const anns: PushNotif[] = (data.announcements || []).map((a: any) => ({
          id:             a._id,
          title:          a.title,
          body:           a.message,
          url:            a.link,
          receivedAt:     new Date(a.createdAt).getTime(),
          isAnnouncement: true,
          markedRead:     false,
        }));
        if (anns.length) {
          setPushNotifs(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const fresh = anns.filter(a => !existingIds.has(a.id));
            return [...fresh, ...prev];
          });
        }
      })
      .catch(() => {});
  }, [user]);

  // ── Eventos en vivo mientras la app está abierta: anuncios del admin Y
  //    mensajes nuevos de chat. Mismo socket (mismo server que usa el chat)
  //    para que ambos lleguen sin tener que salir/volver a entrar a una página.
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    let cleanup: () => void;

    (async () => {
      const { io } = await import("socket.io-client");
      const token = localStorage.getItem("marketplace_token");
      const myId  = (user as any)?._id || (user as any)?.id;

      const socket = io(WS_URL, {
        auth: { token },
        // FIX: antes forzaba transports: ["websocket"], que intenta abrir el
        // WS directo sin pasar por polling primero. En Render (sobre todo en
        // plan free, que duerme el servicio) eso falla seguido — "WebSocket
        // is closed before the connection is established". Dejamos que
        // negocie polling → upgrade a websocket, igual que hace el chat.
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      announcementSocketRef.current = socket;

      socket.on("connect_error", (err) => {
        console.warn("[navbar-socket] connect_error:", err.message);
      });

      socket.on("connect", () => {
        socket.emit("join_user_room", myId);
      });

      socket.on("new_announcement", (payload: any) => {
        const notif: PushNotif = {
          id:             payload._id,
          title:          payload.title,
          body:           payload.message,
          url:            payload.link,
          receivedAt:     Date.now(),
          isAnnouncement: true,
          markedRead:     false,
        };
        setPushNotifs(prev => {
          if (prev.some(p => p.id === notif.id)) return prev;
          return [notif, ...prev].slice(0, 20);
        });
        setToastNotif(notif);
      });

      // ── Mensaje de chat nuevo → va a la campanita en tiempo real ─────────
      socket.on("new_message", (msg: any) => {
        const senderId = msg?.sender?._id || msg?.sender;
        if (!senderId || senderId === myId) return; // no notificarme mis propios mensajes

        const notif: PushNotif = {
          id:         msg._id || `${Date.now()}-${Math.random()}`,
          title:      `Mensaje de ${msg?.sender?.name || "un usuario"}`,
          body:       msg?.text || (msg?.image ? "📷 Imagen" : ""),
          url:        msg?.conversation ? `/chat?conversationId=${msg.conversation}` : "/chat",
          receivedAt: Date.now(),
        };

        setPushNotifs(prev => {
          if (prev.some(p => p.id === notif.id)) return prev;
          return [notif, ...prev].slice(0, 20);
        });

        // Si ya está en /chat, esa página ya muestra el mensaje y suena la
        // notificación propia — evitamos duplicar el toast acá.
        if (!pathnameRef.current.startsWith("/chat")) setToastNotif(notif);
      });

      cleanup = () => {
        socket.disconnect();
        announcementSocketRef.current = null;
      };
    })();

    return () => { cleanup?.(); };
  }, [user]);

  // ── Cerrar dropdowns al hacer click afuera ────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifPanelOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  // ── Órdenes pendientes (vendedor) ─────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== "seller") return;
    const check = async () => {
      try {
        const token = localStorage.getItem("marketplace_token");
        const res = await fetch(`${API}/orders/seller`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const pending = data.filter((o: any) => o.status === "pending").length;
        setPendingOrders(pending);
        updateBadge(pending);
      } catch {}
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Órdenes en camino (comprador) ─────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role === "seller") return;
    const check = async () => {
      try {
        const token = localStorage.getItem("marketplace_token");
        const res = await fetch(`${API}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: any[] = await res.json();
        const shipped    = data.filter(o => o.status === "shipped");
        const shippedIds = new Set(shipped.map(o => o._id as string));

        if (!shippedInitialized.current) {
          prevShippedIds.current     = shippedIds;
          shippedInitialized.current = true;
          setShippedOrders(shipped.length);
          updateBadge(shipped.length);
          return;
        }

        const newShipped = shipped.filter(o => !prevShippedIds.current.has(o._id));
        if (newShipped.length > 0 && Notification.permission === "granted") {
          new Notification("Tu pedido está en camino", {
            body: newShipped.length === 1
              ? `Pedido #${newShipped[0]._id.slice(-8).toUpperCase()} fue despachado`
              : `${newShipped.length} pedidos fueron despachados`,
          });
        }
        prevShippedIds.current = shippedIds;
        setShippedOrders(shipped.length);
        updateBadge(shipped.length);
      } catch {}
    };
    if (Notification.permission === "default") Notification.requestPermission();
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [user]);

  const avatarBadge  = user?.role === "seller" ? pendingOrders : shippedOrders;
  // ── El badge de la campanita solo cuenta lo que todavía no fue "visto"
  //    (abrir el panel marca los anuncios como leídos, ver más abajo) ───────
  const unreadNotifs = pushNotifs.filter(n => !n.markedRead).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim())
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = () => { logout(); setDropdownOpen(false); router.push("/"); };

  const handleInstall = async () => {
    if (isIOSDevice) {
      alert('Para instalar: tocá el botón Compartir (□↑) y luego "Agregar a pantalla de inicio"');
      return;
    }
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  // ── Descartar una notificación puntual (❌) — si es anuncio, se marca leído ─
  const dismissNotif = (id: string) => {
    const notif = pushNotifs.find(n => n.id === id);
    setPushNotifs(prev => prev.filter(n => n.id !== id));
    if (toastNotif?.id === id) setToastNotif(null);

    if (notif?.isAnnouncement && !notif.markedRead) {
      const token = localStorage.getItem("marketplace_token");
      if (token) {
        fetch(`${API}/announcements/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  };

  // ── Marcar TODOS los anuncios pendientes como leídos — se llama al abrir
  //    la campanita, porque "verlos" en el panel ya cuenta como visto ───────
  const markAllAnnouncementsRead = useCallback(() => {
    const token = localStorage.getItem("marketplace_token");
    const toMark = pushNotifs.filter(n => n.isAnnouncement && !n.markedRead);
    if (!toMark.length) return;

    if (token) {
      toMark.forEach(n => {
        fetch(`${API}/announcements/${n.id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }
    setPushNotifs(prev => prev.map(n => n.isAnnouncement ? { ...n, markedRead: true } : n));
  }, [pushNotifs]);

  // ── Abrir/cerrar campanita — al abrir: ocultamos el toast (evita que
  //    quede uno encima del otro) y marcamos como leído lo que se ve ────────
  const toggleNotifPanel = () => {
    setNotifPanelOpen(prev => {
      const next = !prev;
      if (next) {
        setToastNotif(null);
        markAllAnnouncementsRead();
      }
      return next;
    });
  };

  const clearAllNotifs = () => {
    const token = localStorage.getItem("marketplace_token");
    if (token) {
      pushNotifs
        .filter(n => n.isAnnouncement)
        .forEach(n => {
          fetch(`${API}/announcements/${n.id}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        });
    }
    setPushNotifs([]);
    setToastNotif(null);
  };

  const currentSlug = pathname.startsWith("/categoria/")
    ? (pathname.split("/categoria/")[1]?.split("?")[0] ?? "")
    : "";

  const showInstallBtn = !!user && isInstallable && !isInstalled;
  const showBell       = !!user;

  useEffect(() => {
    if (typeof window === "undefined") return;
    console.log("[PWA]", {
      isInstallable,
      isInstalled,
      isIOSDevice,
      standalone: window.matchMedia("(display-mode: standalone)").matches,
      userAgent:  navigator.userAgent.slice(0, 80),
    });
  }, [isInstallable, isInstalled, isIOSDevice]);

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes navbarSpin { to { transform: rotate(360deg); } }
        .pwa-label { display: none; }
        @media (min-width: 540px) { .pwa-label { display: inline; } }
        .notif-row:hover { background: rgba(255,255,255,0.04) !important; }

        .bell-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1.5px solid #f97316;
          background: #1c1c1c;
          color: #f97316;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s;
          padding: 0;
          outline: none;
        }
        .bell-btn:hover  { background: #2c1a08; }
        .bell-btn.active { background: #2c1a08; border-color: #fb923c; }
      `}</style>

      {/* Toast push flotante — SOLO eventos en vivo, nunca superpuesto con el panel */}
      {toastNotif && !notifPanelOpen && (
        <div style={{
          position: "fixed", top: "4.75rem", right: "1rem",
          zIndex: 99999, display: "flex", flexDirection: "column",
          gap: "0.5rem", maxWidth: 320, width: "calc(100vw - 2rem)",
          pointerEvents: "none",
        }}>
          <div style={{
            background:   "rgba(15,15,15,0.97)",
            border:       "1px solid rgba(249,115,22,0.35)",
            borderLeft:   "3px solid #f97316",
            borderRadius: 12,
            padding:      "0.8rem 1rem",
            display:      "flex",
            alignItems:   "flex-start",
            gap:          10,
            boxShadow:    "0 8px 32px rgba(0,0,0,0.55)",
            pointerEvents: "all",
            animation:    "slideInRight 0.3s ease",
          }}>
            <Bell size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.82rem", color: "#fff", lineHeight: 1.3 }}>
                {toastNotif.title}
              </p>
              {toastNotif.body && (
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
                  {toastNotif.body}
                </p>
              )}
            </div>
            <button
              onClick={() => setToastNotif(null)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2, flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      <header className="navbar">
        <div className="navbar-inner">

          {/* Logo */}
          <Link href="/" className="navbar-logo">
            <span className="navbar-logo-badge">Off</span>
            <span>ertas</span>
            <span className="navbar-logo-dot" />
          </Link>

          {/* Buscador */}
          <form className="navbar-search" onSubmit={handleSearch}>
            <Search size={16} className="navbar-search-icon" />
            <input
              type="text"
              placeholder="Buscar productos, negocios..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="navbar-actions">

            {/* Botón instalar PWA */}
            {showInstallBtn && (
              <button
                onClick={handleInstall}
                disabled={installing}
                title={isIOSDevice ? "Cómo instalar en iPhone" : "Instalar app"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(249,115,22,0.09)",
                  border: "1px solid rgba(249,115,22,0.28)",
                  borderRadius: 8, padding: "0.38rem 0.72rem",
                  color: "#fdba74", fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer", opacity: installing ? 0.6 : 1,
                  transition: "background 0.2s, border-color 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {installing
                  ? <Smartphone size={13} style={{ animation: "navbarSpin 1s linear infinite" }} />
                  : <Download size={13} />
                }
                <span className="pwa-label">
                  {installing ? "Instalando..." : "Instalar"}
                </span>
              </button>
            )}

            {/* Campana */}
            {showBell && (
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  className={`bell-btn${notifPanelOpen ? " active" : ""}`}
                  onClick={toggleNotifPanel}
                  title="Notificaciones"
                >
                  <Bell size={17} strokeWidth={2.3} />
                  {unreadNotifs > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -5,
                      background: "#ef4444", color: "#fff", borderRadius: "999px",
                      fontSize: "0.58rem", fontWeight: 800, minWidth: 15, height: 15,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 2px", lineHeight: 1,
                    }}>
                      {unreadNotifs > 9 ? "9+" : unreadNotifs}
                    </span>
                  )}
                </button>

                {notifPanelOpen && (
                  <div style={{
                    position:   "fixed",
                    top:        "4.5rem",
                    left:       "0.5rem",
                    right:      "0.5rem",
                    width:      "auto",
                    maxWidth:   340,
                    marginLeft: "auto",
                    maxHeight:  "70vh",
                    overflowY:  "auto",
                    background: "#111",
                    border:     "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    boxShadow:  "0 12px 40px rgba(0,0,0,0.65)",
                    zIndex:     99999,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>
                        Notificaciones
                      </span>
                      {pushNotifs.length > 0 && (
                        <button
                          onClick={clearAllNotifs}
                          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", cursor: "pointer" }}
                        >
                          Limpiar todo
                        </button>
                      )}
                    </div>

                    {pushNotifs.length === 0 && (
                      <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
                        <Bell size={28} color="rgba(255,255,255,0.15)" style={{ marginBottom: 8 }} />
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                          No tenés notificaciones nuevas
                        </p>
                      </div>
                    )}

                    {pushNotifs.length > 0 && pushNotifs.map(n => (
                      <div
                        key={n.id}
                        className="notif-row"
                        onClick={() => { if (n.url) router.push(n.url); setNotifPanelOpen(false); }}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "0.7rem 1rem",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          cursor: n.url ? "pointer" : "default",
                          transition: "background 0.15s",
                        }}
                      >
                        <Bell size={13} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p style={{ margin: "0.15rem 0 0", fontSize: "0.73rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                              {n.body}
                            </p>
                          )}
                          <p style={{ margin: "0.25rem 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
                            {new Date(n.receivedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); dismissNotif(n.id); }}
                          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0, padding: 2 }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="navbar-user" ref={dropdownRef} onClick={() => setDropdownOpen(v => !v)}>

                {user.role !== "seller" && (
                  <Link
                    href="/panel?tab=cart"
                    onClick={e => e.stopPropagation()}
                    style={{ position: "relative", display: "flex", alignItems: "center", marginRight: "0.5rem", color: "var(--text-muted)", textDecoration: "none" }}
                  >
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                      <span style={{ position: "absolute", top: -7, right: -8, background: "#f97316", color: "#fff", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", lineHeight: 1 }}>
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Link>
                )}

                <div style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f97316&color=fff`}
                    alt={user.name}
                  />
                  {avatarBadge > 0 && (
                    <span style={{ position: "absolute", top: -5, right: -5, background: "#ef4444", color: "#fff", borderRadius: "999px", fontSize: "0.6rem", fontWeight: 800, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1, zIndex: 1, pointerEvents: "none" }}>
                      {avatarBadge > 9 ? "9+" : avatarBadge}
                    </span>
                  )}
                </div>

                <span className="navbar-user-name">{user.name.split(" ")[0]}</span>
                <ChevronDown size={14} />

                {dropdownOpen && (
                  <div className="navbar-dropdown">
                    <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                      <User size={16} /> Mi Perfil
                    </Link>
                    {user.role === "seller" ? (
                      <>
                        <Link href="/mis-productos" onClick={() => setDropdownOpen(false)}>
                          <Package size={16} /> Mis Productos
                        </Link>
                        <Link href="/negocio" onClick={() => setDropdownOpen(false)}>
                          <Store size={16} /> Mi Negocio
                        </Link>
                        <Link href="/ordenes" onClick={() => setDropdownOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Package size={16} /> Ordenes
                          {pendingOrders > 0 && (
                            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", marginLeft: "auto" }}>
                              {pendingOrders}
                            </span>
                          )}
                        </Link>
                      </>
                    ) : (
                      <Link href="/panel" onClick={() => setDropdownOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ShoppingCart size={16} /> Mi Panel
                        {shippedOrders > 0 ? (
                          <span style={{ background: "#8b5cf6", color: "#fff", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", marginLeft: "auto" }}>
                            🚚 {shippedOrders}
                          </span>
                        ) : cartCount > 0 ? (
                          <span style={{ background: "#f97316", color: "#fff", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", marginLeft: "auto" }}>
                            {cartCount}
                          </span>
                        ) : null}
                      </Link>
                    )}

                    {showInstallBtn && (
                      <>
                        <div className="navbar-dropdown-divider" />
                        <button
                          onClick={e => { e.stopPropagation(); handleInstall(); setDropdownOpen(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", color: "#fdba74", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", padding: "0.55rem 1rem", textAlign: "left" }}
                        >
                          <Download size={15} color="#fdba74" />
                          {installing ? "Instalando..." : isIOSDevice ? "Cómo instalar" : "Instalar app"}
                        </button>
                      </>
                    )}

                    <div className="navbar-dropdown-divider" />
                    <button className="logout-btn" onClick={handleLogout}>
                      <LogOut size={16} /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login"    className="btn btn-ghost hide-mobile">Iniciar sesión</Link>
                <Link href="/register" className="btn btn-primary">Registrarse</Link>
              </>
            )}
          </div>
        </div>

        {/* Barra de categorías */}
        <nav className="navbar-cats">
          <div className="navbar-cats-inner">

            <Link href="/" className={`navbar-cat-link ${pathname === "/" ? "active" : ""}`}>
              <span style={{ flexShrink: 0, display: "flex" }}><Home size={14} /></span>
              <span className="category-name">Inicio</span>
            </Link>

            {NAV_CATEGORIES.map(cat => (
              <Link key={cat.id} href={`/categoria/${cat.slug}`} className={`navbar-cat-link ${currentSlug === cat.slug ? "active" : ""}`}>
                <span style={{ flexShrink: 0, display: "flex" }}><CategoryIcon name={cat.iconName} size={14} /></span>
                <span className="category-name">{cat.name}</span>
              </Link>
            ))}

            {user?.role === "seller" && (
              <Link href="/ordenes" className={`navbar-cat-link ${pathname === "/ordenes" ? "active" : ""}`}>
                <span style={{ flexShrink: 0, display: "flex" }}><Package size={14} /></span>
                <span className="category-name">Ordenes</span>
                {pendingOrders > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0 }}>
                    {pendingOrders > 9 ? "9+" : pendingOrders}
                  </span>
                )}
              </Link>
            )}

            {user && user.role !== "seller" && shippedOrders > 0 && (
              <Link href="/panel?tab=purchases" className={`navbar-cat-link ${pathname === "/panel" ? "active" : ""}`}>
                <span style={{ flexShrink: 0, display: "flex" }}><Package size={14} /></span>
                <span className="category-name">En camino</span>
                <span style={{ background: "#8b5cf6", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0 }}>
                  {shippedOrders > 9 ? "9+" : shippedOrders}
                </span>
              </Link>
            )}

            {showInstallBtn && (
              <button
                onClick={handleInstall}
                className="navbar-cat-link"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                title={isIOSDevice ? "Cómo instalar" : "Instalar app"}
              >
                <span style={{ flexShrink: 0, display: "flex" }}><Download size={14} color="#fdba74" /></span>
                <span className="category-name" style={{ color: "#fdba74" }}>Instalar</span>
              </button>
            )}

          </div>
        </nav>
      </header>
    </>
  );
}
