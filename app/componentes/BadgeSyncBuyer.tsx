'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/authContext';

/**
 * Actualizar badge en el icono PWA del celular/escritorio
 * Para compradores: muestra órdenes en tránsito
 */
async function setAppBadge(count: number) {
  if (!('setAppBadge' in navigator)) {
    console.warn('⚠️ Badge API no soportada');
    return false;
  }

  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count);
      console.log(`✅ Badge comprador actualizado en PWA: ${count}`);
      return true;
    } else {
      await (navigator as any).clearAppBadge();
      console.log('✅ Badge comprador limpiado');
      return true;
    }
  } catch (error) {
    console.error('❌ Error actualizando badge:', error);
    return false;
  }
}

/**
 * Guardar badge en sessionStorage
 */
function saveBadgeSession(count: number) {
  try {
    sessionStorage.setItem('buyer_badge_count', String(count));
    console.log(`💾 Badge comprador guardado: ${count}`);
  } catch (error) {
    console.warn('Error guardando badge:', error);
  }
}

/**
 * Notificar al Service Worker
 */
async function notifyServiceWorkerBadge(count: number) {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'UPDATE_BUYER_BADGE',
        badgeCount: count,
        timestamp: Date.now(),
      });
      console.log(`📢 SW notificado - Badge comprador: ${count}`);
    }
  } catch (error) {
    console.warn('Error notificando SW:', error);
  }
}

export default function BadgeSyncBuyer() {
  const { user } = useAuth();
  const previousBadgeRef = useRef<number>(-1);
  const badgeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Obtener contador actual de órdenes en tránsito
   */
  const getCurrentBadgeCount = (): number => {
    // Opción 1: Variable global del Navbar
    const shippedFromWindow = (window as any).__SHIPPED_ORDERS;
    if (shippedFromWindow !== undefined && shippedFromWindow > 0) {
      return shippedFromWindow;
    }

    // Opción 2: sessionStorage
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
    // Evitar actualizaciones innecesarias
    if (count === previousBadgeRef.current) {
      return;
    }

    console.log(`🔄 Sincronizando badge comprador: ${previousBadgeRef.current} → ${count}`);

    // Actualizar badge en el icono PWA
    await setAppBadge(count);

    // Guardar en sesión
    saveBadgeSession(count);

    // Notificar al Service Worker
    await notifyServiceWorkerBadge(count);

    // Actualizar referencia
    previousBadgeRef.current = count;
  };

  /**
   * Monitorear cambios para COMPRADORES
   */
  useEffect(() => {
    if (!user) {
      setAppBadge(0);
      previousBadgeRef.current = -1;
      return;
    }

    // Solo para compradores (NO vendedores)
    if (user.role === 'user' || user.role !== 'seller') {
      console.log('👁️ Monitoreando órdenes en tránsito para comprador...');

      // Listener para evento del Navbar
      const handleBadgeUpdated = () => {
        const currentBadge = getCurrentBadgeCount();
        syncBadgeToApp(currentBadge);
      };

      // Escuchar evento
      window.addEventListener('shipped_orders_updated', handleBadgeUpdated);

      // También verificar periódicamente (cada 5 segundos)
      badgeCheckIntervalRef.current = setInterval(() => {
        const currentBadge = getCurrentBadgeCount();
        if (currentBadge !== previousBadgeRef.current) {
          syncBadgeToApp(currentBadge);
        }
      }, 5000);

      // Verificar inmediatamente al montar
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
      // No es comprador
      setAppBadge(0);
    }
  }, [user]);

  // Escuchar cambios en la ventana/tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (user?.role === 'user' || user?.role !== 'seller')) {
        const currentBadge = getCurrentBadgeCount();
        syncBadgeToApp(currentBadge);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return null;
}
