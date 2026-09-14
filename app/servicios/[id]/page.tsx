"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "../../componentes/MainLayout";
import {
  BadgeCheck,
  Building2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import "../../styles/servicios.css";
const API = "https://new-backend-lovat.vercel.app/api";
export default function ServiceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  useEffect(() => {
    fetch(`${API}/services/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, [id]);
  if (!data?.profile)
    return (
      <MainLayout>
        <div className="services-empty">Cargando perfil…</div>
      </MainLayout>
    );
  const p = data.profile;
  const chat = async () => {
    const token = localStorage.getItem("marketplace_token");
    if (!token) {
      router.push(`/login?next=/servicios/${id}`);
      return;
    }
    const r = await fetch(`${API}/chat/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ participantId: p.owner?._id }),
    });
    const c = await r.json();
    if (r.ok) router.push(`/chatpage?conversationId=${c._id}`);
  };
  const wa = String(p.whatsapp || p.phone || "").replace(/\D/g, "");
  const priceUnits:Record<string,string>={hour:"hora",visit:"visita",shift:"turno",day:"día"};
  const submitReview=async(e:React.FormEvent)=>{e.preventDefault();const token=localStorage.getItem("marketplace_token");if(!token){router.push(`/login?next=/servicios/${id}`);return}const r=await fetch(`${API}/services/${id}/rate`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({rating:reviewRating,comment:reviewComment,serviceReceived:true})});if(r.ok){setReviewComment("");const refreshed=await fetch(`${API}/services/${id}`,{cache:"no-store"});setData(await refreshed.json())}else alert((await r.json()).message||"No se pudo publicar la opinión")};
  return (
    <MainLayout>
      <div className="service-detail">
        <section className="profile-panel">
          <img
            className="profile-avatar"
            src={p.avatar || p.owner?.avatar || "/assets/offerton.jpg"}
            alt={p.displayName}
          />
          <div className="profile-main">
            <div className="provider-name">
              <h1>{p.displayName}</h1>
              {p.verificationStatus === "verified" && <BadgeCheck />}
            </div>
            <p>{p.headline || p.trades.join(" · ")}</p>
            <div className="trade-tags">
              {p.trades.map((x: string) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <div className="profile-facts">
              <span>
                <Star />{" "}
                {p.rating ? Number(p.rating).toFixed(1) : "Perfil nuevo"}
              </span>
              <span>
                <Clock3 /> {p.experienceYears} años de experiencia
              </span>
              <span>
                <MapPin /> {p.neighborhoods?.join(" · ") || "Rosario"} {p.serviceRadiusKm ? `· radio ${p.serviceRadiusKm} km` : ""}
              </span>
              {p.verificationStatus === "verified" && (
                <span>
                  <ShieldCheck /> Identidad y experiencia verificadas
                </span>
              )}
            </div>
          </div>
          <aside className="contact-box">
            {p.availableNow && (
              <b className="available-inline">Disponible ahora</b>
            )}
            <button onClick={() => void chat()}>
              <MessageCircle /> Escribir por chat
            </button>
            {wa && p.contactPreference !== "chat" && (
              <a
                href={`https://wa.me/${wa.startsWith("54") ? wa : `54${wa}`}?text=${encodeURIComponent(`Hola ${p.displayName}, te encontré en Rosario Market y necesito consultar por un servicio.`)}`}
                target="_blank"
              >
                <Phone /> Consultar por WhatsApp
              </a>
            )}
            {p.startingPrice != null && (
              <small>
                Desde ${Number(p.startingPrice).toLocaleString("es-AR")} por {priceUnits[p.pricingUnit]||"visita"}
              </small>
            )}
          </aside>
        </section>
        {p.serviceArea==="care"&&<section className="profile-copy care-profile"><h2>Modalidad de cuidado</h2><p>{p.careSettings?.length?p.careSettings.map((x:string)=>({home:"Domicilio",hospital:"Hospital",clinic:"Clínica",overnight:"Turno nocturno",hourly:"Por horas"}[x]||x)).join(" · "):"Consultá por chat o WhatsApp la modalidad y disponibilidad."}</p><p><ShieldCheck/> La verificación de Rosario Market no reemplaza la comprobación de matrícula profesional ni una entrevista de la familia.</p></section>}
        <section className="reviews-section"><h2>Reputación y opiniones</h2><p>{p.totalRatings?`${Number(p.rating).toFixed(1)} de 5 · ${p.totalRatings} opiniones`:"Todavía no tiene opiniones."}</p><form className="review-form" onSubmit={submitReview}><label>Tu calificación<select value={reviewRating} onChange={e=>setReviewRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} estrellas</option>)}</select></label><label>Contá cómo fue el servicio<textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)} maxLength={600} required/></label><button>Publicar opinión</button></form><div className="reviews-list">{data.reviews?.map((r:any)=><article key={r._id}><div><b>{r.author?.name||"Usuario de Rosario Market"}</b><span>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span></div><p>{r.comment||"Calificó el servicio sin comentario."}</p></article>)}</div></section>
        <section className="profile-copy">
          <h2>Sobre su trabajo</h2>
          <p>
            {p.bio ||
              "Este profesional todavía no agregó una descripción detallada."}
          </p>
          {p.schedule && (
            <p>
              <b>Horarios:</b> {p.schedule}
            </p>
          )}
          {p.showAddress && p.address && (
            <p>
              <b>Dirección:</b> {p.address}
            </p>
          )}
        </section>
        {data.recommendedBusinesses?.length > 0 && (
          <section className="recommended">
            <h2>Comercios relacionados con este oficio</h2>
            <p>
              Solo mostramos ferreterías y negocios compatibles con el trabajo
              de este profesional.
            </p>
            <div className="recommended-grid">
              {data.recommendedBusinesses.map((b: any) => (
                <Link href={`/negocio/${b._id}`} key={b._id}>
                  <img src={b.logo || "/assets/navbarbolsa.png"} alt="" />
                  <div>
                    <b>{b.name}</b>
                    <span>{b.categories?.join(" · ")}</span>
                  </div>
                  <Building2 />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
