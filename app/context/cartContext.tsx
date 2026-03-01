"use client";
// context/cartContext.tsx
// Carrito global persistido en backend. Al login, alerta si hay productos guardados.

import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from "react";
import { useAuth } from "./authContext";

const API = "https://new-backend-lovat.vercel.app/api";

interface CartItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  quantity: number;
  stock: number;
  image?: string;
  businessId?: string;
  businessName?: string;
  businessPhone?: string;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  loading: boolean;
  addToCart: (item: Omit<CartItem, "quantity">) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  checkout: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | null>(null);

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [alerted, setAlerted] = useState(false);

  // ── Fetch cart from backend ──────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/cart`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setCart(data.items || []);
      return data.items || [];
    } catch {
      return [];
    }
  }, [user]);

  // ── On user login: load cart and alert if has items ──────────────────────
  useEffect(() => {
    if (!user) { setCart([]); setAlerted(false); return; }

    fetchCart().then(async (items: CartItem[]) => {
      if (!alerted && items && items.length > 0) {
        setAlerted(true);
        const Swal = (await import("sweetalert2")).default;
        const result = await Swal.fire({
          title: "🛒 Tenés productos en tu carrito",
          html: `
            <p style="color:#6b7280;margin-bottom:1rem">
              Dejaste <strong>${items.length} producto${items.length !== 1 ? "s" : ""}</strong> guardado${items.length !== 1 ? "s" : ""} la última vez.
            </p>
            <div style="text-align:left;max-height:160px;overflow-y:auto;font-size:.85rem">
              ${items.map(i => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6">
                  <span>${i.name} ×${i.quantity}</span>
                  <strong style="color:#f97316">$${(i.price * i.quantity).toLocaleString()}</strong>
                </div>
              `).join("")}
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Ver carrito",
          cancelButtonText: "Ignorar",
          confirmButtonColor: "#f97316",
        });
        if (result.isConfirmed) {
          window.location.href = "/panel?tab=cart";
        }
      }
    });
  }, [user?.id]);

  // ── Add to cart ──────────────────────────────────────────────────────────
  const addToCart = async (item: Omit<CartItem, "quantity">) => {
    if (!user) {
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({ icon: "info", title: "Iniciá sesión", text: "Necesitás una cuenta para agregar al carrito.", timer: 2000, showConfirmButton: false });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/cart/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ productId: item.productId, quantity: 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []);
        const Swal = (await import("sweetalert2")).default;
        Swal.fire({ icon: "success", title: "¡Agregado!", text: `${item.name} fue agregado al carrito.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
      }
    } catch {}
    setLoading(false);
  };

  // ── Remove from cart ─────────────────────────────────────────────────────
  const removeFromCart = async (productId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cart/remove/${productId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []);
      }
    } catch {}
    setLoading(false);
  };

  // ── Update quantity ──────────────────────────────────────────────────────
  const updateQuantity = async (productId: string, quantity: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cart/update`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []);
      }
    } catch {}
    setLoading(false);
  };

  // ── Clear cart ───────────────────────────────────────────────────────────
  const clearCart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cart/clear`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) setCart([]);
    } catch {}
    setLoading(false);
  };

  // ── Checkout ─────────────────────────────────────────────────────────────
  const checkout = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cart/checkout`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setCart([]);
        setLoading(false);
        return true;
      }
    } catch {}
    setLoading(false);
    return false;
  };

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => {
    const price = item.discount ? item.price * (1 - item.discount / 100) : item.price;
    return acc + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, loading, addToCart, removeFromCart, updateQuantity, clearCart, checkout }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
