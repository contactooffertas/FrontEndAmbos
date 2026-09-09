import type { MetadataRoute } from "next";

const SITE = "https://www.rosariomarket.com.ar";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/profile/",
        "/panel/",
        "/mis-productos/",
        "/ordenes/",
        "/chatpage/",
        "/login/",
        "/register/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
