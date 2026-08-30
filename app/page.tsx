import type { Metadata } from "next";
import HomeContent from "./componentes/HomeContent";

const API = "https://new-backend-lovat.vercel.app/api";
const SITE = "https://www.rosariomarket.com.ar";

export const metadata: Metadata = {
  title: "RosarioMarket — Ofertas y productos de negocios en Rosario, Santa Fe",
  description:
    "Comprá en negocios locales de Rosario, Argentina. Ofertas, envíos rápidos y productos cerca tuyo, todo en un solo lugar.",
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    title: "RosarioMarket — Ofertas cerca tuyo en Rosario",
    description:
      "Descubrí productos de negocios verificados de Rosario. Filtrá por categoría y ubicación.",
    url: `${SITE}/`,
    siteName: "RosarioMarket",
    locale: "es_AR",
    type: "website",
  },
};

interface SeoProduct {
  _id: string;
  name: string;
  image?: string;
  price: number;
  stock?: number;
  business?: { _id: string };
}

async function getSeoProducts(): Promise<SeoProduct[]> {
  try {
    const res = await fetch(`${API}/products/random?limit=20`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const products = await getSeoProducts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        image: p.image,
        url: `${SITE}/negocio/${p.business?._id}?p=${p._id}`,
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

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RosarioMarket",
    url: `${SITE}/`,
    areaServed: { "@type": "City", name: "Rosario" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <HomeContent />
    </>
  );
}
