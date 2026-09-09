import type { Metadata } from 'next';
import '../styles/nosotros.css';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  ShoppingCart,
  MessageCircle,
  BarChart2,
  Tag,
  Zap,
  Users,
  ShieldCheck,
  Star,
  ChevronRight,
  UtensilsCrossed,
  Coffee,
  Candy,
  Store,
  Handshake,
  Search,
  HeartHandshake,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Nosotros',
  description:
    'Conocé Rosario Market, una plataforma pensada para conectar a personas con negocios, productos y ofertas de Rosario de forma simple, cercana y directa.',
  alternates: { canonical: '/nosotros' },
  openGraph: {
    title: 'Nosotros | Rosario Market',
    description:
      'Una vidriera digital para descubrir y acompañar al comercio local de Rosario.',
    url: 'https://www.rosariomarket.com.ar/nosotros',
    siteName: 'Rosario Market',
    locale: 'es_AR',
    type: 'website',
  },
};

export default function Nosotros() {
  const features = [
    {
      icon: <MapPin size={28} strokeWidth={1.8} />,
      title: 'Cercanía que sirve',
      desc: 'Usamos la ubicación para ayudarte a descubrir negocios y productos de Rosario cerca tuyo y comparar opciones por distancia.',
    },
    {
      icon: <Search size={28} strokeWidth={1.8} />,
      title: 'Encontrar antes que recorrer',
      desc: 'Buscá productos, categorías y comercios desde un solo lugar antes de salir a recorrer negocio por negocio.',
    },
    {
      icon: <ShoppingCart size={28} strokeWidth={1.8} />,
      title: 'Una experiencia simple',
      desc: 'Explorá productos, armá tu carrito y mantené organizadas tus opciones dentro de una misma plataforma.',
    },
    {
      icon: <MessageCircle size={28} strokeWidth={1.8} />,
      title: 'Trato directo',
      desc: 'Rosario Market acerca a compradores y comercios para que puedan comunicarse y coordinar de manera directa.',
    },
    {
      icon: <Store size={28} strokeWidth={1.8} />,
      title: 'Vidriera para el comercio local',
      desc: 'Cada negocio puede mostrar quién es, dónde está y qué vende para ganar presencia digital dentro de Rosario.',
    },
    {
      icon: <BarChart2 size={28} strokeWidth={1.8} />,
      title: 'Una plataforma que puede crecer',
      desc: 'Estamos construyendo herramientas para que comercios y usuarios tengan cada vez más formas de descubrirse, conectarse y volver.',
    },
  ];

  const community = [
    { icon: <UtensilsCrossed size={20} strokeWidth={1.8} />, label: 'Gastronomía local' },
    { icon: <Coffee size={20} strokeWidth={1.8} />, label: 'Dietéticas y almacenes' },
    { icon: <Candy size={20} strokeWidth={1.8} />, label: 'Kioscos y comercios de barrio' },
    { icon: <Store size={20} strokeWidth={1.8} />, label: 'Negocios de Rosario' },
    { icon: <Handshake size={20} strokeWidth={1.8} />, label: 'Emprendedores locales' },
    { icon: <HeartHandshake size={20} strokeWidth={1.8} />, label: 'Compra y trato cercano' },
  ];

  return (
    <main className="nosotros-page">
      <nav className="nosotros-breadcrumb" aria-label="Breadcrumb">
        <Link href="/" className="nosotros-breadcrumb-home" aria-label="Rosario Market — Volver al inicio">
          <span className="nosotros-brand-icon" aria-hidden="true">
            <Image src="/assets/navbarbolsa.png" alt="" width={32} height={32} />
          </span>
          <span className="nosotros-brand-wordmark">
            <span>Rosario</span><span>Market</span>
          </span>
        </Link>
        <ChevronRight size={14} className="nosotros-breadcrumb-sep" />
        <span className="nosotros-breadcrumb-current">Nosotros</span>
      </nav>

      <section className="nosotros-hero">
        <div className="nosotros-hero-media" aria-hidden="true">
          <Image src="/assets/monumento-hero.png" alt="" fill priority sizes="100vw" />
        </div>
        <div className="nosotros-hero-overlay" />
        <div className="nosotros-hero-content">
          <div className="nosotros-hero-tag"><Star size={13} strokeWidth={2.5} /> Hecho para Rosario</div>
          <h1 className="nosotros-hero-title">
            La ciudad tiene miles de vidrieras.<br />
            <span className="nosotros-hero-accent">Queremos ayudarte a encontrarlas.</span>
          </h1>
          <p className="nosotros-hero-sub">
            Rosario Market nació con una idea simple: que encontrar un producto o descubrir un negocio de Rosario no tenga que significar recorrer de punta a punta la ciudad. Queremos reunir comercios, productos y ofertas en una sola vidriera digital, con la cercanía como protagonista y el trato directo como parte de la experiencia.
          </p>
          <div className="nosotros-hero-signature">ROSARIO · BARRIOS · COMERCIO LOCAL</div>
        </div>
      </section>

      <section className="nosotros-image-banner">
        <div className="nosotros-image-wrapper">
          <Image src="/assets/monumento-hero.png" alt="Rosario y su comercio local" fill sizes="(max-width: 768px) 100vw, 1200px" />
          <div className="nosotros-image-overlay" />
          <div className="nosotros-image-badge">
            <span className="nosotros-badge-dot" />
            <Zap size={14} strokeWidth={2.5} />
            Negocios y productos de Rosario, más cerca
          </div>
        </div>
      </section>

      <section className="nosotros-features">
        <div className="nosotros-section-header">
          <span className="nosotros-section-kicker">LA IDEA</span>
          <h2 className="nosotros-section-title">Qué queremos resolver</h2>
          <p className="nosotros-section-desc">Una plataforma local tiene que ser útil para ambos lados: para quien busca y para quien vende.</p>
        </div>
        <div className="nosotros-features-grid">
          {features.map((f, index) => (
            <article key={f.title} className="nosotros-feature-card">
              <span className="nosotros-feature-number">0{index + 1}</span>
              <div className="nosotros-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nosotros-promo-banner">
        <div className="nosotros-promo-content">
          <p className="nosotros-promo-eyebrow"><Tag size={13} strokeWidth={2.5} /> Para comercios de Rosario</p>
          <h2 className="nosotros-promo-title">Tu negocio también puede tener su vidriera</h2>
          <p className="nosotros-promo-text">
            Rosario Market busca darle presencia digital al comercio local sin quedarse con una comisión por cada venta. Los negocios pueden mostrar sus productos, recibir visitas a su tienda y conectar directamente con potenciales clientes. Las opciones de visibilidad destacada son una herramienta adicional para quien quiera tener más exposición, no el motivo principal de estar en la plataforma.
          </p>
          <Link href="/register" className="nosotros-promo-btn"><Users size={16} strokeWidth={2} /> Sumar mi negocio</Link>
        </div>
        <div className="nosotros-promo-decor">RM</div>
      </section>

      <section className="nosotros-community">
        <div className="nosotros-section-header">
          <span className="nosotros-section-kicker">IDENTIDAD LOCAL</span>
          <h2 className="nosotros-section-title"><ShieldCheck size={28} strokeWidth={1.8} className="nosotros-title-icon" />Una plataforma con identidad local</h2>
          <p className="nosotros-section-desc">No queremos ser un catálogo genérico. Queremos que Rosario Market refleje la variedad de negocios y emprendimientos que forman parte de la ciudad.</p>
        </div>
        <div className="nosotros-community-grid">
          {community.map((item) => (
            <div key={item.label} className="nosotros-community-chip"><span className="nosotros-chip-icon">{item.icon}</span><span>{item.label}</span></div>
          ))}
        </div>
        <p className="nosotros-community-closing">Comprar local también empieza por poder encontrar lo que tenés cerca.{' '}<strong>Rosario Market: Rosario en una sola vidriera.</strong></p>
      </section>

      {/*
        IDEAS / MÉTRICAS FUTURAS — NO BORRAR.
        Mostrar cuando exista volumen real suficiente para respaldarlas:
        - “Miles de clientes”
        - “98 % de satisfacción”
        - Estadísticas públicas de productos y negocios
      */}
    </main>
  );
}
