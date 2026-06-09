"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { getMemories, Memory } from "@/lib/firestore";
import dynamic from "next/dynamic";

const MemoryMap = dynamic(() => import("@/components/MemoryMap"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Memory | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    getMemories().then((m) => {
      setMemories(m);
      setLoading(false);
    });
  }, [user]);

  if (!user || loading) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0C" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const withCoords = memories.filter(m => m.lat && m.lng);
  const uniqueLocations = [...new Set(memories.map(m => m.location))];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0A0A0C", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "60px 20px 16px", borderBottom: "1px solid #1C1C1E" }}>
        <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
          {withCoords.length} endroits sur la carte
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>
          Notre carte
        </h1>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* MAP */}
          <div style={{ height: 320, position: "relative", margin: "16px 20px 0", borderRadius: 16, overflow: "hidden", border: "1px solid #2C2C2E" }}>
            {withCoords.length === 0 ? (
              <div style={{ width: "100%", height: "100%", background: "#1C1C1E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <p style={{ fontSize: 32 }}>🗺️</p>
                <p style={{ fontSize: 14, color: "#636366", textAlign: "center", padding: "0 32px" }}>
                  Les souvenirs avec une localisation apparaîtront ici
                </p>
              </div>
            ) : (
              <MemoryMap memories={memories} />
            )}
          </div>

          {/* Stats rapides */}
          <div style={{ display: "flex", gap: 10, padding: "16px 20px 0", overflowX: "auto", scrollbarWidth: "none" }}>
            {[
              { label: "Endroits", value: uniqueLocations.length, color: "#0A84FF" },
              { label: "Sur la carte", value: withCoords.length, color: "#30D158" },
              { label: "Souvenirs", value: memories.length, color: "#c9a96e" },
            ].map((stat) => (
              <div key={stat.label} style={{ flexShrink: 0, background: "#1C1C1E", borderRadius: 12, padding: "12px 16px", border: "1px solid #2C2C2E", minWidth: 90 }}>
                <p style={{ fontSize: 24, fontWeight: 800, color: stat.color, letterSpacing: -0.5 }}>{stat.value}</p>
                <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Liste des lieux */}
          <div style={{ padding: "20px" }}>
            <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
              Tous les endroits
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {uniqueLocations.map((loc, i) => {
                const locMemories = memories.filter(m => m.location === loc);
                return (
                  <div
                    key={loc}
                    onClick={() => setSelected(selected?.location === loc ? null : locMemories[0])}
                    style={{ background: "#1C1C1E", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", border: selected?.location === loc ? "1px solid #c9a96e" : "1px solid transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a96e", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 15, color: "#FFF", fontWeight: 500 }}>{loc}</p>
                        <p style={{ fontSize: 12, color: "#636366", marginTop: 1 }}>
                          {locMemories.length} souvenir{locMemories.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "#636366" }}>→</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Souvenirs du lieu sélectionné */}
          {selected && (
            <div style={{ padding: "0 20px 20px" }}>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
                Souvenirs à {selected.location}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {memories.filter(m => m.location === selected.location).map(m => (
                  <div key={m.id} style={{ background: "#1C1C1E", borderRadius: 12, overflow: "hidden", display: "flex", gap: 0 }}>
                    {m.photoUrl && (
                      <img src={m.photoUrl} alt={m.title} style={{ width: 80, height: 80, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 14, color: "#FFF", fontWeight: 600, marginBottom: 4 }}>{m.title}</p>
                      <p style={{ fontSize: 12, color: "#636366" }}>
                        {m.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 100 }} />
        </div>
      </div>
    </div>
  );
}