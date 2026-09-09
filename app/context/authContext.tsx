"use client";
// context/AuthContext.tsx

import React, {
  createContext, useContext, useState, useEffect, useRef, ReactNode,
} from "react";

const API = "https://new-backend-lovat.vercel.app/api";

// ── Helpers VAPID ─────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer  = new ArrayBuffer(rawData.length);
  const view    = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buffer;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketplace_token");
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id:                   string;
  name:                 string;
  email:                string;
  role:                 "user" | "seller" | "admin";
  avatar?:              string;
  businessId?:          string;
  notificationsEnabled: boolean;
  locationEnabled:      boolean;
  lat?:                 number;
  lng?:                 number;
}

interface AuthContextType {
  user:                 AuthUser | null;
  loading:              boolean;
  login:                (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register:             (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; message: string }>;
  logout:               () => void;
  updateUser:           (data: Partial<AuthUser>) => void;
  enableNotifications:  () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  enableLocation:       () => Promise<{ lat: number; lng: number } | null>;
  disableLocation:      () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  // ── Cargar usuario persistido ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem("marketplace_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  // ── Registrar Service Worker ──
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        swRef.current = reg;
        navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
          if (event.data?.type === "NAVIGATE" && event.data?.url) {
            window.location.href = event.data.url;
          }
        });
      })
      .catch(err => console.warn("[SW] Error registrando:", err));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const saveUser = (u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem("marketplace_user", JSON.stringify(u));
    else   localStorage.removeItem("marketplace_user");
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("marketplace_user", JSON.stringify(updated));
      return updated;
    });
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Error al iniciar sesión" };

      localStorage.setItem("marketplace_token", data.token);

      const u = data.user;
      const formattedUser: AuthUser = {
        id:                   u._id,
        name:                 u.name,
        email:                u.email,
        role:                 u.role,
        avatar:               u.avatar,
        businessId:           u.businessId,
        notificationsEnabled: u.notificationsEnabled ?? false,
        locationEnabled:      u.locationEnabled      ?? false,
        lat:                  u.lat,
        lng:                  u.lng,
      };
      saveUser(formattedUser);
      return { success: true, message: `Bienvenido, ${formattedUser.name}!` };
    } catch {
      return { success: false, message: "Error de conexión con el servidor" };
    }
  };

  const register = async (name: string, email: string, password: string, role = "user") => {
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Error al registrarse" };
      return { success: true, message: data.message };
    } catch {
      return { success: false, message: "Error de conexión con el servidor" };
    }
  };

  const logout = async () => {
    // Desuscribir push antes de salir
    try {
      const reg = swRef.current ?? (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const token = getToken();
        if (token) {
          await fetch(`${API}/push/unsubscribe`, {
            method:  "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ endpoint }),
          });
        }
      }
    } catch {}
    localStorage.removeItem("marketplace_token");
    saveUser(null);
  };

  // ── Push Notifications ────────────────────────────────────────────────────
  const enableNotifications = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("[Push] Navegador no soporta notificaciones");
      return false;
    }

    const VAPID_PUBLIC = "BLR8fiu0VNED_-qHI0rOQn_UPEtJptD4wiYJXuBQxgBhFFRf_SvU54F95IBaBG86V-cv3wwZ4l_NlLD236io1rw";
    if (!VAPID_PUBLIC) {
      console.warn("[Push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return false;
    }

    try {
      // 1. Pedir permiso
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("[Push] Permiso denegado");
        return false;
      }

      // 2. Obtener SW registrado
      const reg = swRef.current ?? (await navigator.serviceWorker.ready);

      // 3. Suscribir al push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      // 4. Enviar suscripción al backend
      const token = getToken();
      if (!token) return false;

      const res = await fetch(`${API}/push/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) throw new Error("Error guardando suscripción");

      // 5. Persistir en backend y estado local
      await fetch(`${API}/user/update`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ notificationsEnabled: true }),
      });

      updateUser({ notificationsEnabled: true });
      console.log("[Push] Suscripción guardada ✅");
      return true;
    } catch (err) {
      console.error("[Push] Error al suscribirse:", err);
      return false;
    }
  };

  const disableNotifications = async (): Promise<void> => {
    try {
      const reg = swRef.current ?? (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const token = getToken();
        if (token) {
          await fetch(`${API}/push/unsubscribe`, {
            method:  "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ endpoint }),
          });
          await fetch(`${API}/user/update`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ notificationsEnabled: false }),
          });
        }
      }
    } catch (err) {
      console.warn("[Push] Error al desuscribirse:", err);
    }
    updateUser({ notificationsEnabled: false });
  };

  // ── Geolocation ───────────────────────────────────────────────────────────
  const enableLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          updateUser({ locationEnabled: true, ...coords });

          // Guardar en backend
          try {
            const token = getToken();
            if (token) {
              await fetch(`${API}/push/location`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body:    JSON.stringify(coords),
              });
            }
          } catch {}

          resolve(coords);
        },
        err => {
          console.warn("[Location] Error:", err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 }
      );
    });
  };

  const disableLocation = () => {
    updateUser({ locationEnabled: false, lat: undefined, lng: undefined });
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout, updateUser,
      enableNotifications, disableNotifications,
      enableLocation, disableLocation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
