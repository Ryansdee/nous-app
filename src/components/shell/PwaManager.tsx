"use client";
// Enregistre le service worker, détecte les mises à jour et le mode
// hors ligne, capte l'invite d'installation. Affiche les bannières
// correspondantes + le toast global.

import { useEffect } from "react";
import { usePwaStore, applyUpdate, type BeforeInstallPromptEvent } from "@/lib/pwa";
import { useUiStore } from "@/store/uiStore";

export default function PwaManager() {
  const waiting = usePwaStore((s) => s.waitingWorker);
  const online = usePwaStore((s) => s.online);
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  // Service worker (production uniquement : en dev il cacherait le HMR)
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let reloading = false;
    // Première installation : clients.claim() déclenche aussi controllerchange,
    // il ne faut recharger que lors d'une vraie mise à jour.
    const hadController = !!navigator.serviceWorker.controller;
    const onController = () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        const track = (w: ServiceWorker | null) => {
          if (!w) return;
          w.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) {
              usePwaStore.getState().setWaiting(w);
            }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) usePwaStore.getState().setWaiting(reg.waiting);
        track(reg.installing);
        reg.addEventListener("updatefound", () => track(reg.installing));

        // Vérifie les mises à jour au retour dans l'app
        const onVisible = () => document.visibilityState === "visible" && reg.update().catch(() => {});
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch((e) => console.warn("SW:", e));

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onController);
  }, []);

  // Installation (Chrome / Android / Edge)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      usePwaStore.getState().setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => usePwaStore.getState().setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Réseau
  useEffect(() => {
    const set = () => usePwaStore.getState().setOnline(navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);

  // Toast : disparaît tout seul
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 2600);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  return (
    <>
      {/* Pastille hors ligne */}
      {!online && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "calc(var(--safe-top) + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1200,
            background: "rgba(44,44,46,0.95)",
            color: "#FFD60A",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            animation: "pop-in .25s ease both",
            pointerEvents: "none",
          }}
        >
          Hors ligne · les changements seront synchronisés
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          onClick={clearToast}
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: "calc(var(--tabbar-space) + 12px)",
            maxWidth: 420,
            margin: "0 auto",
            zIndex: 1200,
            background: toast.tone === "error" ? "#3A1D1D" : "rgba(44,44,46,0.97)",
            color: toast.tone === "error" ? "#FF8A80" : "#FFF",
            fontSize: 15,
            fontWeight: 500,
            padding: "13px 16px",
            borderRadius: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "pop-in .25s cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          <span aria-hidden="true">{toast.tone === "error" ? "⚠️" : toast.tone === "info" ? "ℹ️" : "✓"}</span>
          {toast.text}
        </div>
      )}

      {/* Mise à jour dispo */}
      {waiting && !toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: "calc(var(--tabbar-space) + 12px)",
            maxWidth: 420,
            margin: "0 auto",
            zIndex: 1150,
            background: "rgba(44,44,46,0.97)",
            borderRadius: 14,
            padding: "10px 10px 10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            animation: "pop-in .25s ease both",
          }}
        >
          <p style={{ flex: 1, fontSize: 15, color: "#FFF" }}>Nouvelle version disponible</p>
          <button
            type="button"
            onClick={applyUpdate}
            className="tap"
            style={{ minHeight: 40, padding: "0 16px", borderRadius: 10, border: "none", background: "#0A84FF", color: "#FFF", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Mettre à jour
          </button>
        </div>
      )}
    </>
  );
}
