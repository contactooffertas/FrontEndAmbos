import type { Metadata } from "next";
import HomeContent from "./componentes/HomeContent";
import "./styles/home-v2.css";

const API = "https://new-backend-lovat.vercel.app/api";
const SITE = "https://www.rosariomarket.com.ar";

export const metadata: Metadata = {
  title: "Negocios, productos y ofertas en Rosario",
  description:
    "Encontrá negocios, productos y ofertas de Rosario, Santa Fe. Descubrí comercios locales, explorá por categoría y encontrá opciones cerca tuyo.",
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    title: "Rosario Market | Todo Rosario, en un solo lugar",
    description:
      "Descubrí negocios, productos y ofertas de Rosario y encontrá opciones cerca tuyo.",
    url: `${SITE}/`,
    siteName: "Rosario Market",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: `${SITE}/assets/offerton.png`,
        width: 512,
        height: 512,
        alt: "Rosario Market",
      },
    ],
  },
};

interface SeoProduct {
  _id: string;
  name: string;
  image?: string;
  price: number;
  stock?: number;
  business?: { _id: string; name?: string };
}

async function getSeoProducts(): Promise<SeoProduct[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API}/products/random?limit=20`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const products = await getSeoProducts();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Productos disponibles en Rosario Market",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        ...(p.image ? { image: p.image } : {}),
        url: p.business?._id
          ? `${SITE}/negocio/${p.business._id}?p=${p._id}`
          : `${SITE}/`,
        ...(p.business?.name
          ? { brand: { "@type": "Brand", name: p.business.name } }
          : {}),
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "ARS",
          availability:
            (p.stock ?? 0) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      },
    })),
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Rosario Market",
    url: `${SITE}/`,
    inLanguage: "es-AR",
    description:
      "Marketplace local para descubrir negocios, productos y ofertas de Rosario, Santa Fe.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rosario Market",
    url: `${SITE}/`,
    logo: `${SITE}/assets/offerton.png`,
    areaServed: {
      "@type": "City",
      name: "Rosario",
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "Santa Fe, Argentina",
      },
    },
  };

  return (
    <div className="home-v2-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HomeContent />
    </div>
  );
}
