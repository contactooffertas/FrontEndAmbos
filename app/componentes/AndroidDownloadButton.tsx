"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw } from "lucide-react";
import { useTracking } from "../context/TrackingContext";

type AppVersion = { version: string; versionCode: number; apkUrl: string; label?: string };
const FALLBACK_APK = "/downloads/Rosario-Market-3.5.apk";

function compareVersions(a: string, b: string) {
  const aa = a.split(".").map(n => Number(n) || 0);
  const bb = b.split(".").map(n => Number(n) || 0);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function removeLegacyInstallButtons() {
  const selectors = [
    ".btn-pwa-install",
    "[data-pwa-install]",
    "[data-install-pwa]",
    "[aria-label*='instalar' i]",
    "[title*='instalar' i]",
  ];
  document.querySelectorAll(selectors.join(",")).forEach((el) => {
    if ((el as HTMLElement).id !== "rosario-market-apk-action") el.remove();
  });

  const official = document.getElementById("rosario-market-apk-action");
  document.querySelectorAll("#rosario-market-apk-action").forEach((el, i) => {
    if (i > 0 && el !== official) el.remove();
  });
}

export default function AndroidDownloadButton() {
  const { track } = useTracking();
  const [target, setTarget] = useState<Element | null>(null);
  const [latest, setLatest] = useState<AppVersion | null>(null);
  const [ua, setUa] = useState("");

  useEffect(() => {
    setUa(navigator.userAgent || "");
    const actions = document.querySelector(".navbar-actions");
    setTarget(actions);

    removeLegacyInstallButtons();
    const observer = new MutationObserver(removeLegacyInstallButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    fetch("/app-version.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setLatest)
      .catch(() => setLatest({ version: "3.5.0", versionCode: 35, apkUrl: FALLBACK_APK }));

    return () => observer.disconnect();
  }, []);

  const nativeVersion = useMemo(
    () => ua.match(/RosarioMarketAndroid\/([0-9.]+)/i)?.[1] || null,
    [ua]
  );
  const insideAndroidApp = !!nativeVersion || /;\s*wv\)/i.test(ua) || /\bwv\b/i.test(ua);
  const hasUpdate = !!(nativeVersion && latest && compareVersions(latest.version, nativeVersion) > 0);

  if (!target || (insideAndroidApp && !hasUpdate)) return null;

  const isUpdate = insideAndroidApp && hasUpdate;
  const href = latest?.apkUrl || FALLBACK_APK;

  return createPortal(
    <a
      id="rosario-market-apk-action"
      href={href}
      download={isUpdate ? undefined : "Rosario-Market-3.5.apk"}
      aria-label={isUpdate ? "Actualizar Rosario Market" : "Descargar Rosario Market para Android"}
      title={isUpdate ? `Actualizar a Rosario Market ${latest?.version}` : "Descargar Rosario Market"}
      onClick={() => track(isUpdate ? "apk_update" : "apk_download", { version: latest?.version || "3.5.0", source: "navbar" })}
      style={{ order:9999,width:38,height:38,minWidth:38,flex:"0 0 38px",display:"inline-flex",alignItems:"center",justifyContent:"center",background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.28)",borderRadius:10,color:"#f97316",textDecoration:"none",padding:0,boxSizing:"border-box" }}
    >
      {isUpdate ? <RefreshCw size={18} /> : <Download size={18} />}
    </a>,
    target
  );
}
