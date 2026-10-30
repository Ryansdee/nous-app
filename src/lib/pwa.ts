"use client";
// État PWA partagé : invite d'installation (Android/Chrome), mise à jour
// du service worker disponible, statut réseau.

import { create } from "zustand";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface PwaStore {
  installEvent: BeforeInstallPromptEvent | null;
  waitingWorker: ServiceWorker | null;
  online: boolean;
  setInstallEvent: (e: BeforeInstallPromptEvent | null) => void;
  setWaiting: (w: ServiceWorker | null) => void;
  setOnline: (o: boolean) => void;
}

export const usePwaStore = create<PwaStore>((set) => ({
  installEvent: null,
  waitingWorker: null,
  online: true,
  setInstallEvent: (installEvent) => set({ installEvent }),
  setWaiting: (waitingWorker) => set({ waitingWorker }),
  setOnline: (online) => set({ online }),
}));

/** Applique la mise à jour en attente puis recharge l'app. */
export function applyUpdate() {
  const w = usePwaStore.getState().waitingWorker;
  if (w) w.postMessage({ type: "SKIP_WAITING" });
  else window.location.reload();
}

/** Lance l'invite d'installation native si dispo. Renvoie false sinon. */
export async function promptInstall(): Promise<boolean> {
  const e = usePwaStore.getState().installEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  usePwaStore.getState().setInstallEvent(null);
  return outcome === "accepted";
}

/** Vide les caches du service worker et recharge (dépannage). */
export async function hardRefresh() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs ?? []).map((r) => r.update()));
  } catch {
    /* noop */
  }
  window.location.reload();
}

export type { BeforeInstallPromptEvent };
