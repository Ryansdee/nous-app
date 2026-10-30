"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useMemories } from "@/store/dataStore";
import type { Memory } from "@/lib/firestore";
import { TOGETHER_SINCE, daysSince } from "@/lib/couple";
import { c, font } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/kit";
import PostCard from "@/components/feed/PostCard";
import CommentsSheet from "@/components/feed/CommentsSheet";
import WordSheet from "@/components/feed/WordSheet";
import { StoriesRow } from "@/components/feed/Stories";

export default function HomePage() {
  const openAdd = useUiStore((s) => s.openAddMemory);
  const { memories, loading, refresh } = useMemories();
  const [commentsFor, setCommentsFor] = useState<{ id: string; focus: boolean } | null>(null);
  const [wordFor, setWordFor] = useState<string | null>(null);

  // Le fil suit la date du souvenir (le plus récent en haut)
  const feed = useMemo(() => [...memories].sort((a, b) => b.date.getTime() - a.date.getTime()), [memories]);
  // Toujours la version temps réel du souvenir ouvert
  const commentsMemory = commentsFor ? memories.find((m) => m.id === commentsFor.id) ?? null : null;
  const wordMemory = wordFor ? memories.find((m) => m.id === wordFor) ?? null : null;

  return (
    <Screen
      onRefresh={refresh}
      contentStyle={{ paddingBottom: "calc(var(--tabbar-space) + 12px)" }}
      header={
        <header style={{ flexShrink: 0, paddingTop: "var(--safe-top)", background: "#000", position: "relative", zIndex: 10 }}>
          <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 0 16px" }}>
            <h1 style={{ fontFamily: font.serif, fontStyle: "italic", fontSize: 32, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>
              Nous<span aria-hidden="true" style={{ fontStyle: "normal", fontSize: 18, marginLeft: 3, background: "linear-gradient(45deg,#FF3769,#1E8CFF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>✦</span>
            </h1>
            <Link
              href="/stats"
              className="tap"
              aria-label={`${daysSince(TOGETHER_SINCE)} jours ensemble — voir notre histoire`}
              style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", borderRadius: 999, background: c.card2, color: c.text, textDecoration: "none", fontSize: 13, fontWeight: 600 }}
            >
              <span aria-hidden="true">💞</span>
              {daysSince(TOGETHER_SINCE).toLocaleString("fr-BE")} j
            </Link>
          </div>
        </header>
      }
    >
      <StoriesRow memories={memories} onAdd={openAdd} />

      {loading ? (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 8 }}>
          {[0, 1].map((i) => (
            <div key={i}>
              <div style={{ display: "flex", gap: 10, padding: "8px 12px", alignItems: "center" }}>
                <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                <div className="skeleton" style={{ width: 140, height: 12, borderRadius: 6 }} />
              </div>
              <div className="skeleton" style={{ width: "100%", aspectRatio: "4 / 5" }} />
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <EmptyState
          icon="📸"
          title="Votre fil est vide"
          text="Publiez votre premier souvenir : il apparaîtra ici, sur la carte et dans vos stories."
          action={
            <button type="button" onClick={openAdd} className="tap" style={{ minHeight: 44, padding: "0 22px", borderRadius: 12, border: "none", background: c.blue, color: "#FFF", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Publier un souvenir
            </button>
          }
        />
      ) : (
        <div style={{ paddingTop: 4 }}>
          {feed.map((m: Memory, i) => (
            <PostCard
              key={m.id}
              memory={m}
              priority={i === 0}
              onOpenComments={(mm, focus) => setCommentsFor({ id: mm.id, focus: !!focus })}
              onAddWord={(mm) => setWordFor(mm.id)}
            />
          ))}
          <p style={{ textAlign: "center", color: c.text3, fontSize: 13, padding: "20px 0 8px" }}>✦ Vous êtes à jour</p>
        </div>
      )}

      <CommentsSheet memory={commentsMemory} autoFocus={commentsFor?.focus} onClose={() => setCommentsFor(null)} />
      <WordSheet memory={wordMemory} onClose={() => setWordFor(null)} />
    </Screen>
  );
}
