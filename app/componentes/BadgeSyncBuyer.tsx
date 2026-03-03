'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Componente interno que sí usa useAuth
 * Se renderiza solo en cliente
 */
function BadgeSyncBuyerContent() {
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
        console.log(`✅ Badge comprador actualizado: ${count}`);
      } else {
        await (navigator as any).clearAppBadge();
        console.log('✅ Badge comprador limpiado');
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
      sessionStorage.setItem('buyer_badge_count', String(count));
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
          type: 'UPDATE_BUYER_BADGE',
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

    const shippedFromWindow = (window as any).__SHIPPED_ORDERS;
    if (shippedFromWindow !== undefined && shippedFromWindow > 0) {
      return shippedFromWindow;
    }

    const storedBadge = sessionStorage.getItem('buyer_badge_count');
    if (storedBadge) {
      const count = parseInt(storedBadge, 10);
      if (count > 0) return count;
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

    console.log(`🔄 Sincronizando badge comprador: ${previousBadgeRef.current} → ${count}`);

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

    if (user.role !== 'seller') {
      console.log('👁️ Monitoreando órdenes en tránsito (comprador)...');

      const handleBadgeUpdated = () => {
        const currentBadge = getCurrentBadgeCount();
        syncBadgeToApp(currentBadge);
      };

      window.addEventListener('shipped_orders_updated', handleBadgeUpdated);

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
        window.removeEventListener('shipped_orders_updated', handleBadgeUpdated);
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
      if (!document.hidden && user?.role !== 'seller') {
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
export default function BadgeSyncBuyer() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // No renderizar nada hasta que esté en cliente
  if (!isMounted) {
    return null;
  }

  return <BadgeSyncBuyerContent />;
}
