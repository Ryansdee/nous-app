"use client";
/* eslint-disable @next/next/no-img-element */
// Profil du couple : en-tête + stats, « à la une » (sections de l'app),
// onglets Publications / Enregistrés / Mots.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMemories } from "@/store/dataStore";
import { useUiStore } from "@/store/uiStore";
import { photosOf, type Memory } from "@/lib/firestore";
import { TOGETHER_SINCE, daysSince, formatDate } from "@/lib/couple";
import { c, font } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import { CoupleAvatar } from "@/components/ui/Avatar";
import { EmptyState, HeaderButton, Segmented } from "@/components/ui/kit";

const HIGHLIGHTS = [
  { href: "/stats", label: "Histoire", emoji: "💞", bg: "linear-gradient(135deg,#FF3769,#9B6BFF)" },
  { href: "/memory", label: "Archives", emoji: "🗂️", bg: "linear-gradient(135deg,#BF5AF2,#5E5CE6)" },
  { href: "/bucketlist", label: "Rêves", emoji: "✨", bg: "linear-gradient(135deg,#30D158,#0A84FF)" },
  { href: "/gifts", label: "Cadeaux", emoji: "🎁", bg: "linear-gradient(135deg,#FF9F0A,#FF3769)" },
  { href: "/resto", label: "Resto", emoji: "🍽️", bg: "linear-gradient(135deg,#D6B26E,#FF9F0A)" },
  { href: "/capsule", label: "Capsule", emoji: "💌", bg: "linear-gradient(135deg,#FF6482,#FF2D55)" },
];

type Tab = "posts" | "saved" | "words";

function Grid({ items }: { items: Memory[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
      {items.map((m) => {
        const src = photosOf(m)[0];
        const multi = photosOf(m).length > 1;
        return (
          <Link key={m.id} href={`/p/${m.id}`} aria-label={`${m.title}, ${formatDate(m.date)}`} style={{ position: "relative", aspectRatio: "4 / 5", background: c.card, overflow: "hidden", display: "block" }}>
            {src ? (
              <img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, textAlign: "center", fontFamily: font.serif, fontSize: 17, fontWeight: 600, color: "#FFF", background: "radial-gradient(120% 80% at 20% 10%, #3a1d33 0%, #151526 55%, #0b1530 100%)" }}>
                {m.title}
              </span>
            )}
            {multi && (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFF" style={{ position: "absolute", top: 6, right: 6, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }}>
                <path d="M7 3h11a3 3 0 0 1 3 3v11h-2V6a1 1 0 0 0-1-1H7z" /><rect x="3" y="7" width="14" height="14" rx="2" />
              </svg>
            )}
            {(m.likes.length > 0 || m.commentCount > 0) && (
              <span aria-hidden="true" style={{ position: "absolute", left: 6, bottom: 5, fontSize: 11, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.8)", display: "flex", gap: 6 }}>
                {m.likes.length > 0 && <span>♥ {m.likes.length}</span>}
                {m.commentCount > 0 && <span>💬 {m.commentCount}</span>}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)!;
  const openAdd = useUiStore((s) => s.openAddMemory);
  const { memories, refresh } = useMemories();
  const [tab, setTab] = useState<Tab>("posts");

  const sorted = useMemo(() => [...memories].sort((a, b) => b.date.getTime() - a.date.getTime()), [memories]);
  const saved = sorted.filter((m) => m.savedBy.includes(user.uid));
  const withWords = sorted.filter((m) => m.words?.ryan || m.words?.sarah);
  const places = new Set(memories.map((m) => m.location.split(",")[0].trim().toLowerCase())).size;
  const days = daysSince(TOGETHER_SINCE);

  return (
    <Screen
      onRefresh={refresh}
      header={
        <PageHeader
          title="ryan.et.sarah"
          right={
            <>
              <HeaderButton label="Nouveau souvenir" onClick={openAdd}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </HeaderButton>
              <Link href="/settings" aria-label="Réglages" className="tap" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: c.text }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </Link>
            </>
          }
          bare
        />
      }
    >
      {/* En-tête de profil */}
      <section style={{ padding: "8px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <CoupleAvatar size={86} />
          <dl style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center" }}>
            {[
              { v: memories.length, l: "souvenirs" },
              { v: places, l: "lieux" },
              { v: days.toLocaleString("fr-BE"), l: "jours" },
            ].map((s) => (
              <div key={s.l} style={{ display: "flex", flexDirection: "column-reverse" }}>
                <dt style={{ fontSize: 13, color: c.text }}>{s.l}</dt>
                <dd style={{ fontSize: 18, fontWeight: 700 }}>{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div style={{ marginTop: 12, lineHeight: 1.4 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Ryan & Sarah ✦</p>
          <p style={{ fontSize: 14, color: c.text }}>Notre journal à deux.</p>
          <p style={{ fontSize: 14, color: c.text3 }}>Ensemble depuis le {formatDate(TOGETHER_SINCE)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Link href="/stats" className="tap" style={profileBtn}>Notre histoire</Link>
          <Link href="/map" className="tap" style={profileBtn}>Nos lieux</Link>
        </div>
      </section>

      {/* À la une */}
      <nav aria-label="Sections" className="scroll-x" style={{ display: "flex", gap: 14, padding: "18px 16px 14px" }}>
        {HIGHLIGHTS.map((h) => (
          <Link key={h.href} href={h.href} className="tap" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textDecoration: "none", color: c.text, flexShrink: 0, width: 66 }}>
            <span style={{ padding: 2, borderRadius: "50%", border: "1px solid #3A3A3E" }}>
              <span style={{ width: 60, height: 60, borderRadius: "50%", background: h.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }} aria-hidden="true">
                {h.emoji}
              </span>
            </span>
            <span style={{ fontSize: 12 }}>{h.label}</span>
          </Link>
        ))}
      </nav>

      {/* Onglets */}
      <div style={{ padding: "0 16px 10px" }}>
        <Segmented
          label="Contenu du profil"
          value={tab}
          onChange={setTab}
          options={[
            { value: "posts", label: <GridIcon /> },
            { value: "saved", label: <SaveIcon /> },
            { value: "words", label: <WordsIcon /> },
          ]}
        />
      </div>

      {tab === "posts" &&
        (sorted.length ? <Grid items={sorted} /> : <EmptyState icon="📸" title="Aucune publication" text="Touchez le + pour partager votre premier souvenir." />)}
      {tab === "saved" &&
        (saved.length ? <Grid items={saved} /> : <EmptyState icon="🔖" title="Rien d'enregistré" text="Touche le marque-page sous un souvenir pour le retrouver ici. Seul·e toi vois tes enregistrements." />)}
      {tab === "words" &&
        (withWords.length ? (
          <ul style={{ listStyle: "none", padding: "4px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {withWords.map((m) => (
              <li key={m.id}>
                <Link href={`/p/${m.id}`} className="tap" style={{ display: "flex", gap: 12, padding: 12, background: c.card, borderRadius: 14, textDecoration: "none", color: c.text }}>
                  {photosOf(m)[0] && <img src={photosOf(m)[0]} alt="" loading="lazy" style={{ width: 56, height: 70, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12, color: c.text3, textTransform: "uppercase", letterSpacing: 0.3 }}>{m.title} · {formatDate(m.date, { month: "short", year: "numeric" })}</p>
                    {m.words.ryan && <p style={{ fontFamily: font.serif, fontSize: 18, fontStyle: "italic", marginTop: 4, lineHeight: 1.3 }}>« {m.words.ryan} » <span style={{ fontFamily: font.sans, fontStyle: "normal", fontSize: 12, color: "#4CB5F9" }}>— Ryan</span></p>}
                    {m.words.sarah && <p style={{ fontFamily: font.serif, fontSize: 18, fontStyle: "italic", marginTop: 4, lineHeight: 1.3 }}>« {m.words.sarah} » <span style={{ fontFamily: font.sans, fontStyle: "normal", fontSize: 12, color: "#FF6482" }}>— Sarah</span></p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="✍️" title="Aucun mot pour l'instant" text="Ajoute ton mot sous un souvenir pour le retrouver ici." />
        ))}
    </Screen>
  );
}

const profileBtn: React.CSSProperties = {
  flex: 1,
  minHeight: 34,
  borderRadius: 8,
  background: "#262629",
  color: "#F5F5F5",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-label="Publications" role="img">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-label="Enregistrés" role="img">
      <path d="M19 21 12 16l-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z" />
    </svg>
  );
}
function WordsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-label="Nos mots" role="img">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}
