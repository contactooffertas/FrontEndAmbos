import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/panel", "/perfil", "/login", "/register"] },
    sitemap: "https://www.rosariomarket.com.ar/sitemap.xml",
  };
}
