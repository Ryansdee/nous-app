"use client";
/* eslint-disable @next/next/no-img-element */
// Publication du fil : en-tête, carrousel photo (double-tap = j'aime),
// actions (j'aime, commenter, partager, enregistrer), légende, mots,
// aperçu des commentaires.

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { photosOf, type Memory } from "@/lib/firestore";
import { setLike, setSaved } from "@/lib/social";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUiStore } from "@/store/uiStore";
import { partnerNameOf } from "@/lib/couple";
import { haptic } from "@/lib/device";
import { smartDate } from "@/lib/time";
import { c, font } from "@/lib/tokens";
import Avatar from "@/components/ui/Avatar";
import { confirmAction } from "@/components/ui/ActionSheet";

const HEART = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z";

function ActionIcon({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="tap"
      style={{ width: 42, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: c.text, padding: 0 }}
    >
      {children}
    </button>
  );
}

export default function PostCard({
  memory,
  onOpenComments,
  onAddWord,
  priority,
}: {
  memory: Memory;
  onOpenComments: (m: Memory, focus?: boolean) => void;
  onAddWord?: (m: Memory) => void;
  priority?: boolean;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user)!;
  const patch = useDataStore((s) => s.patchMemory);
  const showToast = useUiStore((s) => s.showToast);

  const [active, setActive] = useState(0);
  const [burst, setBurst] = useState(0);
  const [bounce, setBounce] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  const partner = partnerNameOf(user.name);
  const photos = photosOf(memory);
  const isCarousel = photos.length > 1;
  const authorName = memory.createdBy === user.uid ? user.name : partner;
  const liked = memory.likes.includes(user.uid);
  const saved = memory.savedBy.includes(user.uid);
  const myKey = user.name === "Ryan" ? "ryan" : "sarah";
  const missingMine = !memory.words?.[myKey];
  const actor = { uid: user.uid, name: user.name, partnerId: user.partnerId };

  async function toggleLike(force?: boolean) {
    const next = force ? true : !liked;
    if (next === liked) return;
    haptic(next ? [8, 30, 8] : 6);
    setBounce((b) => b + 1);
    const likes = next ? [...memory.likes, user.uid] : memory.likes.filter((u) => u !== user.uid);
    patch(memory.id, { likes });
    try {
      await setLike(actor, memory.id, next, photos[0] ?? null);
    } catch {
      patch(memory.id, { likes: memory.likes });
      showToast("Action impossible hors connexion", "error");
    }
  }

  async function toggleSave() {
    const next = !saved;
    haptic(8);
    const savedBy = next ? [...memory.savedBy, user.uid] : memory.savedBy.filter((u) => u !== user.uid);
    patch(memory.id, { savedBy });
    showToast(next ? "Enregistré dans ton profil" : "Retiré des enregistrements", "info");
    try {
      await setSaved(user.uid, memory.id, next);
    } catch {
      patch(memory.id, { savedBy: memory.savedBy });
    }
  }

  async function share() {
    haptic(6);
    const text = `${memory.title} — ${memory.location}, ${smartDate(memory.date)}`;
    try {
      // Partage de la photo elle-même si le navigateur le permet
      const src = photos[active];
      if (src && navigator.canShare) {
        const blob = await fetch(src).then((r) => r.blob());
        const file = new File([blob], `${memory.title.replace(/[^\w-]+/g, "_") || "souvenir"}.jpg`, { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: memory.title, text });
          return;
        }
      }
      if (navigator.share) await navigator.share({ title: memory.title, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("Copié", "info");
      }
    } catch {
      /* partage annulé */
    }
  }

  async function remove() {
    const ok = await confirmAction({ title: "Supprimer ce souvenir ?", message: "Les photos, j'aime et commentaires seront perdus.", confirmLabel: "Supprimer", destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "memories", memory.id));
      showToast("Souvenir supprimé");
      if (window.location.pathname.startsWith("/p/")) router.replace("/home");
    } catch {
      showToast("Suppression impossible", "error");
    }
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive((cur) => (cur === idx ? cur : idx));
  }

  function onMediaTap(e: React.MouseEvent) {
    const now = e.timeStamp;
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      toggleLike(true);
      setBurst((b) => b + 1);
    } else lastTap.current = now;
  }

  const likedBy = memory.likes.map((u) => (u === user.uid ? "toi" : partner));

  return (
    <article style={{ paddingBottom: 14 }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px 8px 12px" }}>
        <Avatar name={authorName} size={34} />
        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{authorName}</p>
          {memory.lat != null ? (
            <Link href={`/map?focus=${memory.id}`} style={{ fontSize: 12, color: c.text, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {memory.location}
            </Link>
          ) : (
            <p style={{ fontSize: 12, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memory.location}</p>
          )}
        </div>
        {memory.createdBy === user.uid && (
          <ActionIcon label="Options" onClick={remove}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
            </svg>
          </ActionIcon>
        )}
      </div>

      {/* Média */}
      <div style={{ position: "relative", background: c.card }} onClick={(e) => onMediaTap(e)}>
        {photos.length === 0 ? (
          <div style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", background: "radial-gradient(120% 80% at 20% 10%, #3a1d33 0%, #151526 55%, #0b1530 100%)" }}>
            <span style={{ fontFamily: font.serif, fontSize: 34, fontWeight: 600, lineHeight: 1.15 }}>{memory.title}</span>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            onScroll={isCarousel ? onScroll : undefined}
            className="scroll-x"
            role={isCarousel ? "group" : undefined}
            aria-roledescription={isCarousel ? "carrousel" : undefined}
            aria-label={isCarousel ? `${memory.title} — ${photos.length} photos` : undefined}
            style={{ display: "flex", width: "100%", scrollSnapType: "x mandatory" }}
          >
            {photos.map((src, i) => (
              <div key={src + i} style={{ minWidth: "100%", aspectRatio: "1 / 1", maxHeight: "60vh", flexShrink: 0, scrollSnapAlign: "start", scrollSnapStop: "always", overflow: "hidden" }}>
                <img
                  src={src}
                  alt={photos.length > 1 ? `Photo ${i + 1} sur ${photos.length} : ${memory.title}` : `Photo : ${memory.title}`}
                  loading={priority && i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            ))}
          </div>
        )}

        {isCarousel && (
          <span aria-hidden="true" style={{ position: "absolute", top: 12, right: 12, background: "rgba(18,18,18,0.75)", fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "4px 9px" }}>
            {active + 1}/{photos.length}
          </span>
        )}

        {burst > 0 && (
          <span key={burst} aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", animation: "heart-pop .8s ease both" }}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill="#FFF" style={{ filter: "drop-shadow(0 6px 24px rgba(0,0,0,.45))" }}>
              <path d={HEART} />
            </svg>
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", padding: "2px 4px 0 6px", position: "relative" }}>
        <ActionIcon label={liked ? "Je n'aime plus" : "J'aime"} pressed={liked} onClick={() => toggleLike()}>
          <svg key={bounce} className={bounce ? "like-bounce" : undefined} width="26" height="26" viewBox="0 0 24 24" fill={liked ? "#FF3040" : "none"} stroke={liked ? "#FF3040" : "currentColor"} strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
            <path d={HEART} />
          </svg>
        </ActionIcon>
        <ActionIcon label="Commenter" onClick={() => onOpenComments(memory, true)}>
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.7 16.5A9 9 0 1 0 17 20.3L21.5 21z" />
          </svg>
        </ActionIcon>
        <ActionIcon label="Partager" onClick={share}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 3 9.2 10.1M22 3l-6.5 18-4.3-8.8L2.3 8.4z" />
          </svg>
        </ActionIcon>

        {isCarousel && (
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {photos.map((_, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === active ? c.blue : "#4A4A4E", transition: "background .15s" }} />
            ))}
          </div>
        )}

        <span style={{ flex: 1 }} />
        <ActionIcon label={saved ? "Retirer des enregistrements" : "Enregistrer"} pressed={saved} onClick={toggleSave}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21 12 16l-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z" />
          </svg>
        </ActionIcon>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        {likedBy.length > 0 && (
          <p style={{ fontSize: 14, fontWeight: 600 }}>
            Aimé par {likedBy.join(" et ")}
          </p>
        )}

        <p style={{ fontSize: 14, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600 }}>{authorName}</span> {memory.title}
        </p>

        {(["ryan", "sarah"] as const).map((k) =>
          memory.words?.[k] ? (
            <p key={k} style={{ fontSize: 14, lineHeight: 1.4, color: c.text }}>
              <span style={{ fontWeight: 600 }}>{k === "ryan" ? "Ryan" : "Sarah"}</span> <span style={{ color: "#E0E0E0" }}>{memory.words[k]}</span>
            </p>
          ) : null
        )}

        {memory.commentCount > 0 && (
          <button type="button" onClick={() => onOpenComments(memory)} style={{ background: "none", border: "none", padding: "2px 0", textAlign: "left", color: c.text3, fontSize: 14, cursor: "pointer" }}>
            {memory.commentCount === 1 ? "Voir le commentaire" : `Voir les ${memory.commentCount} commentaires`}
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenComments(memory, true)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "4px 0", color: c.text3, fontSize: 14, cursor: "pointer", textAlign: "left" }}
        >
          <Avatar name={user.name} size={24} />
          Ajouter un commentaire…
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 11, color: c.text3, letterSpacing: 0.3, textTransform: "uppercase" }}>{smartDate(memory.date)}</p>
          {missingMine && onAddWord && (
            <button type="button" onClick={() => onAddWord(memory)} style={{ background: "none", border: "none", padding: "6px 0", color: c.link, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              + Ajouter mon mot
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
