"use client";

import { useEffect } from "react";

const BACKEND_ORIGIN = "https://new-backend-lovat.vercel.app";
const BACKEND_API_PREFIX = `${BACKEND_ORIGIN}/api/affiliates`;
const LOCAL_PROXY_PREFIX = "/api/backend-proxy/affiliates";

/**
 * Redirige SOLO las llamadas históricas del módulo de Afiliados que todavía
 * apuntan al backend absoluto. Esto evita CORS incluso en la primera carga,
 * antes de que el Service Worker tome control de la página.
 *
 * No modifica otras APIs de Rosario Market.
 */
export default function AffiliateFetchProxy() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const proxiedFetch: typeof window.fetch = (input, init) => {
      let rawUrl: string | null = null;

      if (typeof input === "string") {
        rawUrl = input;
      } else if (input instanceof URL) {
        rawUrl = input.toString();
      } else if (input instanceof Request) {
        rawUrl = input.url;
      }

      if (!rawUrl || !rawUrl.startsWith(BACKEND_API_PREFIX)) {
        return originalFetch(input, init);
      }

      const source = new URL(rawUrl);
      const suffix = source.pathname.replace(/^\/api\/affiliates/, "");
      const localUrl = `${LOCAL_PROXY_PREFIX}${suffix}${source.search}`;

      if (input instanceof Request) {
        const cloned = new Request(localUrl, input);
        return originalFetch(cloned, init);
      }

      return originalFetch(localUrl, init);
    };

    window.fetch = proxiedFetch;

    return () => {
      if (window.fetch === proxiedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  return null;
}
