"use client";
/* eslint-disable @next/next/no-img-element */
// Stories : « Ce jour-là » + une story par année.
// Visionneuse plein écran : barres de progression, tap gauche/droite,
// appui long = pause, glisser vers le bas = fermer.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { photosOf, type Memory } from "@/lib/firestore";
import { haptic } from "@/lib/device";
import { smartDate } from "@/lib/time";
import { BRAND, c } from "@/lib/tokens";

const DURATION = 5000;
const SEEN_KEY = "nous.stories.seen";

type Slide = { src: string | null; memory: Memory };
export type StorySet = { key: string; label: string; cover: string | null; slides: Slide[]; highlight?: boolean };

function slidesOf(list: Memory[]): Slide[] {
  return list.flatMap((m): Slide[] => {
    const p = photosOf(m);
    return p.length ? p.map((src) => ({ src, memory: m })) : [{ src: null, memory: m }];
  });
}

export function buildStorySets(memories: Memory[]): StorySet[] {
  const now = new Date();
  const sets: StorySet[] = [];
  const today = memories.filter((m) => m.date.getMonth() === now.getMonth() && m.date.getDate() === now.getDate() && m.date.getFullYear() < now.getFullYear());
  if (today.length) {
    const slides = slidesOf(today);
    sets.push({ key: `today-${now.toDateString()}`, label: "Ce jour-là", cover: slides.find((s) => s.src)?.src ?? null, slides, highlight: true });
  }
  const byYear = new Map<number, Memory[]>();
  for (const m of memories) {
    const y = m.date.getFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(m);
  }
  [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .forEach(([y, list]) => {
      const sorted = [...list].sort((a, b) => a.date.getTime() - b.date.getTime());
      const slides = slidesOf(sorted).slice(-30);
      sets.push({ key: `y${y}-${slides.length}`, label: String(y), cover: slides.filter((s) => s.src).at(-1)?.src ?? null, slides });
    });
  return sets;
}

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/* ── Rangée de bulles ──────────────────────────────────────── */
export function StoriesRow({ memories, onAdd }: { memories: Memory[]; onAdd: () => void }) {
  const sets = useMemo(() => buildStorySets(memories), [memories]);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : readSeen()));

  function markSeen(key: string) {
    setSeen((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev).add(key);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-100)));
      } catch {
        /* noop */
      }
      return next;
    });
  }

  return (
    <>
      <div role="list" aria-label="Stories" className="scroll-x" style={{ display: "flex", gap: 14, padding: "10px 12px 12px", borderBottom: `0.5px solid ${c.separator}` }}>
        <div role="listitem">
          <button type="button" onClick={onAdd} className="tap" style={bubbleBtn}>
            <span style={{ position: "relative", width: 70, height: 70, borderRadius: "50%", background: c.card2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c.text3} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span style={{ position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: "50%", background: c.blue, border: "3px solid #000", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span>
            </span>
            <span style={bubbleLabel}>Nouveau</span>
          </button>
        </div>
        {sets.map((s, i) => {
          const isSeen = seen.has(s.key);
          return (
            <div role="listitem" key={s.key}>
              <button type="button" onClick={() => { haptic(6); setOpenAt(i); }} className="tap" style={bubbleBtn} aria-label={`Story ${s.label}${isSeen ? " (vue)" : ""}`}>
                <span style={{ padding: 2.5, borderRadius: "50%", background: isSeen ? "#3A3A3E" : s.highlight ? "linear-gradient(45deg,#FFD60A,#FF3769)" : BRAND }}>
                  <span style={{ display: "block", padding: 2.5, borderRadius: "50%", background: "#000" }}>
                    <span style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", background: c.card2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.cover ? <img src={s.cover} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>✦</span>}
                    </span>
                  </span>
                </span>
                <span style={{ ...bubbleLabel, color: isSeen ? c.text3 : c.text }}>{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {openAt !== null && sets[openAt] && (
        <StoryViewer
          key={sets[openAt].key}
          set={sets[openAt]}
          onSeen={() => markSeen(sets[openAt].key)}
          onNextSet={() => (openAt < sets.length - 1 ? setOpenAt(openAt + 1) : setOpenAt(null))}
          onPrevSet={() => (openAt > 0 ? setOpenAt(openAt - 1) : undefined)}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

const bubbleBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 72 };
const bubbleLabel: React.CSSProperties = { fontSize: 12, color: c.text, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/* ── Visionneuse ───────────────────────────────────────────── */
function StoryViewer({ set, onClose, onSeen, onNextSet, onPrevSet }: { set: StorySet; onClose: () => void; onSeen: () => void; onNextSet: () => void; onPrevSet: () => void }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasHold = useRef(false);
  const slide = set.slides[i];

  const next = useCallback(() => {
    if (i < set.slides.length - 1) setI(i + 1);
    else {
      onSeen();
      onNextSet();
    }
  }, [i, set.slides.length, onSeen, onNextSet]);
  const prev = useCallback(() => {
    if (i > 0) setI(i - 1);
    else onPrevSet();
  }, [i, onPrevSet]);

  // Avance automatique
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(next, DURATION);
    return () => clearTimeout(t);
  }, [i, paused, next]);

  // Préchargement de l'image suivante
  useEffect(() => {
    const n = set.slides[i + 1]?.src;
    if (n) {
      const img = new Image();
      img.src = n;
    }
  }, [i, set.slides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  function down(x: number, y: number) {
    startRef.current = { x, y, t: Date.now() };
    wasHold.current = false;
    holdTimer.current = setTimeout(() => {
      wasHold.current = true;
      setPaused(true);
    }, 220);
  }
  function move(y: number) {
    const s = startRef.current;
    if (!s) return;
    const dy = y - s.y;
    if (dy > 10) {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      setPaused(true);
      setDragY(dy);
    }
  }
  function up(x: number) {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const s = startRef.current;
    startRef.current = null;
    if (dragY > 110) {
      onClose();
      return;
    }
    if (dragY > 0) {
      setDragY(0);
      setPaused(false);
      return;
    }
    setPaused(false);
    if (wasHold.current || !s) return;
    haptic(4);
    if (x < window.innerWidth * 0.33) prev();
    else next();
  }

  if (!slide || typeof document === "undefined") return null;
  const m = slide.memory;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story ${set.label}`}
      style={{ position: "fixed", inset: 0, zIndex: 1050, background: `rgba(0,0,0,${1 - Math.min(dragY / 500, 0.6)})`, animation: "fade-in .2s ease both", touchAction: "none", userSelect: "none" }}
      onPointerDown={(e) => down(e.clientX, e.clientY)}
      onPointerMove={(e) => move(e.clientY)}
      onPointerUp={(e) => up(e.clientX)}
      onPointerCancel={(e) => up(e.clientX)}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          margin: "0 auto",
          maxWidth: 520,
          transform: `translateY(${dragY}px) scale(${1 - Math.min(dragY / 1500, 0.15)})`,
          transition: dragY ? "none" : "transform .25s ease",
          borderRadius: dragY ? 16 : 0,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {slide.src ? (
          <img key={slide.src} src={slide.src} alt={m.title} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "fade-in .25s ease both" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", background: "radial-gradient(120% 80% at 20% 10%, #3a1d33 0%, #151526 55%, #0b1530 100%)" }}>
            <span style={{ fontFamily: "var(--font-serif), serif", fontSize: 40, fontWeight: 600 }}>{m.title}</span>
          </div>
        )}
        {/* Dégradés pour la lisibilité */}
        <div aria-hidden="true" style={{ position: "absolute", inset: "0 0 auto 0", height: 160, background: "linear-gradient(180deg, rgba(0,0,0,.6), transparent)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: "auto 0 0 0", height: 220, background: "linear-gradient(0deg, rgba(0,0,0,.75), transparent)" }} />

        {/* Barres de progression */}
        <div style={{ position: "absolute", top: "calc(var(--safe-top) + 8px)", left: 8, right: 8, display: "flex", gap: 3 }}>
          {set.slides.map((_, k) => (
            <span key={k} style={{ flex: 1, height: 2.5, borderRadius: 2, background: "rgba(255,255,255,.35)", overflow: "hidden" }}>
              <span
                key={k === i ? `a${i}` : k}
                style={{
                  display: "block",
                  height: "100%",
                  background: "#FFF",
                  transformOrigin: "left",
                  transform: k < i ? "scaleX(1)" : k > i ? "scaleX(0)" : undefined,
                  animation: k === i ? `story-progress ${DURATION}ms linear both` : undefined,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </span>
          ))}
        </div>

        {/* En-tête */}
        <div style={{ position: "absolute", top: "calc(var(--safe-top) + 18px)", left: 12, right: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</span>
          <p style={{ flex: 1, fontSize: 14, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>
            {set.label} <span style={{ fontWeight: 400, opacity: 0.8 }}>· {smartDate(m.date)}</span>
          </p>
          <button
            type="button"
            aria-label="Fermer"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={onClose}
            style={{ width: 44, height: 44, background: "none", border: "none", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Légende + lien */}
        <div style={{ position: "absolute", left: 16, right: 16, bottom: "calc(var(--safe-bottom) + 18px)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{m.title}</p>
            <p style={{ fontSize: 14, opacity: 0.85 }}>📍 {m.location}</p>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={() => router.push(`/p/${m.id}`)}
            style={{ alignSelf: "flex-start", minHeight: 40, padding: "0 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,.5)", background: "rgba(0,0,0,.25)", color: "#FFF", fontSize: 14, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}
          >
            Voir le souvenir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
