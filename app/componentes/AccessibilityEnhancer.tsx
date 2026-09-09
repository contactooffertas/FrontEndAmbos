"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AccessibilityEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    const enhance = () => {
      document.querySelectorAll<HTMLElement>(".category-card").forEach((el) => {
        if (el.tagName === "BUTTON" || el.tagName === "A") return;
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-pressed", el.classList.contains("active") ? "true" : "false");

        if (el.dataset.a11yEnhanced === "true") return;
        el.dataset.a11yEnhanced = "true";
        el.addEventListener("keydown", (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            el.click();
          }
        });
      });

      document.querySelectorAll<HTMLImageElement>("img:not([alt])").forEach((img) => {
        img.alt = "";
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
