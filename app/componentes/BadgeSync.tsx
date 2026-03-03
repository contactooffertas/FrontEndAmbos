// app/componentes/BadgeSync.tsx
// Sincroniza el badge del navbar con el icono PWA del escritorio

'use client';

import { useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useCart } from '../context/cartContext';

/**
 * Actualizar badge en el icono PWA
 * Soportado en: Chrome 81+, Edge, Samsung Internet, Opera
 */
async function updatePWABadge(count: number) {
  if (!('setAppBadge' in navigator)) {
    console.warn('Badge API no soportada en este navegador');
    return false;
  }

  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count);
      console.log(`✅ Badge PWA actualizado: ${count}`);
    } else {
      await (navigator as any).clearAppBadge();
      console.log('✅ Badge PWA limpiado');
    }
    return true;
  } catch (error) {
    console.warn('Error actualizando badge PWA:', error);
    return false;
  }
}

/**
 * Enviar badge al Service Worker para sincronizar en múltiples tabs
 */
async function notifyServiceWorkerBadge(count: number) {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'UPDATE_BADGE',
        count: count,
      });
    }
  } catch (error) {
    console.warn('Error notificando SW:', error);
  }
}

/**
 * Guardar badge en localStorage para persistencia entre tabs
 */
function saveBadgeToStorage(count: number) {
  try {
    localStorage.setItem('app_badge_count', String(count));
  } catch (error) {
    console.warn('Error guardando badge en storage:', error);
  }
}

/**
 * Obtener badge guardado en localStorage
 */
function getBadgeFromStorage(): number {
  try {
    const stored = localStorage.getItem('app_badge_count');
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Error leyendo badge de storage:', error);
    return 0;
  }
}

/**
 * Sincronizar badge entre tabs usando StorageEvent
 */
function listenToStorageChanges() {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'app_badge_count' && event.newValue) {
      const count = parseInt(event.newValue, 10);
      updatePWABadge(count);
      console.log(`🔄 Badge sincronizado desde otro tab: ${count}`);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

export default function BadgeSync() {
  const { user } = useAuth();
  const { cartCount } = useCart();

  useEffect(() => {
    if (!user) {
      // Si no hay usuario, limpiar badge
      updatePWABadge(0);
      saveBadgeToStorage(0);
      return;
    }

    // Calcular badge según rol del usuario
    let badgeCount = 0;

    if (user.role === 'seller') {
      // Para vendedores: órdenes pendientes (obtenidas del Navbar)
      // El Navbar actualiza esto via setPendingOrders
      badgeCount = (window as any).__PENDING_ORDERS || 0;
    } else {
      // Para compradores: órdenes en tránsito + cart
      // El Navbar actualiza esto via setShippedOrders
      badgeCount = (window as any).__SHIPPED_ORDERS || 0;
      if (badgeCount === 0 && cartCount > 0) {
        badgeCount = cartCount;
      }
    }

    // Actualizar badge en PWA
    updatePWABadge(badgeCount);

    // Guardar en storage para persistencia
    saveBadgeToStorage(badgeCount);

    // Notificar al Service Worker
    notifyServiceWorkerBadge(badgeCount);
  }, [user, cartCount]);

  // Escuchar cambios de otros tabs
  useEffect(() => {
    return listenToStorageChanges();
  }, []);

  return null; // Este componente no renderiza nada
}
