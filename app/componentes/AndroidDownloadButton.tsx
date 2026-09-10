"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw } from "lucide-react";

type AppVersion = {
  version: string;
  versionCode: number;
  apkUrl: string;
  label?: string;
};

const FALLBACK_APK = "/downloads/Rosario-Market-2.0.apk";

function compareVersions(a: string, b: string) {
  const aa = a.split(".").map(n => Number(n) || 0);
  const bb = b.split(".").map(n => Number(n) || 0);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const diff = (aa[i] || 0) - (bb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function AndroidDownloadButton() {
  const [target, setTarget] = useState<Element | null>(null);
  const [latest, setLatest] = useState<AppVersion | null>(null);
  const [ua, setUa] = useState("");

  useEffect(() => {
    setUa(navigator.userAgent || "");
    setTarget(document.querySelector(".navbar-actions"));

    // El botón viejo instalaba la PWA. Ya no debe mostrarse: ahora la web
    // ofrece únicamente la APK y la APK ofrece únicamente actualizaciones.
    const hideLegacyInstall = () => {
      document
        .querySelectorAll<HTMLElement>('button[aria-label="Instalar Rosario Market"]')
        .forEach(el => { el.style.display = "none"; });
    };
    hideLegacyInstall();
    const observer = new MutationObserver(hideLegacyInstall);
    observer.observe(document.body, { childList: true, subtree: true });

    fetch("/app-version.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: AppVersion) => setLatest(data))
      .catch(() => setLatest({ version: "2.0.0", versionCode: 2, apkUrl: FALLBACK_APK }));

    return () => observer.disconnect();
  }, []);

  const nativeVersion = useMemo(() => {
    const match = ua.match(/RosarioMarketAndroid\/([0-9.]+)/i);
    return match?.[1] || null;
  }, [ua]);

  // Compatibilidad con una APK anterior que todavía no incluía nuestro marcador.
  const genericAndroidWebView = /;\s*wv\)/i.test(ua) || /\bwv\b/i.test(ua);
  const insideAndroidApp = !!nativeVersion || genericAndroidWebView;
  const hasUpdate = !!(insideAndroidApp && nativeVersion && latest && compareVersions(latest.version, nativeVersion) > 0);

  if (!target) return null;

  // Dentro de la APK no mostramos "Descargar". Sólo aparece "Actualizar"
  // cuando app-version.json anuncia una versión realmente superior.
  if (insideAndroidApp && !hasUpdate) return null;

  const href = latest?.apkUrl || FALLBACK_APK;
  const isUpdate = insideAndroidApp && hasUpdate;

  return createPortal(
    <a
      href={href}
      download={isUpdate ? undefined : "Rosario-Market-2.0.apk"}
      aria-label={isUpdate ? "Actualizar Rosario Market" : "Descargar app Rosario Market para Android"}
      title={isUpdate ? `Actualizar a Rosario Market ${latest?.version}` : "Descargar app"}
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
      {isUpdate ? <RefreshCw size={13} /> : <Download size={13} />}
      <span>{isUpdate ? "Actualizar" : "Descargar app"}</span>
    </a>,
    target
  );
}
