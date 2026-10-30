"use client";
// Coquille de l'app connectée : garde d'authentification unique
// (au lieu d'une par page), tab bar, feuille « Nouveau souvenir »,
// feuilles de confirmation.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLiveData } from "@/store/dataStore";
import TabBar from "@/components/shell/TabBar";
import AddMemorySheet from "@/components/shell/AddMemorySheet";
import { ActionSheetHost } from "@/components/ui/ActionSheet";
import Splash from "@/components/shell/Splash";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  useLiveData();

  useEffect(() => {
    if (status === "anon") router.replace("/login");
  }, [status, router]);

  if (status !== "authed") return <Splash />;

  return (
    <>
      <main style={{ height: "100%", position: "relative" }}>{children}</main>
      <TabBar />
      <AddMemorySheet />
      <ActionSheetHost />
    </>
  );
}
