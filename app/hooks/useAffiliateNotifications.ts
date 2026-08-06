"use client";
// app/hooks/useAffiliateNotifications.ts

import { useEffect, useRef, useCallback } from "react";
import {
  bumpSectionNew,
  markNewStoreSignalSticky,
} from "../lib/affiliateNotifications";

type AffiliateRole = "seller" | "buyer";

type AffiliateEvent =
  | "affiliate_new_store"              // buyer: se sumó una tienda nueva al programa
  | "affiliate_application_received"   // seller: un comprador aplicó a una oferta
  | "affiliate_application_decided"    // buyer: el vendedor aceptó/rechazó su solicitud
  | "affiliate_new_sale"               // buyer: se registró una venta con comisión pendiente
  | "affiliate_payment_marked"         // buyer: el vendedor marcó un pago como hecho
  | "affiliate_payment_disputed";      // seller: el comprador dijo que no cobró

interface AffiliatePayload {
  message?: string;
  sellerId?: string;
  applicationId?: string;
  saleId?: string;
  [key: string]: unknown;
}

interface UseAffiliateNotificationsOptions {
  userId?: string;
  role?: AffiliateRole;
  /** Se llama después de procesar cualquier evento, para que el componente
   * vuelva a leer isSectionNew/hasUnseenNewStores y repinte el badge. */
  onBadgeShouldRefresh?: () => void;
  /** Opcional: mostrar el toast de SweetAlert2. Default: true. */
  showToast?: boolean;
}

export function useAffiliateNotifications({
  userId,
  role,
  onBadgeShouldRefresh,
  showToast = true,
}: UseAffiliateNotificationsOptions) {
  const socketRef = useRef<ReturnType<typeof import("socket.io-client")["io"]> | null>(null);

  const notify = useCallback(
    async (payload: AffiliatePayload, icon: "info" | "warning" | "success" = "info") => {
      onBadgeShouldRefresh?.();
      if (!showToast || !payload.message) return;
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({
        icon,
        title: payload.message,
        toast: true,
        position: "top-end",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
    [onBadgeShouldRefresh, showToast]
  );

  useEffect(() => {
    if (!userId) return;
    let cleanup: () => void;

    (async () => {
      const { io } = await import("socket.io-client");
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
        auth: { token: localStorage.getItem("marketplace_token") },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_user_room", userId);
      });

      // ── Eventos para COMPRADOR ────────────────────────────────────────
      if (role !== "seller") {
        socket.on("affiliate_new_store", (payload: AffiliatePayload) => {
          markNewStoreSignalSticky();
          notify({ ...payload, message: payload.message ?? "Se sumó una tienda nueva al programa de afiliados" });
        });

        socket.on("affiliate_application_decided", (payload: AffiliatePayload) => {
          bumpSectionNew("acceptedOffers");
          notify({ ...payload, message: payload.message ?? "Tu solicitud de afiliado fue respondida" }, "success");
        });

        socket.on("affiliate_new_sale", (payload: AffiliatePayload) => {
          bumpSectionNew("pendingSales");
          bumpSectionNew("urgentSales");
          notify({ ...payload, message: payload.message ?? "Tenés una nueva comisión pendiente de cobro" }, "success");
        });

        socket.on("affiliate_payment_marked", (payload: AffiliatePayload) => {
          bumpSectionNew("pendingSales");
          notify({ ...payload, message: payload.message ?? "Te marcaron un pago como realizado" }, "success");
        });
      }

      // ── Eventos para VENDEDOR ─────────────────────────────────────────
      if (role === "seller") {
        socket.on("affiliate_application_received", (payload: AffiliatePayload) => {
          notify({ ...payload, message: payload.message ?? "Un comprador aplicó a una de tus ofertas de afiliados" }, "warning");
        });

        socket.on("affiliate_payment_disputed", (payload: AffiliatePayload) => {
          notify({ ...payload, message: payload.message ?? "Un afiliado dijo que no recibió un pago" }, "warning");
        });
      }

      cleanup = () => {
        socket.disconnect();
        socketRef.current = null;
      };
    })();

    return () => { cleanup?.(); };
  }, [userId, role, notify]);

  return { socket: socketRef.current };
}
