import '../styles/nosotros.css';
import Image from 'next/image';
import Link from 'next/link';
import {
  Home,
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
  Flag,
} from 'lucide-react';

export default function Nosotros() {
  const features = [
    {
      icon: <MapPin size={28} strokeWidth={1.8} />,
      title: 'Lo local primero',
      desc: 'Radios de 5, 10 o 20 km para entregas rápidas, o cobertura nacional con opciones destacadas.',
    },
    {
      icon: <ShoppingCart size={28} strokeWidth={1.8} />,
      title: 'Carrito inteligente',
      desc: 'Agregá productos de distintos vendedores y coordiná todo desde un solo lugar.',
    },
    {
      icon: <MessageCircle size={28} strokeWidth={1.8} />,
      title: 'Chat fluido',
      desc: 'Hablá directamente con el vendedor para coordinar, negociar y cerrar el trato.',
    },
    {
      icon: <BarChart2 size={28} strokeWidth={1.8} />,
      title: 'Sistema de reportes',
      desc: 'Transparencia total: reportes claros que mantienen la plataforma confiable para todos.',
    },
  ];

  const community = [
    { icon: <UtensilsCrossed size={20} strokeWidth={1.8} />, label: 'Empanadas caseras' },
    { icon: <Coffee size={20} strokeWidth={1.8} />,          label: 'Yerba mate al por mayor' },
    { icon: <Candy size={20} strokeWidth={1.8} />,           label: 'Golosinas de kiosco' },
    { icon: <Store size={20} strokeWidth={1.8} />,           label: 'Almacenes de barrio' },
    { icon: <Handshake size={20} strokeWidth={1.8} />,       label: 'Emprendedores locales' },
    { icon: <Flag size={20} strokeWidth={1.8} />,            label: 'Todo entre argentinos' },
  ];

  return (
    <main className="nosotros-page">

      {/* ── Breadcrumb ── */}
      <nav className="nosotros-breadcrumb" aria-label="Breadcrumb">
        <Link href="/" className="nosotros-breadcrumb-home">
          <Home size={16} strokeWidth={2} />
          <span>Home</span>
        </Link>
        <ChevronRight size={14} className="nosotros-breadcrumb-sep" />
        <span className="nosotros-breadcrumb-current">Nosotros</span>
      </nav>

      {/* ── Hero ── */}
      <section className="nosotros-hero">
        <div className="nosotros-hero-tag">
          <Star size={13} strokeWidth={2.5} />
          Nuestra Historia
        </div>
        <h1 className="nosotros-hero-title">
          Donde el trato directo<br />
          <span className="nosotros-hero-accent">hace la diferencia</span>
        </h1>
        <p className="nosotros-hero-sub">
          Nacimos en Rosario, Santa Fe, para resolver un problema cotidiano: conectar
          ofertas de kioscos, almacenes y emprendedores con quienes buscan gangas cerca de casa.
          Hoy llegamos a todo el país, con miles de ofertas geolocalizadas que fortalecen
          el comercio tradicional.
        </p>
      </section>

      {/* ── Image Banner ── */}
      <section className="nosotros-image-banner">
        <div className="nosotros-image-wrapper">
          <Image
            src="/assets/offerton.png"
            alt="Ofertas vibrantes en mapa de Argentina"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className="nosotros-image-overlay" />
          <div className="nosotros-image-badge">
            <span className="nosotros-badge-dot" />
            <Zap size={14} strokeWidth={2.5} />
            Ofertas geolocalizadas en tiempo real
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="nosotros-features">
        <div className="nosotros-section-header">
          <h2 className="nosotros-section-title">Cómo nos diferenciamos</h2>
          <p className="nosotros-section-desc">
            Tecnología al servicio del barrio, sin complicaciones ni comisiones ocultas.
          </p>
        </div>

        <div className="nosotros-features-grid">
          {features.map((f) => (
            <div key={f.title} className="nosotros-feature-card">
              <div className="nosotros-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Promo Banner ── */}
      <section className="nosotros-promo-banner">
        <div className="nosotros-promo-content">
          <p className="nosotros-promo-eyebrow">
            <Tag size={13} strokeWidth={2.5} />
            Oferta fundadores
          </p>
          <h2 className="nosotros-promo-title">Gratis por 2 meses</h2>
          <p className="nosotros-promo-text">
            Más <strong>30% de descuento vitalicio</strong>. Solo cobramos por visibilidad extra,
            nunca comisiones ocultas por ventas.
          </p>
          <a href="/register" className="nosotros-promo-btn">
            <Users size={16} strokeWidth={2} />
            Quiero ser fundador
          </a>
        </div>
        <div className="nosotros-promo-decor">%</div>
      </section>

      {/* ── Comunidad ── */}
      <section className="nosotros-community">
        <div className="nosotros-section-header">
          <h2 className="nosotros-section-title">
            <ShieldCheck size={28} strokeWidth={1.8} className="nosotros-title-icon" />
            Compromiso con la comunidad
          </h2>
        </div>

        <div className="nosotros-community-grid">
          {community.map((item) => (
            <div key={item.label} className="nosotros-community-chip">
              <span className="nosotros-chip-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <p className="nosotros-community-closing">
          Apoyamos la economía real: sin complicaciones, sin intermediarios innecesarios.{' '}
          <strong>¡Ofertas.com.ar: donde el trato directo hace la diferencia!</strong>
        </p>
      </section>

    </main>
  );
}