"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/authContext";

const API = "https://new-backend-lovat.vercel.app/api";

/**
 * Mantiene la identidad comercial de la sesión alineada con el negocio real.
 *
 * Un usuario puede registrarse como comprador y crear su negocio después.
 * El navbar históricamente decide su menú usando user.role, que puede quedar
 * persistido como "user" en localStorage aunque el negocio ya exista.
 *
 * Esta sincronización es deliberadamente frontend-only: no cambia permisos ni
 * escribe el rol en el backend. Solo completa la sesión local cuando el backend
 * confirma que el usuario autenticado es dueño de un negocio.
 */
export default function SellerSessionSync() {
  const { user, updateUser } = useAuth();
  const pathname = usePathname();
  const lastCheckedKey = useRef<string>("");

  useEffect(() => {
    if (!user || user.role === "admin") return;

    const token = localStorage.getItem("marketplace_token");
    if (!token) return;

    // Volvemos a comprobar al navegar. Es importante para el caso:
    // comprador -> /negocio -> crea negocio -> navega a otra sección.
    const key = `${user.id}:${pathname}`;
    if (lastCheckedKey.current === key) return;
    lastCheckedKey.current = key;

    let cancelled = false;

    fetch(`${API}/business/my-business`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((business) => {
        if (cancelled || !business?._id) return;

        // Si la sesión ya está completa no escribimos de nuevo.
        if (user.role === "seller" && user.businessId === business._id) return;

        updateUser({
          role: "seller",
          businessId: business._id,
        });
      })
      .catch(() => {
        // La comprobación no debe bloquear ni romper la navegación.
      });

    return () => {
      cancelled = true;
    };
  }, [user, pathname, updateUser]);

  return null;
}
