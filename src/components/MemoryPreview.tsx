"use client";
import Link from "next/link";
import { useMemo } from "react";
import { photosOf, type Memory } from "@/lib/firestore";
import { c } from "@/lib/tokens";

// Aperçu « Souvenirs » sur l'accueil → mène à /memory.
export default function MemoryPreview({ memories }: { memories: Memory[] }) {
  const { label, items, total } = useMemo(() => {
    const now = new Date();
    const sorted = [...memories].sort((a, b) => b.date.getTime() - a.date.getTime());
    const thisMonth = sorted.filter((m) => m.date.getMonth() === now.getMonth() && m.date.getFullYear() === now.getFullYear());
    const monthName = now.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
    if (thisMonth.length > 0) {
      return { label: monthName.charAt(0).toUpperCase() + monthName.slice(1), items: thisMonth.slice(0, 4), total: thisMonth.length };
    }
    return { label: "Les plus récents", items: sorted.slice(0, 4), total: sorted.length };
  }, [memories]);

  if (memories.length === 0) return null;

  return (
    <Link href="/memory" aria-label={`Souvenirs — ${label}, voir tout`} className="tap" style={{ display: "block", textDecoration: "none", margin: "16px 16px 0" }}>
      <div style={{ background: c.card, borderRadius: 18, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 12, color: c.text3, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>Souvenirs</p>
            <p style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{label}</p>
          </div>
          <span style={{ fontSize: 15, fontWeight: 500, color: c.link, display: "inline-flex", alignItems: "center", gap: 2 }}>
            Tout voir
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {items.map((m, i) => {
            const remaining = total - items.length;
            const overlay = i === items.length - 1 && remaining > 0;
            const src = photosOf(m)[0];
            return (
              <div key={m.id} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: c.card2 }}>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 4, fontSize: 10, textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{m.title}</span>
                )}
                {overlay && (
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
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
