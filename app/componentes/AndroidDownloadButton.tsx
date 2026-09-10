"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw } from "lucide-react";

type AppVersion = { version: string; versionCode: number; apkUrl: string; label?: string };
const FALLBACK_APK = "/downloads/Rosario-Market-2.0.apk";

function compareVersions(a: string, b: string) {
  const aa = a.split(".").map(n => Number(n) || 0);
  const bb = b.split(".").map(n => Number(n) || 0);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d) return d;
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
    fetch("/app-version.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setLatest)
      .catch(() => setLatest({ version: "2.0.0", versionCode: 2, apkUrl: FALLBACK_APK }));
  }, []);

  const nativeVersion = useMemo(() => ua.match(/RosarioMarketAndroid\/([0-9.]+)/i)?.[1] || null, [ua]);
  const insideAndroidApp = !!nativeVersion || /;\s*wv\)/i.test(ua) || /\bwv\b/i.test(ua);
  const hasUpdate = !!(nativeVersion && latest && compareVersions(latest.version, nativeVersion) > 0);

  if (!target || (insideAndroidApp && !hasUpdate)) return null;

  const isUpdate = insideAndroidApp && hasUpdate;
  const href = latest?.apkUrl || FALLBACK_APK;

  return createPortal(
    <a
      href={href}
      download={isUpdate ? undefined : "Rosario-Market-2.0.apk"}
      aria-label={isUpdate ? "Actualizar Rosario Market" : "Descargar Rosario Market para Android"}
      title={isUpdate ? `Actualizar a Rosario Market ${latest?.version}` : "Descargar Rosario Market"}
      style={{
        width: 38, height: 38, minWidth: 38, flex: "0 0 38px",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.28)",
        borderRadius: 10, color: "#f97316", textDecoration: "none", padding: 0,
        boxSizing: "border-box"
      }}
    >
      {isUpdate ? <RefreshCw size={18} /> : <Download size={18} />}
    </a>,
    target
  );
}
