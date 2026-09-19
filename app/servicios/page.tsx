"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MainLayout from "../componentes/MainLayout";
import { useAuth } from "../context/authContext";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  Camera,
  Clock3,
  HeartPulse,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Wrench,
  X,
} from "lucide-react";
import "../styles/servicios.css";

const API = "https://new-backend-lovat.vercel.app/api";
const TRADES = [
  "Electricista",
  "Gasista",
  "Plomero",
  "Cerrajero",
  "Refrigeración",
  "Técnico",
  "Albañil",
  "Pintor",
  "Jardinero",
  "Limpieza",
];
const CARE = [
  "Gerontólogo/a",
  "Acompañante terapéutico",
  "Enfermero/a",
  "Cuidador/a de adulto mayor",
  "Cuidado de pacientes",
];
type Provider = {
  _id: string;
  displayName: string;
  avatar?: string;
  headline?: string;
  trades: string[];
  serviceArea?: string;
  experienceYears: number;
  received: boolean;
  verificationStatus: string;
  availableNow: boolean;
  emergencyService: boolean;
  neighborhoods: string[];
  serviceRadiusKm?: number;
  rating: number;
  totalRatings: number;
  startingPrice?: number;
  owner?: { avatar?: string };
};

export default function ServiciosPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Provider[]>([]),
    [q, setQ] = useState(""),
    [trade, setTrade] = useState(""),
    [zone, setZone] = useState(""),
    [area, setArea] = useState(""),
    [gender, setGender] = useState(""),
    [minRating, setMinRating] = useState(""),
    [loading, setLoading] = useState(true),
    [formOpen, setFormOpen] = useState(false),
    [mine, setMine] = useState<any>(null),
    [saving, setSaving] = useState(false);
  const panelOpened = useRef(false);
  const [profileArea, setProfileArea] = useState("technical");
  const [avatarPreview, setAvatarPreview] = useState("");
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("marketplace_token")
      : null;
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${API}/services?${new URLSearchParams({ q, trade, zone, area, gender, minRating })}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      setProfiles(d.profiles || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [trade, area, gender, minRating]);
  const openForm = async () => {
    if (!token) {
      location.href = "/login?next=/servicios";
      return;
    }
    if (user?.role !== "user") {
      await Swal.fire({ icon:"info", title:"Cuenta no habilitada", text:"Para ofrecer un servicio necesitás una cuenta común. Las cuentas seller administran únicamente su negocio y sus productos.", confirmButtonColor:"#f97316" });
      return;
    }
    const r = await fetch(`${API}/services/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const current = (await r.json()) || {};
    setMine(current);
    setProfileArea(current.serviceArea || "technical");
    setAvatarPreview(current.avatar || "");
    setFormOpen(true);
  };
  useEffect(() => {
    if (panelOpened.current || !user || typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("panel") !== "1") return;
    panelOpened.current = true;
    void openForm();
  }, [user]);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const wantsVerification = fd.get("requestVerification") === "true";
    const credentialTitle = String(fd.get("credentialTitle") || "").trim();
    const credentialInstitution = String(
      fd.get("credentialInstitution") || "",
    ).trim();
    const referenceName = String(fd.get("referenceName") || "").trim();
    const referenceContact = String(fd.get("referenceContact") || "").trim();
    [
      "requestVerification",
      "credentialTitle",
      "credentialInstitution",
      "referenceName",
      "referenceContact",
    ].forEach((k) => fd.delete(k));
    const r = await fetch(`${API}/services/mine`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (r.ok && wantsVerification) {
      await fetch(`${API}/services/mine/verification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentials: credentialTitle
            ? [{ title: credentialTitle, institution: credentialInstitution }]
            : [],
          references: referenceName
            ? [
                {
                  name: referenceName,
                  relationship: "Cliente",
                  contact: referenceContact,
                },
              ]
            : [],
        }),
      });
    }
    setSaving(false);
    if (r.ok) {
      setFormOpen(false);
      await load();
    } else await Swal.fire({ icon:"error", title:"No se pudo guardar", text:(await r.json()).message || "Intentá nuevamente.", confirmButtonColor:"#f97316" });
  };
  const removeAvatar = async () => {
    const confirmation = await Swal.fire({ icon:"warning", title:"¿Eliminar la foto del perfil?", showCancelButton:true, confirmButtonText:"Eliminar", cancelButtonText:"Cancelar", confirmButtonColor:"#f97316", cancelButtonColor:"#123a5a" });
    if (!confirmation.isConfirmed) return;
    const r = await fetch(`${API}/services/mine/avatar`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) setMine((await r.json()).profile);
  };
  const deleteProfile = async () => {
    const confirmation = await Swal.fire({ icon:"warning", title:"¿Eliminar el perfil profesional?", text:"También se eliminarán sus opiniones. Esta acción es definitiva.", showCancelButton:true, confirmButtonText:"Eliminar perfil", cancelButtonText:"Cancelar", confirmButtonColor:"#f97316", cancelButtonColor:"#123a5a" });
    if (!confirmation.isConfirmed) return;
    const r = await fetch(`${API}/services/mine`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      setMine(null);
      setFormOpen(false);
      await load();
    }
  };
  return (
    <MainLayout>
      <div className="services-page">
        <section className="services-hero">
          <div>
            <span className="services-kicker">SERVICIOS ROSARIO MARKET</span>
            <h1>Encontrá ayuda confiable cerca tuyo.</h1>
            <p>
              Técnicos, profesionales de salud y personas de cuidado en Rosario,
              con reputación, zona y contacto directo.
            </p>
            <div className="services-search">
              <Search />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="¿Qué necesitás?"
              />
              <input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void load()}
                placeholder="Barrio o zona"
              />
              <button onClick={() => void load()}>Buscar</button>
            </div>
          </div>
          {user?.role !== "seller" && user?.role !== "admin" ? (
            <button className="provider-cta" onClick={() => void openForm()}>
              <Wrench /> {mine ? "Editar mi perfil" : "Ofrecer mis servicios"}
            </button>
          ) : (
            <p className="provider-account-note">Los servicios se publican desde una cuenta común independiente del negocio.</p>
          )}
        </section>
        <section className="service-sections">
          <button
            className={!area ? "active" : ""}
            onClick={() => {
              setArea("");
              setTrade("");
            }}
          >
            Todos
          </button>
          <button
            className={area === "technical" ? "active" : ""}
            onClick={() => {
              setArea("technical");
              setTrade("");
            }}
          >
            <Wrench /> Técnicos y oficios
          </button>
          <button
            className={area === "care" ? "active care" : "care"}
            onClick={() => {
              setArea("care");
              setTrade("");
            }}
          >
            <HeartPulse /> Salud y cuidados
          </button>
        </section>
        <div className="trade-strip">
          <button
            className={!trade ? "active" : ""}
            onClick={() => setTrade("")}
          >
            Todas las especialidades
          </button>
          {(area === "care"
            ? CARE
            : area === "technical"
              ? TRADES
              : [...CARE, ...TRADES]
          ).map((t) => (
            <button
              key={t}
              className={trade === t ? "active" : ""}
              onClick={() => setTrade(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {area === "care" && (
          <section className="care-intro">
            <HeartPulse />
            <div>
              <h2>Cuidado en domicilio, hospitales y clínicas</h2>
              <p>
                Acompañantes terapéuticos, enfermeros/as y cuidadores/as de
                adultos mayores o pacientes. Revisá experiencia, matrícula
                cuando corresponda, referencias, zona y reputación antes de
                contratar.
              </p>
            </div>
          </section>
        )}
        <section className="service-filters">
          <label>
            Sexo
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Cualquiera</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </select>
          </label>
          <label>
            Reputación
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="4">4 estrellas o más</option>
              <option value="4.5">4,5 estrellas o más</option>
            </select>
          </label>
          <button
            onClick={() => {
              setQ("");
              setZone("");
              setTrade("");
              setGender("");
              setMinRating("");
              setArea("");
            }}
          >
            Limpiar filtros
          </button>
        </section>
        <section className="trust-row">
          <div>
            <ShieldCheck />
            <b>Perfiles verificables</b>
            <span>Identidad, referencias y formación</span>
          </div>
          <div>
            <MapPin />
            <b>En tu zona</b>
            <span>Barrios y radio de trabajo claros</span>
          </div>
          <div>
            <Clock3 />
            <b>Disponibilidad real</b>
            <span>Programado o atención urgente</span>
          </div>
        </section>
        <div className="services-heading">
          <div>
            <h2>Profesionales disponibles</h2>
            <p>
              Los títulos ayudan a sumar confianza, pero no son obligatorios
              para publicar.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="services-empty">Cargando profesionales…</div>
        ) : profiles.length === 0 ? (
          <div className="services-empty">
            <Wrench />
            <h3>Todavía no hay perfiles para esta búsqueda</h3>
            <p>Podés ser el primero en ofrecer este servicio en Rosario.</p>
          </div>
        ) : (
          <div className="provider-grid">
            {profiles.map((p) => (
              <Link
                href={`/servicios/${p._id}`}
                className="provider-card"
                key={p._id}
              >
                <div className="provider-cover">
                  <img
                    src={p.avatar || p.owner?.avatar || "/assets/offerton.jpg"}
                    alt={p.displayName}
                  />
                  {p.availableNow && (
                    <span className="available">Disponible ahora</span>
                  )}
                </div>
                <div className="provider-body">
                  <div className="provider-name">
                    <h3>{p.displayName}</h3>
                    {p.verificationStatus === "verified" && (
                      <BadgeCheck aria-label="Verificado" />
                    )}
                  </div>
                  <p className="provider-headline">
                    {p.headline || p.trades.join(" · ")}
                  </p>
                  <div className="trade-tags">
                    {p.trades.slice(0, 3).map((x) => (
                      <span key={x}>{x}</span>
                    ))}
                  </div>
                  <div className="provider-meta">
                    <span>
                      <Star />{" "}
                      {p.rating ? Number(p.rating).toFixed(1) : "Nuevo"}{" "}
                      {p.totalRatings ? `(${p.totalRatings})` : ""}
                    </span>
                    <span>{p.experienceYears} años exp.</span>
                  </div>
                  <div className="provider-location">
                    <MapPin />
                    {p.neighborhoods?.length
                      ? p.neighborhoods.slice(0, 2).join(" · ")
                      : "Rosario"}
                    {p.serviceRadiusKm
                      ? ` · hasta ${p.serviceRadiusKm} km`
                      : ""}
                  </div>
                  {p.serviceArea === "care" && (
                    <div className="care-badge">
                      <HeartPulse /> Domicilio · hospital · clínica
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        {formOpen && (
          <div
            className="service-modal"
            onMouseDown={(e) =>
              e.target === e.currentTarget && setFormOpen(false)
            }
          >
            <form className="service-form" onSubmit={submit}>
              <button
                type="button"
                className="modal-close"
                onClick={() => setFormOpen(false)}
              >
                <X />
              </button>
              <div className="form-title">
                <img src="/assets/navbarbolsa.png" alt="" />
                <div>
                  <h2>Tu perfil profesional</h2>
                  <p>
                    Completá lo que ayude a una familia a elegirte con
                    confianza.
                  </p>
                </div>
              </div>
              {mine?._id && (
                <div className="profile-manager">
                  <img
                    src={mine.avatar || "/assets/offerton.jpg"}
                    alt="Avatar actual"
                  />
                  <div>
                    <b>Panel de mi perfil</b>
                    <span>
                      Estado:{" "}
                      {mine.verificationStatus === "verified"
                        ? "Verificado"
                        : mine.verificationStatus === "pending"
                          ? "En revisión"
                          : "Sin verificar"}
                    </span>
                    <span>
                      {mine.active !== false ? "Publicado" : "Pausado"}
                    </span>
                  </div>
                  {mine.avatar && (
                    <button type="button" onClick={() => void removeAvatar()}>
                      Eliminar avatar
                    </button>
                  )}
                </div>
              )}
              <section className="form-section avatar-section">
                <div className="avatar-picker">
                  <img
                    src={
                      avatarPreview || mine?.avatar || "/assets/offerton.jpg"
                    }
                    alt="Vista previa del avatar"
                  />
                  <label className="avatar-upload">
                    <Camera size={18} />
                    <span>
                      {avatarPreview || mine?.avatar
                        ? "Cambiar foto"
                        : "Elegir foto"}
                    </span>
                    <input
                      name="avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAvatarPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                </div>
                <div>
                  <h3>Foto profesional</h3>
                  <p>
                    Usá una foto clara de tu rostro. JPG, PNG o WebP de hasta 5
                    MB.
                  </p>
                </div>
              </section>
              <div className="form-section-title">
                <span>1</span>
                <div>
                  <b>Datos principales</b>
                  <small>Lo primero que verán las familias</small>
                </div>
              </div>
              <div className="form-two">
                <label>
                  Nombre para mostrar *
                  <input
                    name="displayName"
                    required
                    defaultValue={mine?.displayName}
                  />
                </label>
                <label>
                  Años de experiencia
                  <input
                    name="experienceYears"
                    type="number"
                    min="0"
                    max="70"
                    defaultValue={mine?.experienceYears || 0}
                  />
                </label>
              </div>
              <div className="form-two">
                <label>
                  Sección
                  <select
                    name="serviceArea"
                    value={profileArea}
                    onChange={(e) => setProfileArea(e.target.value)}
                  >
                    <option value="technical">Técnicos y oficios</option>
                    <option value="care">Salud y cuidados</option>
                    <option value="general">Otros servicios</option>
                  </select>
                </label>
                <label>
                  Sexo (opcional)
                  <select name="gender" defaultValue={mine?.gender || ""}>
                    <option value="">Prefiero no indicarlo</option>
                    <option value="female">Femenino</option>
                    <option value="male">Masculino</option>
                  </select>
                </label>
              </div>
              <fieldset className="specialty-field">
                <legend>Oficios o especialidades *</legend>
                <p>Podés seleccionar más de una.</p>
                <div className="specialty-grid">
                  {(profileArea === "care" ? CARE : TRADES).map((item) => (
                    <label className="specialty-chip" key={item}>
                      <input
                        type="checkbox"
                        name="trades"
                        value={item}
                        defaultChecked={mine?.trades?.includes(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
                <label>
                  Otra especialidad
                  <input
                    name="trades"
                    placeholder="Escribí otra si no aparece"
                  />
                </label>
              </fieldset>
              <div className="form-section-title">
                <span>2</span>
                <div>
                  <b>Presentación y contacto</b>
                  <small>Explicá qué hacés y cómo contactarte</small>
                </div>
              </div>
              <label>
                Presentación breve
                <input
                  name="headline"
                  defaultValue={mine?.headline}
                  placeholder="Instalaciones y reparaciones en Rosario"
                />
              </label>
              <label>
                Contá tu experiencia
                <textarea
                  name="bio"
                  rows={4}
                  defaultValue={mine?.bio}
                  placeholder="Tipos de trabajos, experiencia, forma de trabajar..."
                />
              </label>
              <div className="form-two">
                <label>
                  WhatsApp
                  <input
                    name="whatsapp"
                    defaultValue={mine?.whatsapp}
                    placeholder="341..."
                  />
                </label>
                <label>
                  Teléfono
                  <input name="phone" defaultValue={mine?.phone} />
                </label>
              </div>
              <div className="form-two">
                <label>
                  Contacto preferido
                  <select
                    name="contactPreference"
                    defaultValue={mine?.contactPreference || "both"}
                  >
                    <option value="both">Chat y WhatsApp</option>
                    <option value="chat">Solo chat</option>
                    <option value="whatsapp">Solo WhatsApp</option>
                  </select>
                </label>
                <label>
                  Precio desde (opcional)
                  <input
                    name="startingPrice"
                    type="number"
                    min="0"
                    defaultValue={mine?.startingPrice}
                  />
                </label>
              </div>
              <div className="form-two">
                <label>
                  Modalidad del precio
                  <select
                    name="pricingUnit"
                    defaultValue={mine?.pricingUnit || "visit"}
                  >
                    <option value="hour">Por hora</option>
                    <option value="visit">Por visita</option>
                    <option value="shift">Por turno</option>
                    <option value="day">Por día</option>
                  </select>
                </label>
                <label>
                  Radio de atención (km)
                  <input
                    name="serviceRadiusKm"
                    type="number"
                    min="1"
                    max="40"
                    defaultValue={mine?.serviceRadiusKm || 8}
                  />
                </label>
              </div>
              <label>
                Dirección (opcional)
                <input
                  name="address"
                  defaultValue={mine?.address}
                  placeholder="No se publicará salvo que lo autorices"
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="showAddress"
                  value="true"
                  defaultChecked={mine?.showAddress}
                />{" "}
                Mostrar mi dirección públicamente
              </label>
              <label>
                Barrios o zonas
                <input
                  name="neighborhoods"
                  defaultValue={mine?.neighborhoods?.join(", ")}
                  placeholder="Centro, Echesortu, Zona Sur"
                />
              </label>
              <label>
                Horarios
                <input
                  name="schedule"
                  defaultValue={mine?.schedule}
                  placeholder="Lun a sáb 8 a 19 h"
                />
              </label>
              <fieldset className="verification-box">
                <legend>
                  <HeartPulse size={18} /> Opciones de cuidado y salud
                </legend>
                <p>Completalo si atendés pacientes o personas mayores.</p>
                <div className="check-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      name="careSettings"
                      value="home"
                      defaultChecked={mine?.careSettings?.includes("home")}
                    />{" "}
                    Domicilio
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="careSettings"
                      value="hospital"
                      defaultChecked={mine?.careSettings?.includes("hospital")}
                    />{" "}
                    Hospital
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="careSettings"
                      value="clinic"
                      defaultChecked={mine?.careSettings?.includes("clinic")}
                    />{" "}
                    Clínica
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="careSettings"
                      value="overnight"
                      defaultChecked={mine?.careSettings?.includes("overnight")}
                    />{" "}
                    Turno nocturno
                  </label>
                </div>
                <label>
                  Matrícula profesional (privada hasta verificar)
                  <input
                    name="professionalRegistration"
                    defaultValue={mine?.professionalRegistration}
                  />
                </label>
              </fieldset>
              <div className="check-row">
                <label className="check">
                  <input
                    type="checkbox"
                    name="received"
                    value="true"
                    defaultChecked={mine?.received}
                  />{" "}
                  Tengo título o certificación
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    name="availableNow"
                    value="true"
                    defaultChecked={mine?.availableNow}
                  />{" "}
                  Disponible ahora
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    name="emergencyService"
                    value="true"
                    defaultChecked={mine?.emergencyService}
                  />{" "}
                  Atiendo urgencias
                </label>
              </div>
              <fieldset className="verification-box">
                <legend>
                  <ShieldCheck size={18} /> Verificación de experiencia
                </legend>
                <p>
                  Opcional. Rosario Market revisará la información antes de
                  mostrar la insignia.
                </p>
                <div className="form-two">
                  <label>
                    Título, matrícula o curso
                    <input
                      name="credentialTitle"
                      defaultValue={mine?.credentials?.[0]?.title}
                    />
                  </label>
                  <label>
                    Institución
                    <input
                      name="credentialInstitution"
                      defaultValue={mine?.credentials?.[0]?.institution}
                    />
                  </label>
                </div>
                <div className="form-two">
                  <label>
                    Referencia de cliente
                    <input name="referenceName" placeholder="Nombre" />
                  </label>
                  <label>
                    Contacto privado de referencia
                    <input
                      name="referenceContact"
                      placeholder="Teléfono o email"
                    />
                  </label>
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    name="requestVerification"
                    value="true"
                  />{" "}
                  Enviar estos datos para verificación
                </label>
              </fieldset>
              <button className="save-provider" disabled={saving}>
                {saving ? "Guardando…" : "Publicar perfil"}
              </button>
              {mine?._id && (
                <button
                  className="delete-provider"
                  type="button"
                  onClick={() => void deleteProfile()}
                >
                  Eliminar mi perfil profesional
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
