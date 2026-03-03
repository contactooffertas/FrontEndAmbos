'use client';

import { useEffect } from 'react';

interface PWAManifest {
  name?: string;
  short_name?: string;
  theme_color?: string;
  background_color?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
}

export default function PWAManifestUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Versión del manifest almacenada
    const STORAGE_KEY = 'pwa_manifest_version';
    const MANIFEST_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

    /**
     * Obtener manifest.json del servidor
     */
    const fetchManifest = async (): Promise<PWAManifest | null> => {
      try {
        const response = await fetch('/manifest.json', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });

        if (!response.ok) {
          console.warn('❌ No se pudo obtener manifest.json:', response.status);
          return null;
        }

        const manifest = (await response.json()) as PWAManifest;
        return manifest;
      } catch (error) {
        console.warn('⚠️ Error al obtener manifest:', error);
        return null;
      }
    };

    /**
     * Actualizar el meta tag del manifest
     */
    const updateManifestLink = (manifest: PWAManifest) => {
      const manifestLink = document.querySelector(
        'link[rel="manifest"]'
      ) as HTMLLinkElement | null;

      if (!manifestLink) {
        console.warn('⚠️ No se encontró link[rel="manifest"]');
        return;
      }

      // Agregar timestamp para forzar recarga del archivo
      const timestamp = new Date().getTime();
      manifestLink.href = `/manifest.json?v=${timestamp}`;

      console.log('✅ Manifest actualizado:', manifestLink.href);
    };

    /**
     * Actualizar meta tags de PWA
     */
    const updatePWAMetaTags = (manifest: PWAManifest) => {
      // Actualizar theme-color
      if (manifest.theme_color) {
        let themeColorMeta = document.querySelector(
          'meta[name="theme-color"]'
        ) as HTMLMetaElement | null;

        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.name = 'theme-color';
          document.head.appendChild(themeColorMeta);
        }

        if (themeColorMeta.content !== manifest.theme_color) {
          themeColorMeta.content = manifest.theme_color;
          console.log('🎨 Theme color actualizado:', manifest.theme_color);
        }
      }

      // Actualizar apple-mobile-web-app-title
      if (manifest.short_name) {
        let appleTitleMeta = document.querySelector(
          'meta[name="apple-mobile-web-app-title"]'
        ) as HTMLMetaElement | null;

        if (!appleTitleMeta) {
          appleTitleMeta = document.createElement('meta');
          appleTitleMeta.name = 'apple-mobile-web-app-title';
          document.head.appendChild(appleTitleMeta);
        }

        if (appleTitleMeta.content !== manifest.short_name) {
          appleTitleMeta.content = manifest.short_name;
          console.log('📱 App title actualizado:', manifest.short_name);
        }
      }

      // Actualizar apple-touch-icon
      if (manifest.icons && manifest.icons.length > 0) {
        let appleTouchIcon = document.querySelector(
          'link[rel="apple-touch-icon"]'
        ) as HTMLLinkElement | null;

        // Buscar el icono más grande o mascara
        const bestIcon = manifest.icons.find((i) => i.purpose?.includes('maskable')) ||
          manifest.icons.find((i) => i.sizes === '192x192') ||
          manifest.icons[0];

        if (!appleTouchIcon) {
          appleTouchIcon = document.createElement('link');
          appleTouchIcon.rel = 'apple-touch-icon';
          document.head.appendChild(appleTouchIcon);
        }

        if (appleTouchIcon.href !== bestIcon.src) {
          appleTouchIcon.href = bestIcon.src;
          console.log('🍎 Apple touch icon actualizado:', bestIcon.src);
        }
      }
    };

    /**
     * Notificar al Service Worker sobre cambios
     */
    const notifyServiceWorker = async (manifest: PWAManifest) => {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;

        if (registration.active) {
          registration.active.postMessage({
            type: 'MANIFEST_UPDATED',
            manifest: manifest,
          });

          console.log('💬 Service Worker notificado sobre actualización de manifest');
        }
      } catch (error) {
        console.warn('⚠️ Error al notificar SW:', error);
      }
    };

    /**
     * Verificar y actualizar manifest
     */
    const checkAndUpdateManifest = async () => {
      console.log('🔄 Verificando actualizaciones del manifest...');

      const newManifest = await fetchManifest();
      if (!newManifest) return;

      try {
        // Obtener manifest almacenado
        const storedManifestStr = localStorage.getItem(STORAGE_KEY);
        const storedManifest = storedManifestStr
          ? JSON.parse(storedManifestStr)
          : null;

        const newManifestStr = JSON.stringify(newManifest);
        const hasChanges = storedManifestStr !== newManifestStr;

        if (!storedManifest) {
          // Primera carga
          localStorage.setItem(STORAGE_KEY, newManifestStr);
          console.log('✅ Manifest almacenado por primera vez');
          return;
        }

        if (!hasChanges) {
          console.log('✅ Manifest sin cambios');
          return;
        }

        // Hay cambios
        console.log('🔄 Se detectaron cambios en el manifest');
        console.log('Antes:', storedManifest);
        console.log('Después:', newManifest);

        // Actualizar almacenamiento
        localStorage.setItem(STORAGE_KEY, newManifestStr);

        // Actualizar elementos del DOM
        updateManifestLink(newManifest);
        updatePWAMetaTags(newManifest);

        // Notificar al SW
        await notifyServiceWorker(newManifest);

        // Mostrar notificación opcional al usuario
        if ('serviceWorker' in navigator && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Offerton actualizado', {
              body: 'Se detectaron cambios en la aplicación',
              icon: newManifest.icons?.[0]?.src || '/assets/offerton.png',
            });
          }
        }
      } catch (error) {
        console.error('❌ Error al actualizar manifest:', error);
      }
    };

    /**
     * Al volver del background (tab inactivo)
     */
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      console.log('📍 Tab volvió a estar activo, verificando manifest...');
      checkAndUpdateManifest();
    };

    /**
     * Escuchar cambios de conexión
     */
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada, verificando manifest...');
      checkAndUpdateManifest();
    };

    // Ejecutar al montar
    checkAndUpdateManifest();

    // Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Ejecutar periódicamente (cada 24 horas)
    const manifestInterval = setInterval(checkAndUpdateManifest, MANIFEST_CHECK_INTERVAL);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      clearInterval(manifestInterval);
    };
  }, []);

  return null;
}
