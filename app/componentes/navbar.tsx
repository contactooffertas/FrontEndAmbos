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
  Home,
  Search,
  User,
  Package,
  Store,
  LogOut,
  ChevronDown,
  ShoppingCart,
  Download,
  Smartphone,
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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount }    = useCart();
  const pathname         = usePathname();
  const router           = useRouter();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [pendingOrders, setPendingOrders] = useState(0);
  const [installing,    setInstalling]    = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Cerrar dropdown al hacer click fuera ──
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Cerrar dropdown al navegar ──
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  // ── Polling órdenes pendientes (solo sellers) ──
  useEffect(() => {
    if (!user || user.role !== "seller") return;
    const token = localStorage.getItem("marketplace_token");

    const check = async () => {
      try {
        const res = await fetch(`${API}/orders/seller`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const pending = data.filter((o: any) => o.status === "pending").length;
        setPendingOrders(pending);
      } catch {}
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push("/");
  };

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  const currentSlug = pathname.startsWith("/categoria/")
    ? (pathname.split("/categoria/")[1]?.split("?")[0] ?? "")
    : "";

  return (
    <header className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <span className="navbar-logo-badge">Off</span>
          <span className="">ertas</span>
          <span className="navbar-logo-dot" />
        </Link>

        {/* Buscador */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <Search size={16} className="navbar-search-icon" />
          <input
            type="text"
            placeholder="Buscar productos, negocios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Acciones */}
        <div className="navbar-actions">

          {/* ── Botón Instalar PWA ── solo si el user está logueado y la app es instalable */}
          {user && isInstallable && !isInstalled && (
            <button
              className="btn-pwa-install"
              onClick={handleInstall}
              disabled={installing}
              title="Instalar app"
            >
              {installing ? (
                <Smartphone size={15} className="pwa-icon pwa-icon--spin" />
              ) : (
                <Download size={15} className="pwa-icon" />
              )}
              <span className="pwa-label">
                {installing ? "Instalando..." : "Instalar app"}
              </span>
            </button>
          )}

          {user ? (
            <div
              className="navbar-user"
              ref={dropdownRef}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              {/* Carrito */}
              <Link
                href="/panel?tab=cart"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  marginRight: "0.5rem",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -7, right: -8,
                    background: "#f97316",
                    color: "#fff",
                    borderRadius: "999px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    lineHeight: 1,
                  }}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Avatar + nombre */}
              <img
                src={
                  user.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f97316&color=fff`
                }
                alt={user.name}
              />
              <span className="navbar-user-name">{user.name.split(" ")[0]}</span>
              <ChevronDown size={14} />

              {/* Dropdown */}
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
                      <Link
                        href="/ordenes"
                        onClick={() => setDropdownOpen(false)}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <Package size={16} /> Órdenes
                        {pendingOrders > 0 && (
                          <span style={{
                            background: "#f97316",
                            color: "#fff",
                            borderRadius: 20,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "1px 7px",
                            marginLeft: "auto",
                          }}>
                            {pendingOrders}
                          </span>
                        )}
                      </Link>
                    </>
                  ) : (
                    <Link href="/panel" onClick={() => setDropdownOpen(false)}>
                      <ShoppingCart size={16} /> Mi Panel
                      {cartCount > 0 && (
                        <span style={{
                          background: "#f97316",
                          color: "#fff",
                          borderRadius: 20,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "1px 7px",
                          marginLeft: "auto",
                        }}>
                          {cartCount}
                        </span>
                      )}
                    </Link>
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

          {/* Inicio */}
          <Link
            href="/"
            className={`navbar-cat-link ${pathname === "/" ? "active" : ""}`}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>
              <Home size={14} />
            </span>
            <span className="category-name">Inicio</span>
          </Link>

          {/* Categorías */}
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className={`navbar-cat-link ${currentSlug === cat.slug ? "active" : ""}`}
            >
              <span style={{ flexShrink: 0, display: "flex" }}>
                <CategoryIcon name={cat.iconName} size={14} />
              </span>
              <span className="category-name">{cat.name}</span>
            </Link>
          ))}

          {/* Órdenes — solo sellers */}
          {user?.role === "seller" && (
            <Link
              href="/ordenes"
              className={`navbar-cat-link ${pathname === "/ordenes" ? "active" : ""}`}
            >
              <span style={{ flexShrink: 0, display: "flex" }}>
                <Package size={14} />
              </span>
              <span className="category-name">Órdenes</span>
              {pendingOrders > 0 && (
                <span style={{
                  background: "#f97316",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {pendingOrders}
                </span>
              )}
            </Link>
          )}

        </div>
      </nav>
    </header>
  );
}