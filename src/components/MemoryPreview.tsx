"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Memory } from "@/lib/firestore";

// Aperçu « Souvenirs » pour la home : carte cliquable qui mène à /memory.
// On passe les souvenirs déjà chargés par la home (pas de second fetch).
export default function MemoryPreview({ memories }: { memories: Memory[] }) {
  const now = new Date();

  // Souvenirs du mois courant ; sinon, les plus récents en repli
  const { label, items, total } = useMemo(() => {
    const sorted = [...memories].sort((a, b) => b.date.getTime() - a.date.getTime());
    const thisMonth = sorted.filter(
      (m) => m.date.getMonth() === now.getMonth() && m.date.getFullYear() === now.getFullYear()
    );
    const monthName = now.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
    if (thisMonth.length > 0) {
      return {
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        items: thisMonth.slice(0, 4),
        total: thisMonth.length,
      };
    }
    return { label: "Les plus récents", items: sorted.slice(0, 4), total: sorted.length };
  }, [memories]);

  if (memories.length === 0) return null;

  return (
    <Link
      href="/memory"
      aria-label={`Souvenirs — ${label}, voir tout`}
      style={{ display: "block", textDecoration: "none", margin: "16px 16px 0" }}
    >
      <div style={{ background: "#1C1C1E", borderRadius: 16, border: "1px solid #2C2C2E", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 12, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>Souvenirs</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#FFF", marginTop: 2 }}>{label}</p>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#409CFF", display: "inline-flex", alignItems: "center", gap: 4 }}>
            Voir tout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </span>
        </div>

        {/* Mini-grille : 4 vignettes carrées, la dernière affiche +N s'il en reste */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {items.map((m, i) => {
            const remaining = total - items.length;
            const showOverlay = i === items.length - 1 && remaining > 0;
            return (
              <div key={m.id} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: "#2C2C2E" }}>
                {m.photoUrl
                  ? <img src={m.photoUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 4, fontSize: 10, color: "#FFF", textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{m.title}</span>}
                {showOverlay && (
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#FFF" }}>
                    +{remaining}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}