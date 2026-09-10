"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";

const APK_URL = "/downloads/Rosario-Market-2.0.apk";

export default function AndroidDownloadButton() {
  const [target, setTarget] = useState<Element | null>(null);
  const [insideAndroidApp, setInsideAndroidApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // La APK 2.0 usa WebView. También dejamos preparado un marcador propio
    // para futuras versiones nativas.
    const isNative = /RosarioMarketAndroid/i.test(ua) || /;\s*wv\)/i.test(ua) || /\bwv\b/i.test(ua);
    setInsideAndroidApp(isNative);

    // Reemplaza la vieja acción de instalación PWA por la descarga directa APK.
    const oldInstallButton = document.querySelector<HTMLButtonElement>('button[aria-label="Instalar Rosario Market"]');
    if (oldInstallButton) oldInstallButton.style.display = "none";

    const actions = document.querySelector(".navbar-actions");
    setTarget(actions);

    return () => {
      if (oldInstallButton) oldInstallButton.style.display = "";
    };
  }, []);

  if (!target || insideAndroidApp) return null;

  return createPortal(
    <a
      href={APK_URL}
      download="Rosario-Market-2.0.apk"
      aria-label="Descargar app Rosario Market para Android"
      title="Descargar app"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(249,115,22,0.09)",
        border: "1px solid rgba(249,115,22,0.28)",
        borderRadius: 8,
        padding: "0.38rem 0.72rem",
        color: "#fdba74",
        fontSize: "0.78rem",
        fontWeight: 600,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      <Download size={13} />
      <span>Descargar app</span>
    </a>,
    target
  );
}
