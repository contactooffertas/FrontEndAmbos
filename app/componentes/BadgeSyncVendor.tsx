'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/authContext';

/**
 * Actualizar badge en el icono PWA del celular/escritorio
 * Soportado en: Chrome 81+, Edge, Samsung Internet
 */
async function setAppBadge(count: number) {
  if (!('setAppBadge' in navigator)) {
    console.warn('⚠️ Badge API no soportada');
    return false;
  }

  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count);
      console.log(`✅ Badge actualizado en icono PWA: ${count}`);
      return true;
    } else {
      await (navigator as any).clearAppBadge();
      console.log('✅ Badge limpiado en icono PWA');
      return true;
    }
  } catch (error) {
    console.error('❌ Error actualizando badge:', error);
    return false;
  }
}

/**
 * Guardar badge en sessionStorage para la sesión actual
 */
function saveBadgeSession(count: number) {
  try {
    sessionStorage.setItem('current_badge_count', String(count));
    console.log(`💾 Badge guardado en sesión: ${count}`);
  } catch (error) {
    console.warn('Error guardando en sessionStorage:', error);
  }
}

/**
 * Notificar al Service Worker sobre cambio de badge
 */
async function notifyServiceWorkerBadge(count: number) {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'UPDATE_BADGE_COUNT',
        badgeCount: count,
        timestamp: Date.now(),
      });
      console.log(`📢 Service Worker notificado: badge ${count}`);
    }
  } catch (error) {
    console.warn('Error notificando SW:', error);
  }
}

export default function BadgeSyncVendor() {
  const { user } = useAuth();
  const previousBadgeRef = useRef<number>(-1);
  const badgeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Obtener contador actual de órdenes pendientes
   * Busca el valor que el Navbar actualiza
   */
  const getCurrentBadgeCount = (): number => {
    // Opción 1: Buscar en variable global que el Navbar establece
    const pendingFromWindow = (window as any).__PENDING_ORDERS;
    if (pendingFromWindow !== undefined) {
      return pendingFromWindow;
    }

    // Opción 2: Buscar en sessionStorage
    const storedBadge = sessionStorage.getItem('current_badge_count');
    if (storedBadge) {
      return parseInt(storedBadge, 10);
    }

    return 0;
  };

  /**
   * Sincronizar badge cuando cambia
   */
  const syncBadgeToApp = async (count: number) => {
    // Evitar actualizaciones innecesarias
    if (count === previousBadgeRef.current) {
      return;
    }

    console.log(`🔄 Sincronizando badge: ${previousBadgeRef.current} → ${count}`);

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
   * Monitorear cambios de badge desde el Navbar
   */
  useEffect(() => {
    if (!user) {
      setAppBadge(0);
      previousBadgeRef.current = -1;
      return;
    }

    // Para vendedores, escuchar eventos del Navbar
    if (user.role === 'seller') {
      console.log('👁️ Monitoreando órdenes pendientes para vendedor...');

      // Listener para evento custom del Navbar
      const handleBadgeUpdated = () => {
        const currentBadge = getCurrentBadgeCount();
        syncBadgeToApp(currentBadge);
      };

      // Escuchar evento del Navbar
      window.addEventListener('badge_updated', handleBadgeUpdated);

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
        window.removeEventListener('badge_updated', handleBadgeUpdated);
        if (badgeCheckIntervalRef.current) {
          clearInterval(badgeCheckIntervalRef.current);
        }
      };
    } else {
      // Para compradores
      setAppBadge(0);
    }
  }, [user]);

  // Escuchar cambios en la ventana/tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.role === 'seller') {
        // Tab vuelve a estar activa, verificar badge
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
