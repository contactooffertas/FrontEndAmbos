// app/hooks/useReportNotifications.ts
// Conecta al socket y escucha eventos de reportes.
// Usalo en el layout o en el componente raíz del admin.

"use client";

import { useEffect, useRef, useCallback } from "react";

type ReportEvent =
  | "new_report"          // admin: nuevo reporte recibido
  | "report_updated"      // admin: reporte resuelto/eliminado (actualizar badge)
  | "report_deleted"      // admin: reporte eliminado
  | "report_received"     // vendedor: su producto/negocio fue reportado
  | "report_resolved"     // vendedor: el reporte fue resuelto
  | "report_action_taken";// denunciante: se tomó acción sobre su reporte

interface ReportPayload {
  reportId?:   string;
  targetName?: string;
  action?:     string;
  message?:    string;
  adminNote?:  string;
  newStatus?:  string;
  autoBlocked?: boolean;
  keywordCount?: number;
  createdAt?:  string;
  report?:     Record<string, unknown>;
}

interface UseReportNotificationsOptions {
  /** ID del usuario conectado */
  userId?: string;
  /** Rol del usuario */
  role?: string;
  /** Callback para mostrar la notificación */
  onNotification?: (event: ReportEvent, payload: ReportPayload) => void;
  /** Callback exclusivo para admin: nuevo reporte (para actualizar badge) */
  onNewReport?: (payload: ReportPayload) => void;
  /** Callback exclusivo para admin: reporte actualizado/eliminado */
  onReportUpdated?: (payload: ReportPayload) => void;
}

export function useReportNotifications({
  userId,
  role,
  onNotification,
  onNewReport,
  onReportUpdated,
}: UseReportNotificationsOptions) {
  const socketRef = useRef<ReturnType<typeof import("socket.io-client")["io"]> | null>(null);

  const notify = useCallback(
    async (event: ReportEvent, payload: ReportPayload) => {
      onNotification?.(event, payload);

      if (!payload.message) return;

      // Notificación visual con SweetAlert2
      const Swal = (await import("sweetalert2")).default;

      const iconMap: Record<string, "info" | "warning" | "success" | "error"> = {
        new_report:         "warning",
        report_updated:     "info",
        report_deleted:     "info",
        report_received:    "warning",
        report_resolved:    "success",
        report_action_taken:"success",
      };

      Swal.fire({
        icon:             iconMap[event] ?? "info",
        title:            payload.message,
        text:             payload.adminNote || undefined,
        toast:            true,
        position:         "top-end",
        timer:            5000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
    [onNotification]
  );

  useEffect(() => {
    if (!userId) return;

    // Importación dinámica para evitar SSR
    let cleanup: () => void;

    (async () => {
      const { io } = await import("socket.io-client");

      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
        auth: { token: localStorage.getItem("marketplace_token") },
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        // Unirse a sala personal
        socket.emit("join_user_room", userId);
        // Si es admin, unirse a sala de admins
        if (role === "admin") {
          socket.emit("join_admin_room");
        }
      });

      // ── Eventos para ADMIN ─────────────────────────────────────────────
      socket.on("new_report", (payload: ReportPayload) => {
        onNewReport?.(payload);
        notify("new_report", {
          ...payload,
          message: payload.message ?? "Nuevo reporte recibido",
        });
      });

      socket.on("report_updated", (payload: ReportPayload) => {
        onReportUpdated?.(payload);
      });

      socket.on("report_deleted", (payload: ReportPayload) => {
        onReportUpdated?.(payload);
      });

      // ── Eventos para VENDEDOR ──────────────────────────────────────────
      socket.on("report_received", (payload: ReportPayload) => {
        notify("report_received", {
          ...payload,
          message: payload.message ?? "Tu contenido recibió un reporte",
        });
      });

      socket.on("report_resolved", (payload: ReportPayload) => {
        notify("report_resolved", {
          ...payload,
          message: payload.message ?? "Un reporte sobre tu contenido fue resuelto",
        });
      });

      // ── Evento para el DENUNCIANTE ─────────────────────────────────────
      socket.on("report_action_taken", (payload: ReportPayload) => {
        notify("report_action_taken", {
          ...payload,
          message: payload.message ?? "Tu reporte fue procesado. Gracias.",
        });
      });

      cleanup = () => {
        socket.disconnect();
        socketRef.current = null;
      };
    })();

    return () => { cleanup?.(); };
  }, [userId, role]);

  return { socket: socketRef.current };
}