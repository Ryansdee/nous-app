"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { getMemories, Memory } from "@/lib/firestore";

// Libellé de mois capitalisé : "juin 2026" → "Juin 2026"
function monthLabel(d: Date): string {
  const s = d.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MemoryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => { if (!u) router.push("/login"); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    getMemories().then((m) => { setMemories(m); setLoading(false); });
  }, [user]);

  // Tri décroissant + regroupement par mois (mois courant en tête)
  const sorted = useMemo(
    () => [...memories].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [memories]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    for (const m of sorted) {
      const key = `${m.date.getFullYear()}-${m.date.getMonth()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.values()]; // déjà dans l'ordre décroissant grâce à `sorted`
  }, [sorted]);

  // Flashbacks « Snap » : souvenirs du mois courant, les années précédentes
  const flashbacks = useMemo(() => {
    const now = new Date();
    return sorted.filter(
      (m) => m.date.getMonth() === now.getMonth() && m.date.getFullYear() < now.getFullYear()
    );
  }, [sorted]);

  const open = openIndex !== null ? sorted[openIndex] : null;

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(() => setOpenIndex((i) => (i === null ? i : Math.max(0, i - 1))), []);
  const next = useCallback(() => setOpenIndex((i) => (i === null ? i : Math.min(sorted.length - 1, i + 1))), [sorted.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, prev, next]);

  if (!user || loading) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  // Index global d'un souvenir dans `sorted` (pour ouvrir le bon item)
  const indexOf = (m: Memory) => sorted.findIndex((x) => x.id === m.id);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#000", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <header style={{ flexShrink: 0, padding: "max(14px, env(safe-area-inset-top)) 20px 14px", borderBottom: "1px solid #1C1C1E" }}>
        <p style={{ fontSize: 12, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
          {memories.length} souvenir{memories.length > 1 ? "s" : ""}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#FFF", letterSpacing: -0.5, fontFamily: "var(--font-serif), serif" }}>
          Souvenirs
        </h1>
      </header>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ paddingBottom: 100 }}>

          {/* Flashbacks (mois courant, années passées) */}
          {flashbacks.length > 0 && (
            <section aria-label="Ce mois-là les années passées" style={{ padding: "16px 0", borderBottom: "1px solid #1C1C1E" }}>
              <h2 style={{ fontSize: 12, color: "#FFD60A", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, padding: "0 16px", marginBottom: 12 }}>
                ✦ Ce mois-là, les années passées
              </h2>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 16px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                {flashbacks.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOpenIndex(indexOf(m))}
                    aria-label={`${m.title}, ${monthLabel(m.date)}`}
                    style={{ flexShrink: 0, width: 120, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: 120, height: 150, borderRadius: 14, overflow: "hidden", background: "#1C1C1E", position: "relative" }}>
                      {m.photoUrl
                        ? <img src={m.photoUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontSize: 13, color: "#FFF", textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{m.title}</span>}
                      <span aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 8px 6px", fontSize: 12, fontWeight: 700, color: "#FFF", background: "linear-gradient(0deg, rgba(0,0,0,0.8), transparent)" }}>
                        {m.date.getFullYear()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Grilles par mois */}
          {groups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <p style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500, marginBottom: 4 }}>Aucun souvenir pour l'instant</p>
              <p style={{ fontSize: 13, color: "#8E8E93" }}>Ajoute ton premier souvenir depuis l'accueil.</p>
            </div>
          ) : (
            groups.map((mems) => (
              <section key={mems[0].id} aria-label={monthLabel(mems[0].date)}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#FFF", padding: "20px 16px 12px", letterSpacing: -0.2 }}>
                  {monthLabel(mems[0].date)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#8E8E93", marginLeft: 8 }}>{mems.length}</span>
                </h2>
                {/* Grille 3 colonnes façon profil IG */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                  {mems.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOpenIndex(indexOf(m))}
                      aria-label={`${m.title}, ${m.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}`}
                      style={{ position: "relative", aspectRatio: "1 / 1", padding: 0, border: "none", cursor: "pointer", background: "#1C1C1E", overflow: "hidden" }}
                    >
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, fontSize: 12, color: "#FFF", textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{m.title}</span>
                      )}
                      {(m.words?.ryan || m.words?.sarah) && (
                        <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#FF2D55", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }} />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* ── LIGHTBOX (plein écran, navigation ←/→) ── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={close}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.94)", display: "flex", flexDirection: "column" }}
        >
          {/* Barre haute */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "max(14px, env(safe-area-inset-top)) 12px 8px" }}>
            <div style={{ paddingLeft: 6, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{open.title}</p>
              <p style={{ fontSize: 12, color: "#AEAEB2" }}>{open.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} · {open.location}</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); close(); }} aria-label="Fermer" style={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#FFF" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", position: "relative" }}>
            {openIndex !== null && openIndex > 0 && (
              <button type="button" onClick={prev} aria-label="Souvenir précédent" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(28,28,30,0.7)", border: "none", cursor: "pointer", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
            )}
            {open.photoUrl ? (
              <img src={open.photoUrl} alt={`Photo : ${open.title}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
            ) : (
              <div style={{ width: "100%", maxWidth: 360, aspectRatio: "4 / 5", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontSize: 22, fontWeight: 700, textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{open.title}</div>
            )}
            {openIndex !== null && openIndex < sorted.length - 1 && (
              <button type="button" onClick={next} aria-label="Souvenir suivant" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(28,28,30,0.7)", border: "none", cursor: "pointer", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            )}
          </div>

          {/* Mots */}
          {(open.words?.ryan || open.words?.sarah) && (
            <div onClick={(e) => e.stopPropagation()} style={{ padding: "12px 16px max(20px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 6 }}>
              {open.words.ryan && (
                <p style={{ fontSize: 14, color: "#E5E5EA", lineHeight: 1.4 }}><span style={{ fontWeight: 700, color: "#409CFF" }}>Ryan</span> {open.words.ryan}</p>
              )}
              {open.words.sarah && (
                <p style={{ fontSize: 14, color: "#E5E5EA", lineHeight: 1.4 }}><span style={{ fontWeight: 700, color: "#FF6482" }}>Sarah</span> {open.words.sarah}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}