// app/lib/productService.ts

import {
  Laptop,
  Shirt,
  Home,
  Trophy,
  Baby,
  Apple,
  Heart,
  Car,
  PawPrint,
  Package
} from "lucide-react";

const API_URL = "https://vercel-backend-ochre-nine.vercel.app/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// Lee lat/lng del usuario desde localStorage (guardado por authContext)
function getUserLocation(): { lat: number; lng: number; locationEnabled: boolean } | null {
  try {
    const raw = localStorage.getItem("marketplace_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user?.locationEnabled && user?.lat && user?.lng) {
      return { lat: user.lat, lng: user.lng, locationEnabled: true };
    }
    return null;
  } catch {
    return null;
  }
}

export interface Product {
  _id: string;
  deliveryRadius: number;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  finalPrice?: number;
  category: string;
  stock: number;
  image?: string;
  imagePublicId?: string;
  businessId?: string;
  createdAt?: string;
}

export const CATEGORIES = [
  { value: "electronica",    label: "Electrónica",    icon: Laptop   },
  { value: "ropa-moda",      label: "Ropa y Moda",    icon: Shirt    },
  { value: "hogar",          label: "Hogar",          icon: Home     },
  { value: "deportes",       label: "Deportes",       icon: Trophy   },
  { value: "juguetes",       label: "Juguetes",       icon: Baby     },
  { value: "alimentos",      label: "Alimentos",      icon: Apple    },
  { value: "salud-belleza",  label: "Belleza",        icon: Heart    },
  { value: "automotor",      label: "Automotor",      icon: Car      },
  { value: "mascotas",       label: "Mascotas",       icon: PawPrint },
  { value: "otros",          label: "Otros",          icon: Package  },
];

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  return res.json();
}

export async function getPublicProducts(filters?: {
  category?: string;
  search?: string;
}): Promise<{ products: Product[] }> {
  const params = new URLSearchParams();

  if (filters?.category) params.set("category", filters.category);
  if (filters?.search)   params.set("search", filters.search);

  // Adjuntar coordenadas del comprador si las tiene activadas
  const location = getUserLocation();
  if (location) {
    params.set("lat", location.lat.toString());
    params.set("lng", location.lng.toString());
  }

  const res = await fetch(`${API_URL}/products?${params}`);
  const data = await res.json();
  return { products: data.products ?? [] };
}

export async function getMyProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products/my-products`, {
    headers: authHeaders(),
  });
  return handleResponse<Product[]>(res);
}

export async function createProduct(formData: FormData): Promise<Product> {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse<Product>(res);
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse<Product>(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}