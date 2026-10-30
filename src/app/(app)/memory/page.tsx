/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useMemories } from "@/store/dataStore";
import { photosOf, type Memory } from "@/lib/firestore";
import { haptic } from "@/lib/device";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/kit";

// Libellé de mois capitalisé : "juin 2026" → "Juin 2026"
function monthLabel(d: Date): string {
  const s = d.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MemoryPage() {
  const { memories, loading, refresh } = useMemories();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // En revenant au souvenir précédent, on commence par sa dernière photo
  const [startAtEnd, setStartAtEnd] = useState(false);

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
  const prev = useCallback(() => {
    setStartAtEnd(true);
    setOpenIndex((i) => (i === null ? i : Math.max(0, i - 1)));
  }, []);
  const next = useCallback(() => {
    setStartAtEnd(false);
    setOpenIndex((i) => (i === null ? i : Math.min(sorted.length - 1, i + 1)));
  }, [sorted.length]);
  const openAt = (i: number) => {
    setStartAtEnd(false);
    setOpenIndex(i);
  };

  // Index global d'un souvenir dans `sorted` (pour ouvrir le bon item)
  const indexOf = (m: Memory) => sorted.findIndex((x) => x.id === m.id);

  return (
    <Screen
      transition="push"
      onRefresh={refresh}
      header={
        <PageHeader
          back={{ href: "/profile", label: "Profil" }}
          eyebrow={`${memories.length} souvenir${memories.length > 1 ? "s" : ""}`}
          title="Souvenirs"
        />
      }
    >
      {/* Flashbacks (mois courant, années passées) */}
      {flashbacks.length > 0 && (
        <section aria-label="Ce mois-là les années passées" style={{ padding: "16px 0", borderBottom: "0.5px solid rgba(84,84,88,0.55)" }}>
          <h2 style={{ fontSize: 12, color: "#FFD60A", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, padding: "0 16px", marginBottom: 12 }}>
            ✦ Ce mois-là, les années passées
          </h2>
          <div className="scroll-x" style={{ display: "flex", gap: 10, padding: "0 16px" }}>
            {flashbacks.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => openAt(indexOf(m))}
                aria-label={`${m.title}, ${monthLabel(m.date)}`}
                className="tap"
                style={{ flexShrink: 0, width: 120, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 120, height: 160, borderRadius: 14, overflow: "hidden", background: "#161618", position: "relative" }}>
                  {photosOf(m)[0]
                    ? <img src={photosOf(m)[0]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontSize: 13, color: "#FFF", textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{m.title}</span>}
                  <span aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 8px 6px", fontSize: 13, fontWeight: 700, color: "#FFF", background: "linear-gradient(0deg, rgba(0,0,0,0.8), transparent)" }}>
                    {m.date.getFullYear()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Grilles par mois */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginTop: 52 }}>
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "1 / 1" }} />)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon="🖼️" title="Aucun souvenir pour l'instant" text="Touchez le + en bas pour ajouter votre premier moment." />
      ) : (
        groups.map((mems) => (
          <section key={mems[0].id} aria-label={monthLabel(mems[0].date)}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#FFF", padding: "20px 16px 10px", letterSpacing: -0.2 }}>
              {monthLabel(mems[0].date)}
              <span style={{ fontSize: 14, fontWeight: 500, color: "#8E8E93", marginLeft: 8 }}>{mems.length}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              {mems.map((m) => {
                const n = photosOf(m).length;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openAt(indexOf(m))}
                    aria-label={`${m.title}, ${m.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}`}
                    style={{ position: "relative", aspectRatio: "1 / 1", padding: 0, border: "none", cursor: "pointer", background: "#161618", overflow: "hidden" }}
                  >
                    {n > 0 ? (
                      <img src={photosOf(m)[0]} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, fontSize: 12, color: "#FFF", textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{m.title}</span>
                    )}
                    {n > 1 && (
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFF" style={{ position: "absolute", top: 6, right: 6, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }}>
                        <path d="M7 3h11a3 3 0 0 1 3 3v11h-2V6a1 1 0 0 0-1-1H7z" /><rect x="3" y="7" width="14" height="14" rx="2" />
                      </svg>
                    )}
                    {n <= 1 && (m.words?.ryan || m.words?.sarah) && (
                      <span aria-hidden="true" style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#FF2D55", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}

      {open && openIndex !== null && (
        <Lightbox
          key={open.id}
          startAtEnd={startAtEnd}
          memory={open}
          hasPrev={openIndex > 0}
          hasNext={openIndex < sorted.length - 1}
          onPrev={prev}
          onNext={next}
          onClose={close}
        />
      )}
    </Screen>
  );
}

// ──────────────────────────────────────────────────────────────
// Visionneuse plein écran : swipe ←/→ entre les photos puis les
// souvenirs, swipe ↓ pour fermer (comme Photos sur iPhone).
// ──────────────────────────────────────────────────────────────
function Lightbox({
  memory,
  startAtEnd,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  memory: Memory;
  startAtEnd: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const photos = photosOf(memory);
  const [photo, setPhoto] = useState(() => (startAtEnd ? Math.max(0, photos.length - 1) : 0));
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);

  const goNext = useCallback(() => {
    haptic(5);
    if (photo < photos.length - 1) setPhoto(photo + 1);
    else if (hasNext) onNext();
  }, [photo, photos.length, hasNext, onNext]);

  const goPrev = useCallback(() => {
    haptic(5);
    if (photo > 0) setPhoto(photo - 1);
    else if (hasPrev) onPrev();
  }, [photo, hasPrev, onPrev]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    setDrag(s.axis === "x" ? { x: dx, y: 0 } : { x: 0, y: Math.max(0, dy) });
  }
  function onTouchEnd() {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (s?.axis === "y" && drag.y > 120) {
      onClose();
      return;
    }
    if (s?.axis === "x") {
      if (drag.x < -60) goNext();
      else if (drag.x > 60) goPrev();
    }
    setDrag({ x: 0, y: 0 });
  }

  const dim = 1 - Math.min(drag.y / 400, 0.6);
  const src = photos[photo];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={memory.title} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", background: `rgba(0,0,0,${dim})`, animation: "fade-in .2s ease both" }}>
      {/* Barre haute */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "calc(var(--safe-top) + 6px) 8px 8px 16px", opacity: dim }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memory.title}</p>
          <p style={{ fontSize: 13, color: "#AEAEB2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {memory.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} · {memory.location}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="tap" style={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(44,44,46,0.8)", borderRadius: "50%", border: "none", cursor: "pointer", color: "#FFF" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Image */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", position: "relative", touchAction: "none" }}
      >
        <div
          key={`${memory.id}-${photo}`}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translate(${drag.x}px, ${drag.y}px) scale(${1 - Math.min(drag.y / 1200, 0.25)})`,
            transition: dragging ? "none" : "transform .25s cubic-bezier(.2,.8,.2,1)",
            animation: "fade-in .18s ease both",
          }}
        >
          {src ? (
            <img src={src} alt={`Photo : ${memory.title}`} draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6 }} />
          ) : (
            <div style={{ width: "100%", maxWidth: 360, aspectRatio: "4 / 5", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontSize: 24, fontWeight: 700, textAlign: "center", background: "linear-gradient(135deg,#3a2a3a,#2a3145)" }}>{memory.title}</div>
          )}
        </div>
      </div>

      {/* Bas : points + mots */}
      <div style={{ padding: "10px 16px calc(var(--safe-bottom) + 16px)", display: "flex", flexDirection: "column", gap: 8, opacity: dim }}>
        {photos.length > 1 && (
          <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 4 }}>
            {photos.map((_, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === photo ? "#FFF" : "#48484A" }} />
            ))}
          </div>
        )}
        {memory.words?.ryan && (
          <p style={{ fontSize: 15, color: "#E5E5EA", lineHeight: 1.4 }}><span style={{ fontWeight: 700, color: "#409CFF" }}>Ryan</span> {memory.words.ryan}</p>
        )}
        {memory.words?.sarah && (
          <p style={{ fontSize: 15, color: "#E5E5EA", lineHeight: 1.4 }}><span style={{ fontWeight: 700, color: "#FF6482" }}>Sarah</span> {memory.words.sarah}</p>
        )}
        <p className="sr-only">Glisse à gauche ou à droite pour naviguer, vers le bas pour fermer.</p>
      </div>
    </div>,
    document.body
  );
}
