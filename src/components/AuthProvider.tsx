"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";

/** Écoute unique de l'état Firebase Auth pour toute l'app. */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        useDataStore.getState().reset();
        setUser(null);
        return;
      }
      try {
        const data = await getUser(firebaseUser.uid);
        if (!data) {
          setUser(null);
          return;
        }
        const toLocalDay = (ts: { toDate: () => Date } | null | undefined) => {
          if (!ts) return null;
          const d = ts.toDate();
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // minuit local
        };
        setUser({
          uid: firebaseUser.uid,
          name: data.name,
          email: data.email,
          partnerId: data.partnerId,
          birthday: toLocalDay(data.birthday),
          weddingDate: data.weddingDate?.toDate() ?? null,
        });
      } catch (e) {
        console.error(e);
        setUser(null);
      }
    });
    return () => unsub();
  }, [setUser]);

  return <>{children}</>;
}
