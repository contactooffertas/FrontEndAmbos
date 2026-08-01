"use client";
// app/programa-afiliados/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store, ShoppingBag, ExternalLink, CheckCircle2, Loader2,
  TrendingUp, Users, Wallet, ShieldCheck, ClipboardList, Save, Send,
} from "lucide-react";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import "../styles/afiliados.css";

const API = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

type AffiliateRole = "seller" | "buyer" | "admin";

interface AffiliateStatus {
  role: AffiliateRole;
  name: string;
  businessId: string | null;
  termsVersion: number;
  hasAcceptedTerms: boolean;
  acceptedAt: string | null;
  hasApplication: boolean;
  application: any | null;
}

interface SellerFormState {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  defaultPercentage: string;
  maxAffiliates: string;
  description: string;
}

interface BuyerFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  socialMedia: string;
  salesExperience: string;
  privacyAccepted: boolean;
}

const EMPTY_SELLER_FORM: SellerFormState = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  defaultPercentage: "",
  maxAffiliates: "",
  description: "",
};

const EMPTY_BUYER_FORM: BuyerFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  province: "",
  socialMedia: "",
  salesExperience: "",
  privacyAccepted: false,
};

export default function ProgramaAfiliadosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<AffiliateStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [termsChecked, setTermsChecked] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [sellerForm, setSellerForm] = useState<SellerFormState>(EMPTY_SELLER_FORM);
  const [buyerForm, setBuyerForm] = useState<BuyerFormState>(EMPTY_BUYER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const loadStatus = useCallback(async () => {
    const token = getToken();
    if (!token) { setStatusLoading(false); return; }
    setStatusLoading(true);
    setStatusError("");
    try {
      const res = await fetch(`${API}/affiliates/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudo cargar el estado del programa de afiliados");
      const data: AffiliateStatus = await res.json();
      setStatus(data);
      setTermsAccepted(data.hasAcceptedTerms);

      if (data.role === "seller" && data.application) {
        setSellerForm({
          businessName: data.application.businessName || "",
          contactName: data.application.contactName || "",
          email: data.application.email || "",
          phone: data.application.phone || "",
          defaultPercentage: String(data.application.defaultPercentage ?? ""),
          maxAffiliates: String(data.application.maxAffiliates ?? ""),
          description: data.application.description || "",
        });
      }
      if (data.role === "buyer" && data.application) {
        setBuyerForm({
          firstName: data.application.firstName || "",
          lastName: data.application.lastName || "",
          email: data.application.email || "",
          phone: data.application.phone || "",
          city: data.application.city || "",
          province: data.application.province || "",
          socialMedia: data.application.socialMedia || "",
          salesExperience: data.application.salesExperience || "",
          privacyAccepted: !!data.application.privacyAccepted,
        });
      }
    } catch (err: any) {
      setStatusError(err.message || "Error al cargar el programa de afiliados");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { if (user) loadStatus(); }, [user, loadStatus]);

  const handleAcceptTerms = async () => {
    if (!termsChecked || !status) return;
    setAcceptingTerms(true);
    setStatusError("");
    try {
      const token = getToken();
      const res = await fetch(`${API}/affiliates/terms/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: status.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo registrar la aceptación");
      setTermsAccepted(true);
    } catch (err: any) {
      setStatusError(err.message || "Error al aceptar los términos y condiciones");
    } finally {
      setAcceptingTerms(false);
    }
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const token = getToken();
      const res = await fetch(`${API}/affiliates/apply/seller`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessName: sellerForm.businessName,
          contactName: sellerForm.contactName,
          email: sellerForm.email,
          phone: sellerForm.phone,
          defaultPercentage: Number(sellerForm.defaultPercentage),
          maxAffiliates: Number(sellerForm.maxAffiliates),
          description: sellerForm.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo guardar la configuración");
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Error al guardar la configuración del programa");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerForm.privacyAccepted) {
      setSubmitError("Debés aceptar la política de privacidad para continuar");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const token = getToken();
      const res = await fetch(`${API}/affiliates/apply/buyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buyerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo enviar la solicitud");
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Error al enviar la solicitud de afiliado");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || statusLoading) {
    return (
      <MainLayout>
        <div className="affiliate-loading">
          <Loader2 size={22} className="affiliate-spin" />
          <span>Cargando programa de afiliados…</span>
        </div>
      </MainLayout>
    );
  }

  if (statusError && !status) {
    return (
      <MainLayout>
        <div className="affiliate-page">
          <div className="affiliate-card affiliate-error-card">
            <p>{statusError}</p>
            <button className="affiliate-btn affiliate-btn-outline" onClick={loadStatus}>
              Reintentar
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!status) return null;

  if (status.role === "admin") {
    return (
      <MainLayout>
        <div className="affiliate-page">
          <div className="affiliate-card">
            <h1 className="affiliate-title">Administración Programa de Afiliados</h1>
            <p className="affiliate-subtitle">
              El panel de administración (contenidos por rol y versiones de TyC) se gestiona desde otra sección.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isSeller = status.role === "seller";

  return (
    <MainLayout>
      <div className="affiliate-page">
        <div className="affiliate-hero">
          <span className="affiliate-hero-icon">
            {isSeller ? <Store size={22} /> : <ShoppingBag size={22} />}
          </span>
          <div>
            <h1 className="affiliate-title">
              {isSeller ? `Bienvenido ${status.name}` : `Bienvenido ${status.name}`}
            </h1>
            <p className="affiliate-subtitle">
              {isSeller
                ? "Invitá personas a vender tus productos y pagales únicamente por ventas confirmadas."
                : "Ganá dinero promocionando productos de las tiendas que quieras."}
            </p>
          </div>
        </div>

        {isSeller ? (
          <div className="affiliate-card">
            <h2 className="affiliate-section-title">Cómo funciona</h2>
            <div className="affiliate-benefits">
              <div className="affiliate-benefit">
                <TrendingUp size={16} />
                <span>Sumás vendedores externos que promocionan tus productos sin costo fijo.</span>
              </div>
              <div className="affiliate-benefit">
                <Users size={16} />
                <span>Vos decidís quién entra a tu programa y cuántos afiliados aceptás.</span>
              </div>
              <div className="affiliate-benefit">
                <Wallet size={16} />
                <span>Solo pagás comisión por ventas confirmadas, nunca por clics o visitas.</span>
              </div>
            </div>
            <div className="affiliate-note">
              <ShieldCheck size={14} />
              <span>
                La plataforma únicamente registra las estadísticas de la actividad de tus afiliados.
                El pago de comisiones lo realiza directamente tu negocio, fuera de la plataforma.
              </span>
            </div>
          </div>
        ) : (
          <div className="affiliate-card">
            <h2 className="affiliate-section-title">Cómo funciona</h2>
            <div className="affiliate-benefits">
              <div className="affiliate-benefit">
                <Wallet size={16} />
                <span>Ganás dinero promocionando productos de las tiendas que te acepten.</span>
              </div>
              <div className="affiliate-benefit">
                <Users size={16} />
                <span>Cada tienda decide si aprueba tu solicitud, y podés trabajar para varias a la vez.</span>
              </div>
              <div className="affiliate-benefit">
                <ClipboardList size={16} />
                <span>Tendrás un panel con tus ventas, comisiones, historial, pagos e incentivos.</span>
              </div>
            </div>
            <div className="affiliate-note">
              <ShieldCheck size={14} />
              <span>
                La plataforma no paga comisiones: cada negocio paga directamente y solo por
                ventas confirmadas. Los pagos dependen exclusivamente del negocio.
              </span>
            </div>
          </div>
        )}

        <div className="affiliate-card">
          <h2 className="affiliate-section-title">Términos y Condiciones</h2>
          <Link href="/terminos" target="_blank" className="affiliate-terms-link">
            <ExternalLink size={13} /> Leer términos y condiciones
          </Link>

          {termsAccepted ? (
            <div className="affiliate-accepted-badge">
              <CheckCircle2 size={15} />
              <span>Ya aceptaste los Términos y Condiciones del Programa de Afiliados.</span>
            </div>
          ) : (
            <>
              <p className="affiliate-terms-declaration">
                Declaro haber leído completamente los Términos y Condiciones del Programa de
                Afiliados y aceptarlos en su totalidad.
              </p>
              <label className="affiliate-checkbox">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                />
                <span>He leído y acepto los Términos y Condiciones.</span>
              </label>

              {statusError && <p className="affiliate-error-text">{statusError}</p>}

              <button
                type="button"
                className="affiliate-btn affiliate-btn-primary"
                disabled={!termsChecked || acceptingTerms}
                onClick={handleAcceptTerms}
              >
                {acceptingTerms ? (
                  <><Loader2 size={15} className="affiliate-spin" /> Guardando…</>
                ) : (
                  "Aceptar y continuar"
                )}
              </button>
            </>
          )}
        </div>

        {termsAccepted && (
          <div className="affiliate-card">
            <h2 className="affiliate-section-title">
              {isSeller ? "Configurá tu programa de afiliados" : "Solicitud de afiliado"}
            </h2>

            {submitSuccess && (
              <div className="affiliate-accepted-badge">
                <CheckCircle2 size={15} />
                <span>
                  {isSeller
                    ? "Tu configuración se guardó correctamente."
                    : "Tu solicitud se envió correctamente."}
                </span>
              </div>
            )}
            {submitError && <p className="affiliate-error-text">{submitError}</p>}

            {isSeller ? (
              <form className="affiliate-form" onSubmit={handleSellerSubmit}>
                <div className="affiliate-field">
                  <label>Nombre del negocio</label>
                  <input
                    value={sellerForm.businessName}
                    onChange={(e) => setSellerForm((p) => ({ ...p, businessName: e.target.value }))}
                    required
                  />
                </div>
                <div className="affiliate-field">
                  <label>Persona responsable</label>
                  <input
                    value={sellerForm.contactName}
                    onChange={(e) => setSellerForm((p) => ({ ...p, contactName: e.target.value }))}
                    required
                  />
                </div>
                <div className="affiliate-field-grid">
                  <div className="affiliate-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={sellerForm.email}
                      onChange={(e) => setSellerForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="affiliate-field">
                    <label>Teléfono</label>
                    <input
                      value={sellerForm.phone}
                      onChange={(e) => setSellerForm((p) => ({ ...p, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="affiliate-field-grid">
                  <div className="affiliate-field">
                    <label>Porcentaje por defecto (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={sellerForm.defaultPercentage}
                      onChange={(e) => setSellerForm((p) => ({ ...p, defaultPercentage: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="affiliate-field">
                    <label>Cantidad máxima de afiliados</label>
                    <input
                      type="number"
                      min={1}
                      value={sellerForm.maxAffiliates}
                      onChange={(e) => setSellerForm((p) => ({ ...p, maxAffiliates: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="affiliate-field">
                  <label>Descripción del programa</label>
                  <textarea
                    rows={4}
                    value={sellerForm.description}
                    onChange={(e) => setSellerForm((p) => ({ ...p, description: e.target.value }))}
                    required
                  />
                </div>
                <button type="submit" className="affiliate-btn affiliate-btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 size={15} className="affiliate-spin" /> Guardando…</>
                  ) : (
                    <><Save size={15} /> Guardar</>
                  )}
                </button>
              </form>
            ) : (
              <form className="affiliate-form" onSubmit={handleBuyerSubmit}>
                <div className="affiliate-field-grid">
                  <div className="affiliate-field">
                    <label>Nombre</label>
                    <input
                      value={buyerForm.firstName}
                      onChange={(e) => setBuyerForm((p) => ({ ...p, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="affiliate-field">
                    <label>Apellido</label>
                    <input
                      value={buyerForm.lastName}
                      onChange={(e) => setBuyerForm((p) => ({ ...p, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="affiliate-field-grid">
                  <div className="affiliate-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={buyerForm.email}
                      onChange={(e) => setBuyerForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="affiliate-field">
                    <label>Teléfono</label>
                    <input
                      value={buyerForm.phone}
                      onChange={(e) => setBuyerForm((p) => ({ ...p, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="affiliate-field-grid">
                  <div className="affiliate-field">
                    <label>Ciudad</label>
                    <input
                      value={buyerForm.city}
                      onChange={(e) => setBuyerForm((p) => ({ ...p, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="affiliate-field">
                    <label>Provincia</label>
                    <input
                      value={buyerForm.province}
                      onChange={(e) => setBuyerForm((p) => ({ ...p, province: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="affiliate-field">
                  <label>Redes sociales (opcional)</label>
                  <input
                    value={buyerForm.socialMedia}
                    onChange={(e) => setBuyerForm((p) => ({ ...p, socialMedia: e.target.value }))}
                  />
                </div>
                <div className="affiliate-field">
                  <label>Experiencia en ventas (opcional)</label>
                  <textarea
                    rows={3}
                    value={buyerForm.salesExperience}
                    onChange={(e) => setBuyerForm((p) => ({ ...p, salesExperience: e.target.value }))}
                  />
                </div>
                <label className="affiliate-checkbox">
                  <input
                    type="checkbox"
                    checked={buyerForm.privacyAccepted}
                    onChange={(e) => setBuyerForm((p) => ({ ...p, privacyAccepted: e.target.checked }))}
                  />
                  <span>Acepto la política de privacidad.</span>
                </label>
                <button
                  type="submit"
                  className="affiliate-btn affiliate-btn-primary"
                  disabled={submitting || !buyerForm.privacyAccepted}
                >
                  {submitting ? (
                    <><Loader2 size={15} className="affiliate-spin" /> Enviando…</>
                  ) : (
                    <><Send size={15} /> Enviar solicitud</>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
