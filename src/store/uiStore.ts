import { create } from "zustand";

interface UiStore {
  /** Feuille « Nouveau souvenir » (ouverte depuis le + central ou la home). */
  addMemoryOpen: boolean;
  openAddMemory: () => void;
  closeAddMemory: () => void;
  /** Petit toast global (succès, erreur, info). */
  toast: { id: number; text: string; tone: "ok" | "error" | "info" } | null;
  showToast: (text: string, tone?: "ok" | "error" | "info") => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  addMemoryOpen: false,
  openAddMemory: () => set({ addMemoryOpen: true }),
  closeAddMemory: () => set({ addMemoryOpen: false }),
  toast: null,
  showToast: (text, tone = "ok") => set({ toast: { id: Date.now(), text, tone } }),
  clearToast: () => set({ toast: null }),
}));
