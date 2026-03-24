"use client";
// app/componentes/Navbar.tsx

import { useState, useRef, useEffect } from "react";
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

interface PushNotif {
  id: string;
  title: string;
  body: string;
  url?: string;
  receivedAt: number;
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
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [isIOSDevice,    setIsIOSDevice]    = useState(false);

  const dropdownRef        = useRef<HTMLDivElement>(null);
  const notifRef           = useRef<HTMLDivElement>(null);
  const prevShippedIds     = useRef<Set<string>>(new Set());
  const shippedInitialized = useRef(false);

  useEffect(() => {
    setIsIOSDevice(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE" && event.data.url) {
        router.push(event.data.url);
      }
      if (event.data?.type === "PUSH_RECEIVED") {
        const notif: PushNotif = {
          id: `${Date.now()}-${Math.random()}`,
          title: event.data.title || "Nueva notificacion",
          body:  event.data.body  || "",
          url:   event.data.url,
          receivedAt: Date.now(),
        };
        setPushNotifs(prev => [notif, ...prev].slice(0, 20));
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [router]);

  // ── Registrar SW y suscribir a push ─────────────────────────────────────────
  // El SW se registra SIEMPRE (sin importar si hay user) para poder recibir
  // notificaciones push aunque la app esté cerrada. La suscripción al backend
  // solo ocurre cuando hay usuario logueado.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setup = async () => {
      try {
        // 1. Registrar el SW siempre — es lo que permite recibir push sin la app abierta
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // 2. A partir de acá solo continuamos si hay usuario logueado
        if (!user) return;

        // 3. Pedir permiso de notificaciones
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") return;

        // 4. Obtener clave VAPID del backend
        const vapidRes = await fetch(`${API}/push/vapid-public-key`).catch(() => null);
        if (!vapidRes?.ok) return;
        const { publicKey } = await vapidRes.json();
        if (!publicKey) return;

        const token = localStorage.getItem("marketplace_token");

        // 5. Si ya existe suscripción, re-enviarla al backend por si expiró en el servidor
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await fetch(`${API}/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(existing),
          }).catch(() => {});
          return;
        }

        // 6. Crear nueva suscripción y enviarla al backend
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch(`${API}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(sub),
        });
      } catch (e) {
        console.warn("Push setup:", e);
      }
    };

    setup();
  }, [user]); // se re-ejecuta cuando el user se loguea/desloguea

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
          new Notification("Tu pedido esta en camino", {
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
  const unreadNotifs = pushNotifs.length;

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

  const dismissNotif = (id: string) => setPushNotifs(prev => prev.filter(n => n.id !== id));

  const currentSlug = pathname.startsWith("/categoria/")
    ? (pathname.split("/categoria/")[1]?.split("?")[0] ?? "")
    : "";

  const showInstallBtn = !!user && isInstallable && !isInstalled;
  const showBell = !!user;

  useEffect(() => {
    if (typeof window === "undefined") return;
    console.log("[PWA]", {
      isInstallable,
      isInstalled,
      isIOSDevice,
      standalone: window.matchMedia("(display-mode: standalone)").matches,
      userAgent: navigator.userAgent.slice(0, 80),
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
      `}</style>

      {/* Toast push flotante — solo el más reciente */}
      <div style={{
        position: "fixed", top: "4.75rem", right: "1rem",
        zIndex: 99999, display: "flex", flexDirection: "column",
        gap: "0.5rem", maxWidth: 320, width: "calc(100vw - 2rem)",
        pointerEvents: "none",
      }}>
        {pushNotifs.slice(0, 1).map(n => (
          <div key={n.id + "_t"} style={{
            background: "rgba(15,15,15,0.97)",
            border: "1px solid rgba(249,115,22,0.35)",
            borderLeft: "3px solid #f97316",
            borderRadius: 12, padding: "0.8rem 1rem",
            display: "flex", alignItems: "flex-start", gap: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
            pointerEvents: "all",
            animation: "slideInRight 0.3s ease",
          }}>
            <Bell size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.82rem", color: "#fff", lineHeight: 1.3 }}>{n.title}</p>
              {n.body && <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{n.body}</p>}
            </div>
            <button onClick={() => dismissNotif(n.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2, flexShrink: 0 }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

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

            {/* ── Campana ─────────────────────────────────────────────────────────
                Siempre visible: fondo y borde con opacidad sobre blanco/oscuro.
                No usa colores hardcodeados que dependan del tema del host.
            ─────────────────────────────────────────────────────────────────── */}
            {showBell && (
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setNotifPanelOpen(v => !v)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    // Fondo siempre visible: naranja si hay notifs o panel abierto,
                    // blanco semitransparente si no — funciona sobre cualquier navbar
                    background: notifPanelOpen || unreadNotifs > 0
                      ? "rgba(249,115,22,0.18)"
                      : "rgba(255,255,255,0.12)",
                    border: unreadNotifs > 0
                      ? "1px solid rgba(249,115,22,0.65)"
                      : "1px solid rgba(255,255,255,0.28)",
                    borderRadius: 10,
                    width: 38,
                    height: 38,
                    // Ícono blanco sobre fondo oscuro — naranja si hay notifs
                    color: unreadNotifs > 0 ? "#fb923c" : "rgba(255,255,255,0.88)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
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
                    position: "fixed",
                    top: "4.5rem",
                    left: "0.5rem",
                    right: "0.5rem",
                    width: "auto",
                    maxWidth: 340,
                    marginLeft: "auto",
                    maxHeight: "70vh",
                    overflowY: "auto",
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
                    zIndex: 99999,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Notificaciones</span>
                      {unreadNotifs > 0 && (
                        <button onClick={() => setPushNotifs([])} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", cursor: "pointer" }}>
                          Limpiar todo
                        </button>
                      )}
                    </div>

                    {unreadNotifs === 0 ? (
                      <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
                        <Bell size={28} color="rgba(255,255,255,0.15)" style={{ marginBottom: 8 }} />
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                          No tenés notificaciones nuevas
                        </p>
                      </div>
                    ) : (
                      pushNotifs.map(n => (
                        <div
                          key={n.id}
                          className="notif-row"
                          onClick={() => { if (n.url) router.push(n.url); setNotifPanelOpen(false); }}
                          style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.7rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: n.url ? "pointer" : "default", transition: "background 0.15s" }}
                        >
                          <Bell size={13} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{n.title}</p>
                            {n.body && <p style={{ margin: "0.15rem 0 0", fontSize: "0.73rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{n.body}</p>}
                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
                              {new Date(n.receivedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); dismissNotif(n.id); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0, padding: 2 }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="navbar-user" ref={dropdownRef} onClick={() => setDropdownOpen(v => !v)}>

                {user.role !== "seller" && (
                  <Link href="/panel?tab=cart" onClick={e => e.stopPropagation()} style={{ position: "relative", display: "flex", alignItems: "center", marginRight: "0.5rem", color: "var(--text-muted)", textDecoration: "none" }}>
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
                      <LogOut size={16} /> Cerrar sesion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login"    className="btn btn-ghost hide-mobile">Iniciar sesion</Link>
                <Link href="/register" className="btn btn-primary">Registrarse</Link>
              </>
            )}
          </div>
        </div>

        {/* Barra de categorias */}
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
              <button onClick={handleInstall} className="navbar-cat-link" style={{ background: "none", border: "none", cursor: "pointer" }} title={isIOSDevice ? "Cómo instalar" : "Instalar app"}>
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
