"use client";
// Données partagées en temps réel entre tous les écrans :
// - souvenirs (likes / commentaires de l'autre visibles instantanément)
// - activité reçue (badge de la tab bar)
// Les abonnements Firestore sont ouverts une seule fois, dans la coquille.

import { create } from "zustand";
import { useEffect } from "react";
import { getMemories, getUser, subscribeMemories, type Memory } from "@/lib/firestore";
import { subscribeActivity, type Activity } from "@/lib/social";
import { useAuthStore } from "./authStore";

interface DataStore {
  memories: Memory[];
  memoriesLoaded: boolean;
  activity: Activity[];
  activityLoaded: boolean;
  partnerBirthday: Date | null;
  partnerLoaded: boolean;
  setMemories: (m: Memory[]) => void;
  /** Mise à jour optimiste d'un souvenir (like, enregistrement…) */
  patchMemory: (id: string, patch: Partial<Memory>) => void;
  setActivity: (a: Activity[]) => void;
  loadPartner: (partnerId: string) => Promise<void>;
  reset: () => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  memories: [],
  memoriesLoaded: false,
  activity: [],
  activityLoaded: false,
  partnerBirthday: null,
  partnerLoaded: false,

  setMemories: (memories) => set({ memories, memoriesLoaded: true }),
  patchMemory: (id, patch) => set({ memories: get().memories.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
  setActivity: (activity) => set({ activity, activityLoaded: true }),

  loadPartner: async (partnerId) => {
    if (get().partnerLoaded) return;
    try {
      const data = await getUser(partnerId);
      let partnerBirthday: Date | null = null;
      if (data?.birthday) {
        const d = data.birthday.toDate();
        partnerBirthday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
      set({ partnerBirthday, partnerLoaded: true });
    } catch {
      set({ partnerLoaded: true });
    }
  },

  reset: () =>
    set({ memories: [], memoriesLoaded: false, activity: [], activityLoaded: false, partnerBirthday: null, partnerLoaded: false }),
}));

/** Ouvre les abonnements temps réel (à appeler une fois dans la coquille). */
export function useLiveData() {
  const uid = useAuthStore((s) => s.user?.uid);
  useEffect(() => {
    if (!uid) return;
    const { setMemories, setActivity } = useDataStore.getState();
    const unsubM = subscribeMemories(setMemories, (e) => {
      console.warn("memories:", e);
      useDataStore.setState({ memoriesLoaded: true });
    });
    const unsubA = subscribeActivity(uid, setActivity);
    return () => {
      unsubM();
      unsubA();
    };
  }, [uid]);
}

/** Souvenirs partagés + état de chargement. */
export function useMemories() {
  const memories = useDataStore((s) => s.memories);
  const loaded = useDataStore((s) => s.memoriesLoaded);
  return {
    memories,
    loading: !loaded,
    // Le temps réel suffit ; « tirer pour rafraîchir » force quand même un aller-retour serveur.
    refresh: async () => {
      try {
        useDataStore.getState().setMemories(await getMemories());
      } catch {
        /* hors ligne : on garde le cache */
      }
    },
  };
}

export function useUnreadCount() {
  return useDataStore((s) => s.activity.filter((a) => !a.read).length);
}

/** Anniversaire du/de la partenaire (chargé une fois). */
export function usePartnerBirthday() {
  const user = useAuthStore((s) => s.user);
  const birthday = useDataStore((s) => s.partnerBirthday);
  const load = useDataStore((s) => s.loadPartner);
  useEffect(() => {
    if (user?.partnerId) load(user.partnerId);
  }, [user?.partnerId, load]);
  return birthday;
}
