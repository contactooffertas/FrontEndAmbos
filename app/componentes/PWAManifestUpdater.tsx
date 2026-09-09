'use client';

import { useEffect, useState } from 'react';

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

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready';

export default function PWAManifestUpdater() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const STORAGE_KEY = 'pwa_manifest_version';
    const MANIFEST_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshing = false;

    const hideStatusLater = (ms = 2400) => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setUpdateStatus('idle'), ms);
    };

    const fetchManifest = async (): Promise<PWAManifest | null> => {
      try {
        const response = await fetch('/manifest.json', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (!response.ok) return null;
        return (await response.json()) as PWAManifest;
      } catch {
        return null;
      }
    };

    const updateManifestLink = () => {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (manifestLink) manifestLink.href = `/manifest.json?v=${Date.now()}`;
    };

    const updatePWAMetaTags = (manifest: PWAManifest) => {
      if (manifest.theme_color) {
        let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'theme-color';
          document.head.appendChild(meta);
        }
        meta.content = manifest.theme_color;
      }

      if (manifest.short_name) {
        let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'apple-mobile-web-app-title';
          document.head.appendChild(meta);
        }
        meta.content = manifest.short_name;
      }

      if (manifest.icons?.length) {
        let icon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
        if (!icon) {
          icon = document.createElement('link');
          icon.rel = 'apple-touch-icon';
          document.head.appendChild(icon);
        }
        const bestIcon =
          manifest.icons.find((i) => i.purpose?.includes('maskable')) ||
          manifest.icons.find((i) => i.sizes === '192x192') ||
          manifest.icons[0];
        icon.href = bestIcon.src;
      }
    };

    const checkAndUpdateManifest = async () => {
      const newManifest = await fetchManifest();
      if (!newManifest) return;

      const newManifestStr = JSON.stringify(newManifest);
      const storedManifestStr = localStorage.getItem(STORAGE_KEY);

      if (!storedManifestStr) {
        localStorage.setItem(STORAGE_KEY, newManifestStr);
        return;
      }

      if (storedManifestStr === newManifestStr) return;

      localStorage.setItem(STORAGE_KEY, newManifestStr);
      updateManifestLink();
      updatePWAMetaTags(newManifest);
    };

    const watchInstallingWorker = (worker: ServiceWorker) => {
      setUpdateStatus('downloading');

      worker.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return;

        // Si ya había un controller, no es la primera instalación: es una actualización.
        if (navigator.serviceWorker.controller) {
          setUpdateStatus('ready');
          hideStatusLater(3200);
        } else {
          setUpdateStatus('idle');
        }
      });
    };

    const setupServiceWorkerUpdates = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        setUpdateStatus('checking');
        const registration = await navigator.serviceWorker.ready;

        registration.addEventListener('updatefound', () => {
          if (registration.installing) watchInstallingWorker(registration.installing);
        });

        // Fuerza una comprobación real del sw.js sin esperar al ciclo del navegador.
        await registration.update().catch(() => undefined);

        if (registration.installing) {
          watchInstallingWorker(registration.installing);
        } else {
          setUpdateStatus('idle');
        }

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          setUpdateStatus('ready');
          hideStatusLater(2200);
        });
      } catch {
        setUpdateStatus('idle');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      checkAndUpdateManifest();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => registration.update()).catch(() => undefined);
      }
    };

    const handleOnline = () => {
      checkAndUpdateManifest();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => registration.update()).catch(() => undefined);
      }
    };

    checkAndUpdateManifest();
    setupServiceWorkerUpdates();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    const manifestInterval = setInterval(checkAndUpdateManifest, MANIFEST_CHECK_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      clearInterval(manifestInterval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (updateStatus === 'idle' || updateStatus === 'checking') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(18px, env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        zIndex: 100000,
        width: 'min(92vw, 360px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 14,
        background: 'rgba(17, 24, 39, 0.96)',
        border: '1px solid rgba(249, 115, 22, 0.35)',
        boxShadow: '0 10px 35px rgba(0,0,0,0.28)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 650,
        backdropFilter: 'blur(10px)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 9,
          flex: '0 0 auto',
          borderRadius: '50%',
          background: updateStatus === 'ready' ? '#22c55e' : '#f97316',
          boxShadow: `0 0 0 4px ${updateStatus === 'ready' ? 'rgba(34,197,94,.13)' : 'rgba(249,115,22,.13)'}`,
        }}
      />
      <span>{updateStatus === 'ready' ? 'Actualización lista' : 'Descargando actualización…'}</span>
    </div>
  );
}
