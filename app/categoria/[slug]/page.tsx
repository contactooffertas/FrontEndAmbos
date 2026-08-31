// app/categoria/[slug]/page.tsx
// Route que carga el componente de categoría con SEO: título/descripción
// dinámicos por categoría + JSON-LD de los productos, generados en el server
// antes de renderizar el componente client interactivo.

import type { Metadata } from "next";
import CategoriaContent from "../../componentes/categorias";
import { categories } from "../../lib/db";

const API = process.env.NEXT_PUBLIC_API_URL || "https://new-backend-lovat.vercel.app/api";
const SITE = "https://www.rosariomarket.com.ar";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = categories.find((c) => c.slug === params.slug);
  const name = cat?.name || params.slug;
  const title = `${name} en Rosario | RosarioMarket`;
  const description = `Comprá ${name.toLowerCase()} en negocios locales de Rosario. Ofertas y envío rápido cerca tuyo.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE}/categoria/${params.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/categoria/${params.slug}`,
      siteName: "RosarioMarket",
      locale: "es_AR",
      type: "website",
    },
  };
}

interface SeoProduct {
  _id: string;
  name: string;
  image?: string;
  price: number;
  stock?: number;
  business?: { _id: string };
}

async function getCategoryProducts(slug: string): Promise<SeoProduct[]> {
  try {
    const res = await fetch(`${API}/products?category=${encodeURIComponent(slug)}&limit=20`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch {
    return [];
  }
}

export default async function Page({ params }: Props) {
  const products = await getCategoryProducts(params.slug);
  const cat = categories.find((c) => c.slug === params.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cat?.name || params.slug,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoriaContent />
    </>
  );
}
