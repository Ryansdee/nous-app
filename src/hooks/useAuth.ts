"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const data = await getUser(firebaseUser.uid);
        if (data) {
            setUser({
            uid: firebaseUser.uid,
            name: data.name,
            email: data.email,
            partnerId: data.partnerId,
            birthday: data.birthday?.toDate() ?? null,
            weddingDate: data.weddingDate?.toDate() ?? null,
            });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  return { user };
}