"use client";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Detecta iOS
function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Detecta si ya corre como PWA standalone
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable,  setIsInstallable]  = useState(false);
  const [isInstalled,    setIsInstalled]    = useState(false);
  const [isIOSDevice,    setIsIOSDevice]    = useState(false);

  useEffect(() => {
    // Ya instalada como PWA
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // iOS — no tiene beforeinstallprompt, mostrar instrucciones manuales
    if (isIOS()) {
      setIsIOSDevice(true);
      setIsInstallable(true); // mostramos el botón igual para dar instrucciones
      return;
    }

    // Android / Chrome / Edge — flujo normal
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async (): Promise<boolean> => {
    // iOS — no podemos instalar programáticamente, el botón muestra instrucciones
    if (isIOSDevice) return false;

    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
    return outcome === "accepted";
  };

  return { isInstallable, isInstalled, install, isIOSDevice };
}
