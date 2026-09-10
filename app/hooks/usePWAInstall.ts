"use client";
import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const busyRef = useRef(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    let installedThisSession = false;
    const sync = () => {
      setIsInstalled(installedThisSession || displayMode.matches || iosNavigator.standalone === true);
    };
    setIsIOSDevice(/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    sync();
    setIsReady(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };
    const onInstalled = () => {
      installedThisSession = true;
      promptRef.current = null;
      setIsInstallable(false);
      sync();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener("change", sync);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener("change", sync);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const event = promptRef.current;
    if (!event || busyRef.current) return false;
    busyRef.current = true;
    // Each browser event may be used only once, including after dismissal.
    promptRef.current = null;
    setIsInstallable(false);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      return outcome === "accepted";
    } finally {
      busyRef.current = false;
    }
  };
  return { isInstallable, isInstalled, isReady, install, isIOSDevice };
}
