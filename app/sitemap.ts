import { MetadataRoute } from "next";

const SITE = "https://www.rosariomarket.com.ar";
const API = "https://new-backend-lovat.vercel.app/api";

const CATEGORY_SLUGS = [
  "electronica", "ropa-moda", "hogar", "deportes", "alimentos",
  "salud-belleza", "automotriz", "juguetes", "libros", "mascotas",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/destacados`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    ...CATEGORY_SLUGS.map((slug) => ({
      url: `${SITE}/categoria/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  let businessRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/business/sitemap`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const businesses: { _id: string; updatedAt?: string }[] = await res.json();
      businessRoutes = businesses.map((b) => ({
        url: `${SITE}/negocio/${b._id}`,
        lastModified: b.updatedAt ? new Date(b.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {}

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/products/sitemap`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const products: { _id: string; businessId: string; updatedAt?: string }[] = await res.json();
      productRoutes = products.map((p) => ({
        url: `${SITE}/negocio/${p.businessId}?p=${p._id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch {}

  return [...staticRoutes, ...businessRoutes, ...productRoutes];
}
