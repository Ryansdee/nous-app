"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

    useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log("Firebase user:", firebaseUser?.uid);
        if (firebaseUser) {
        const data = await getUser(firebaseUser.uid);
        console.log("Firestore data:", data);
        if (data) {
            setUser({
            uid: firebaseUser.uid,
            name: data.name,
            email: data.email,
            partnerId: data.partnerId,
            birthday: data.birthday
            ? (() => {
                const d = data.birthday.toDate(); // ex: 6 juin avec UTC+2
                return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // force minuit local
                })()
            : null,
            weddingDate: data.weddingDate?.toDate() ?? null,
            });
        }
        } else {
        setUser(null);
        }
    });
    return () => unsub();
    }, [setUser]);

  return <>{children}</>;
}