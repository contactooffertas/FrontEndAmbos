'use client';

import { useEffect, useRef, useState, Suspense } from 'react';

// Importar dinámicamente el hook para evitar ejecución en servidor
import dynamic from 'next/dynamic';
/**
 * Componente interno que sí usa useAuth
 * Envuelto en dynamic para evitar ejecución en servidor
 */
function BadgeSyncVendorContent() {
  const { useAuth } = require('../context/authContext');
  const { user } = useAuth();
  const previousBadgeRef = useRef<number>(-1);
  const badgeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Actualizar badge en el icono PWA
   */
  const setAppBadge = async (count: number) => {
    if (typeof window === 'undefined') return false;
    if (!('setAppBadge' in navigator)) return false;

    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
        console.log(`✅ Badge vendedor actualizado: ${count}`);
      } else {
        await (navigator as any).clearAppBadge();
        console.log('✅ Badge vendedor limpiado');
      }
      return true;
    } catch (error) {
      console.error('Error actualizando badge:', error);
      return false;
    }
  };

  /**
   * Guardar badge en sessionStorage
   */
  const saveBadgeSession = (count: number) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('current_badge_count', String(count));
    } catch (e) {}
  };

  /**
   * Notificar al Service Worker
   */
  const notifyServiceWorkerBadge = async (count: number) => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'UPDATE_BADGE_COUNT',
          badgeCount: count,
          timestamp: Date.now(),
        });
      }
    } catch (e) {}
  };

  /**
   * Obtener contador actual
   */
  const getCurrentBadgeCount = (): number => {
    if (typeof window === 'undefined') return 0;

    const pendingFromWindow = (window as any).__PENDING_ORDERS;
    if (pendingFromWindow !== undefined) {
      return pendingFromWindow;
    }

    const storedBadge = sessionStorage.getItem('current_badge_count');
    if (storedBadge) {
      return parseInt(storedBadge, 10);
    }

    return 0;
  };

  /**
   * Sincronizar badge
   */
  const syncBadgeToApp = async (count: number) => {
    if (count === previousBadgeRef.current) {
      return;
    }

    console.log(`🔄 Sincronizando badge vendedor: ${previousBadgeRef.current} → ${count}`);

    await setAppBadge(count);
    saveBadgeSession(count);
    await notifyServiceWorkerBadge(count);

    previousBadgeRef.current = count;
  };

  // Monitorear cambios
  useEffect(() => {
    if (!user) {
      setAppBadge(0);
      previousBadgeRef.current = -1;
      return;
    }

    if (user.role === 'seller') {
      console.log('👁️ Monitoreando órdenes pendientes (vendedor)...');

      const handleBadgeUpdated = () => {
        const currentBadge = getCurrentBadgeCount();
        syncBadgeToApp(currentBadge);
      };

      window.addEventListener('badge_updated', handleBadgeUpdated);

      badgeCheckIntervalRef.current = setInterval(() => {
        const currentBadge = getCurrentBadgeCount();
        if (currentBadge !== previousBadgeRef.current) {
          syncBadgeToApp(currentBadge);
        }
      }, 5000);

      const initialBadge = getCurrentBadgeCount();
      if (initialBadge > 0) {
        syncBadgeToApp(initialBadge);
      }

      return () => {
        window.removeEventListener('badge_updated', handleBadgeUpdated);
        if (badgeCheckIntervalRef.current) {
          clearInterval(badgeCheckIntervalRef.current);
        }
      };
    } else {
      setAppBadge(0);
    }
  }, [user]);

  // Escuchar cambios de ventana
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.role === 'seller') {
        const currentBadge = getCurrentBadgeCount();
        syncBadgeToApp(currentBadge);
      }
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user]);

  return null;
}

/**
 * Componente principal - renderiza dinámicamente
 * Esto evita que useAuth se ejecute en el servidor
 */
export default function BadgeSyncVendor() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // No renderizar nada hasta que esté en cliente
  if (!isMounted) {
    return null;
  }

  return <BadgeSyncVendorContent />;
}
