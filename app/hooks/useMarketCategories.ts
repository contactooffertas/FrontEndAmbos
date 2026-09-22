"use client";

import { useEffect, useState } from "react";
import { categories as FALLBACK_CATEGORIES, type Category } from "../lib/db";

const API = "https://new-backend-lovat.vercel.app/api";

function iconForSlug(slug: string, backendIcon?: string) {
  const normalized = String(slug || "").trim().toLowerCase();
  const forcedIcons: Record<string, string> = {
    electronica: "Electronica",
    tecnologia: "Monitor",
    lavanderia: "Lavanderia",
  };
  return forcedIcons[normalized] || backendIcon || "Tag";
}

export function useMarketCategories() {
  const [categories, setCategories] = useState<Category[]>(
    FALLBACK_CATEGORIES.map((item) => ({
      ...item,
      iconName: iconForSlug(item.slug, item.iconName),
    }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch(`${API}/search/categories`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data?.categories) || data.categories.length === 0) return;
        setCategories(
          data.categories.map((item: any, index: number) => ({
            id: String(item._id || item.id || index + 1),
            name: String(item.name || ""),
            slug: String(item.slug || ""),
            iconName: iconForSlug(String(item.slug || ""), String(item.iconName || "")),
          }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
