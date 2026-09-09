"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, Package, Sparkles, Store } from "lucide-react";
import { useAuth } from "../context/authContext";
import "../styles/seller-onboarding.css";

const API = "https://new-backend-lovat.vercel.app/api";

type BusinessSummary = {
  _id?: string;
  name?: string;
};

export default function SellerOnboardingBanner() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [business, setBusiness] = useState<BusinessSummary | null | undefined>(undefined);

  const relevantRoute = pathname === "/profile" || pathname === "/mis-productos";

  useEffect(() => {
    if (!relevantRoute || loading || !user || user.role === "admin") return;

    const token = localStorage.getItem("marketplace_token");
    if (!token) return;

    let cancelled = false;
    setChecking(true);

    fetch(`${API}/business/my-business`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("No se pudo comprobar el negocio");
        return (await res.json()) as BusinessSummary;
      })
      .then((data) => {
        if (!cancelled) setBusiness(data);
      })
      .catch(() => {
        // Si hay un problema de red no bloqueamos funciones existentes.
        if (!cancelled) setBusiness(undefined);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => { cancelled = true; };
  }, [relevantRoute, pathname, loading, user]);

  useEffect(() => {
    if (!relevantRoute) {
      delete document.documentElement.dataset.rmBusiness;
      return;
    }

    if (business === null) document.documentElement.dataset.rmBusiness = "no";
    else if (business?._id) document.documentElement.dataset.rmBusiness = "yes";
    else delete document.documentElement.dataset.rmBusiness;

    return () => { delete document.documentElement.dataset.rmBusiness; };
  }, [business, relevantRoute]);

  if (!relevantRoute || loading || !user || user.role === "admin" || checking) return null;

  if (business?._id) {
    if (pathname !== "/profile") return null;
    return (
      <section className="rm-seller-banner rm-seller-banner--active" aria-label="Tu negocio en Rosario Market">
        <div className="rm-seller-banner__icon"><CheckCircle2 size={24} /></div>
        <div className="rm-seller-banner__copy">
          <span className="rm-seller-banner__eyebrow">TU VIDRIERA EN ROSARIO MARKET</span>
          <h2>{business.name || "Tu negocio"} ya está listo para vender</h2>
          <p>Podés administrar tu tienda y publicar productos sin dejar de usar tu cuenta para comprar.</p>
        </div>
        <div className="rm-seller-banner__actions">
          <Link href="/negocio" className="rm-seller-banner__primary"><Store size={16} /> Administrar negocio</Link>
          <Link href="/mis-productos" className="rm-seller-banner__secondary"><Package size={16} /> Mis productos</Link>
        </div>
      </section>
    );
  }

  if (business === null) {
    const inProducts = pathname === "/mis-productos";
    return (
      <section className="rm-seller-banner" aria-label="Crear un negocio en Rosario Market">
        <div className="rm-seller-banner__icon"><Store size={24} /></div>
        <div className="rm-seller-banner__copy">
          <span className="rm-seller-banner__eyebrow"><Sparkles size={13} /> TAMBIÉN PODÉS VENDER</span>
          <h2>{inProducts ? "Antes de publicar, creá tu negocio" : "¿Querés vender? Creá tu negocio en Rosario Market"}</h2>
          <p>
            {inProducts
              ? "Tus productos tienen que pertenecer a una tienda. Configurala una sola vez y después vas a poder publicar desde acá."
              : "Registrarte como comprador no te limita: podés seguir comprando y, cuando quieras, abrir tu propia vidriera para publicar productos."}
          </p>
        </div>
        <div className="rm-seller-banner__actions">
          <Link href="/negocio" className="rm-seller-banner__primary"><Store size={16} /> Crear mi negocio <ArrowRight size={15} /></Link>
          {!inProducts && <Link href="/mis-productos" className="rm-seller-banner__secondary"><Package size={16} /> Ver cómo publicar</Link>}
        </div>
      </section>
    );
  }

  return null;
}
