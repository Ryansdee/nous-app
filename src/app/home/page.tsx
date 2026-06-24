"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { getUser, getMemories, Memory } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase";
import { addDoc, collection, Timestamp, updateDoc, doc } from "firebase/firestore";
import MemoryPreview from "@/components/MemoryPreview";

function getDaysUntil(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (next <= today) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function getDaysTogether(since: Date): number {
  const today = new Date();
  const start = new Date(since.getFullYear(), since.getMonth(), since.getDate());
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now.getTime() - start.getTime()) / 86400000);
}

const TOGETHER_SINCE = new Date(2021, 11, 22);

// Toutes les photos d'un souvenir, ancien (photoUrl) comme nouveau (photoUrls)
function getPhotos(m: Memory): string[] {
  const multi = (m as Memory & { photoUrls?: string[] }).photoUrls;
  if (multi && multi.length) return multi;
  return m.photoUrl ? [m.photoUrl] : [];
}

function authorOfGroup(items: Memory[]): { name: string; color: string } | null {
  if (items.some((i) => i.words?.ryan)) return { name: "Ryan", color: "#0A84FF" };
  if (items.some((i) => i.words?.sarah)) return { name: "Sarah", color: "#FF2D55" };
  return null;
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, color: "#8E8E93", textTransform: "uppercase",
  fontWeight: 600, marginBottom: 6, letterSpacing: 0.3,
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C",
  borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 16,
};

// ──────────────────────────────────────────────────────────────
// Post du feed. Le carrousel se construit à partir de TOUTES les
// photos des souvenirs du groupe (un souvenir multi-photos suffit).
// ──────────────────────────────────────────────────────────────
function FeedPost({ items, isLiked, onToggleLike }: {
  items: Memory[];
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const head = items[0];
  const photos = items.flatMap(getPhotos);
  const isCarousel = photos.length > 1;
  const author = authorOfGroup(items);
  const yearsAgo = new Date().getFullYear() - head.date.getFullYear();
  const ryanWords = items.map((i) => i.words?.ryan).filter(Boolean) as string[];
  const sarahWords = items.map((i) => i.words?.sarah).filter(Boolean) as string[];

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive((cur) => (cur === idx ? cur : idx));
  }

  return (
    <article style={{ borderBottom: "1px solid #1C1C1E", marginBottom: 4 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
        <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#FFF", background: author ? author.color : "#3A3A3C", backgroundImage: author ? undefined : "linear-gradient(45deg,#FF2D55,#0A84FF)" }}>
          {author ? author.name[0] : "N"}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{head.location}</p>
          <p style={{ fontSize: 12, color: "#8E8E93" }}>
            {head.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {yearsAgo > 0 && (
          <span style={{ fontSize: 12, color: "#FFD60A", fontWeight: 600, flexShrink: 0 }}>Il y a {yearsAgo} an{yearsAgo > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Média */}
      {isCarousel ? (
        <div style={{ position: "relative" }}>
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            tabIndex={0}
            role="group"
            aria-roledescription="carrousel"
            aria-label={`${head.title} — ${photos.length} photos`}
            style={{ display: "flex", overflowX: "auto", width: "100%", aspectRatio: "4 / 5", scrollSnapType: "x mandatory", scrollbarWidth: "none", background: "#1C1C1E" } as React.CSSProperties}
          >
            {photos.map((src, i) => (
              <div key={i} style={{ minWidth: "100%", height: "100%", scrollSnapAlign: "start", flexShrink: 0 }}>
                <img src={src} alt={`Photo ${i + 1} sur ${photos.length} : ${head.title}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
          <span aria-hidden="true" style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "#FFF", fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "3px 9px", backdropFilter: "blur(4px)" }}>
            {active + 1}/{photos.length}
          </span>
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "4 / 5", background: "#1C1C1E", position: "relative" }}>
          {photos[0] ? (
            <img src={photos[0]} alt={`Photo : ${head.title}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#8E8E93", fontSize: 14 }}>Pas de photo</span>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {isCarousel && (
        <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 5, padding: "8px 0 2px" }}>
          {photos.map((_, i) => (
            <span key={i} style={{ width: i === active ? 7 : 5, height: i === active ? 7 : 5, borderRadius: "50%", background: i === active ? "#0A84FF" : "#48484A", transition: "all 0.15s ease" }} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 8px" }}>
        <button type="button" onClick={onToggleLike} aria-pressed={isLiked} aria-label={isLiked ? "Retirer le like" : "Aimer ce souvenir"} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: isLiked ? "#FF2D55" : "#FFF" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
      </div>

      {/* Légende + mots */}
      <div style={{ padding: "0 14px 14px" }}>
        <p style={{ fontSize: 14, color: "#FFF", lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>{head.title}</span>
        </p>
        {(ryanWords.length > 0 || sarahWords.length > 0) && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {ryanWords.map((w, i) => (
              <p key={`r${i}`} style={{ fontSize: 14, color: "#E5E5EA", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: "#409CFF" }}>Ryan</span> {w}
              </p>
            ))}
            {sarahWords.map((w, i) => (
              <p key={`s${i}`} style={{ fontSize: 14, color: "#E5E5EA", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: "#FF6482" }}>Sarah</span> {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [partnerBirthday, setPartnerBirthday] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formWord, setFormWord] = useState("");
  const [formPhotos, setFormPhotos] = useState<File[]>([]);
  const [formPreviews, setFormPreviews] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user?.partnerId) return;
    getUser(user.partnerId).then((data) => {
      if (data?.birthday) {
        const d = data.birthday.toDate();
        setPartnerBirthday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    });
  }, [user?.partnerId]);

  useEffect(() => {
    if (!user) return;
    getMemories().then((m) => {
      setMemories(m);
      setLoadingMemories(false);
    });
  }, [user]);

  useEffect(() => {
    if (!showAddModal) return;
    modalRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowAddModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddModal]);

  const yearStories = useMemo(() => {
    const map = new Map<number, Memory>();
    for (const m of memories) {
      const y = m.date.getFullYear();
      const cur = map.get(y);
      if (!cur || m.date > cur.date) map.set(y, m);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [memories]);

  const feed = useMemo(() => {
    const list = yearFilter === "all"
      ? memories
      : memories.filter((m) => m.date.getFullYear() === yearFilter);
    return [...list].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [memories, yearFilter]);

  const feedGroups = useMemo(() => {
    const groups = new Map<string, Memory[]>();
    for (const m of feed) {
      const dayKey = `${m.date.getFullYear()}-${m.date.getMonth()}-${m.date.getDate()}`;
      const key = `${dayKey}|${m.title.trim().toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return [...groups.entries()];
  }, [feed]);

  function toggleLike(id: string) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Multi-fichiers : on ajoute à la sélection existante
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setFormPhotos((prev) => [...prev, ...files]);
    setFormPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = ""; // permet de re-sélectionner le même fichier
  }

  function removePhoto(index: number) {
    setFormPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setFormPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    formPreviews.forEach((u) => URL.revokeObjectURL(u));
    setFormTitle(""); setFormLocation(""); setFormDate(new Date().toISOString().split("T")[0]);
    setFormWord(""); setFormPhotos([]); setFormPreviews([]);
    setFormLat(null); setFormLng(null); setUploadProgress(null);
  }

  async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
        { headers: { "Accept-Language": "fr" } }
      );
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    if (!user || !formTitle || !formLocation || !formDate) return;
    setFormLoading(true);
    try {
      let lat = formLat;
      let lng = formLng;
      if (!lat || !lng) {
        const coords = await geocodeLocation(formLocation);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }

      const docRef = await addDoc(collection(db, "memories"), {
        title: formTitle,
        location: formLocation,
        date: Timestamp.fromDate(new Date(formDate)),
        photoUrl: null,
        photoUrls: [],
        lat, lng,
        isSpecial: !!formWord,
        words: {
          ryan: user.name === "Ryan" ? formWord || null : null,
          sarah: user.name === "Sarah" ? formWord || null : null,
        },
        createdBy: user.uid,
        createdAt: Timestamp.now(),
      });

      // Upload de toutes les photos, en conservant l'ordre de sélection
      if (formPhotos.length > 0) {
        setUploadProgress({ done: 0, total: formPhotos.length });
        const urls: string[] = [];
        for (let i = 0; i < formPhotos.length; i++) {
          const file = formPhotos[i];
          const storageRef = ref(storage, `memories/${docRef.id}/${i}-${file.name}`);
          await uploadBytes(storageRef, file);
          urls.push(await getDownloadURL(storageRef));
          setUploadProgress({ done: i + 1, total: formPhotos.length });
        }
        // photoUrl = couverture (1ʳᵉ) pour compat ; photoUrls = toutes
        await updateDoc(doc(db, "memories", docRef.id), { photoUrl: urls[0] ?? null, photoUrls: urls });
      }

      const updated = await getMemories();
      setMemories(updated);
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
      setUploadProgress(null);
    }
  }

  if (!user) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const partnerName = user.name === "Ryan" ? "Sarah" : "Ryan";
  const daysTogether = getDaysTogether(TOGETHER_SINCE);
  const daysUntilAnniversary = getDaysUntil(TOGETHER_SINCE);
  const todayMemory = memories.find((m) => {
    const now = new Date();
    return m.date.getMonth() === now.getMonth() && m.date.getDate() === now.getDate();
  });

  const submitLabel = uploadProgress
    ? `Envoi ${uploadProgress.done}/${uploadProgress.total}...`
    : formLoading ? "Enregistrement..." : "Publier le souvenir";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#000", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* ── APP BAR ── */}
      <header style={{ flexShrink: 0, padding: "max(14px, env(safe-area-inset-top)) 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1C1C1E" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#FFF", letterSpacing: -0.5, fontFamily: "var(--font-serif), serif", lineHeight: 1 }}>
            Nous <span aria-hidden="true" style={{ color: "#FF2D55", fontSize: 18 }}>✦</span>
          </h1>
          <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>
            {daysTogether.toLocaleString("fr-BE")} jours ensemble · 💍 dans {daysUntilAnniversary} j
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" onClick={() => setShowAddModal(true)} aria-label="Ajouter un souvenir" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#FFF" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" />
            </svg>
          </button>
          <button type="button" onClick={() => auth.signOut().then(() => router.push("/login"))} aria-label="Se déconnecter" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#FFF" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── SCROLL ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

        {yearStories.length > 0 && (
          <div role="group" aria-label="Filtrer par année" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "16px", borderBottom: "1px solid #1C1C1E", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <button type="button" onClick={() => setShowAddModal(true)} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, width: 64 }}>
              <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", border: "2px dashed #3A3A3C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#8E8E93", fontWeight: 300 }}>+</span>
              <span style={{ fontSize: 12, color: "#AEAEB2" }}>Ajouter</span>
            </button>

            <button type="button" onClick={() => setYearFilter("all")} aria-pressed={yearFilter === "all"} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, width: 64 }}>
              <span style={{ width: 64, height: 64, borderRadius: "50%", padding: 3, background: yearFilter === "all" ? "linear-gradient(45deg,#FF2D55,#0A84FF)" : "transparent", border: yearFilter === "all" ? "none" : "2px solid #3A3A3C", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#1C1C1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }} aria-hidden="true">✦</span>
              </span>
              <span style={{ fontSize: 12, color: yearFilter === "all" ? "#FFF" : "#AEAEB2", fontWeight: yearFilter === "all" ? 600 : 400 }}>Tout</span>
            </button>

            {yearStories.map(([year, cover]) => {
              const active = yearFilter === year;
              return (
                <button key={year} type="button" onClick={() => setYearFilter(active ? "all" : year)} aria-pressed={active} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, width: 64 }}>
                  <span style={{ width: 64, height: 64, borderRadius: "50%", padding: 3, background: active ? "linear-gradient(45deg,#FF2D55,#FFD60A,#0A84FF)" : "transparent", border: active ? "none" : "2px solid #3A3A3C", display: "block", boxSizing: "border-box" }}>
                    <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#2C2C2E", border: "2px solid #000", boxSizing: "border-box" }}>
                      {cover.photoUrl
                        ? <img src={cover.photoUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#8E8E93" }} aria-hidden="true">{String(year).slice(2)}</span>}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: active ? "#FFF" : "#AEAEB2", fontWeight: active ? 600 : 400 }}>{year}</span>
                </button>
              );
            })}
          </div>
        )}

        {todayMemory && yearFilter === "all" && (
          <div style={{ margin: "16px 16px 0", background: "#1C1C1E", borderRadius: 14, padding: 14, display: "flex", gap: 12, alignItems: "center", border: "1px solid #2C2C2E" }}>
            {todayMemory.photoUrl && (
              <img src={todayMemory.photoUrl} alt="" loading="lazy" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, color: "#FFD60A", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Ce jour-là</p>
              <p style={{ fontSize: 15, color: "#FFF", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{todayMemory.title}</p>
              <p style={{ fontSize: 13, color: "#AEAEB2" }}>{todayMemory.location}</p>
            </div>
          </div>
        )}

        {/* ── FEED ── */}
        <div style={{ paddingBottom: 100 }}>
          <MemoryPreview memories={memories} />
          {loadingMemories ? (
            <p style={{ fontSize: 14, color: "#8E8E93", textAlign: "center", padding: "60px 0" }}>Chargement...</p>
          ) : feedGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <p style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500, marginBottom: 4 }}>Aucun souvenir{yearFilter !== "all" ? ` en ${yearFilter}` : " encore"}</p>
              <p style={{ fontSize: 13, color: "#8E8E93" }}>Touche + pour en ajouter un.</p>
            </div>
          ) : (
            feedGroups.map(([key, items]) => (
              <FeedPost key={key} items={items} isLiked={liked.has(items[0].id)} onToggleLike={() => toggleLike(items[0].id)} />
            ))
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="add-memory-title" tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ background: "#1C1C1E", borderRadius: "20px 20px 0 0", padding: "20px 20px max(48px, env(safe-area-inset-bottom))", width: "100%", maxHeight: "88dvh", overflowY: "auto", borderTop: "1px solid #2C2C2E", outline: "none" }}>
            <div aria-hidden="true" style={{ width: 40, height: 5, background: "#48484A", borderRadius: 2.5, margin: "0 auto 20px" }} />
            <h2 id="add-memory-title" style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 20, letterSpacing: -0.3 }}>Nouveau souvenir</h2>

            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoChange} />

            {/* Zone photos : dropzone si vide, sinon vignettes + bouton "ajouter" */}
            {formPreviews.length === 0 ? (
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Ajouter des photos" style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: 20, overflow: "hidden", cursor: "pointer", background: "#2C2C2E", border: "1px dashed #48484A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 0, font: "inherit" }}>
                <span style={{ fontSize: 13, color: "#409CFF", fontWeight: 500 }}>Ajouter des photos</span>
                <span style={{ fontSize: 12, color: "#8E8E93" }}>Plusieurs possibles · JPG ou PNG</span>
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingTop: 6, paddingBottom: 4, WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                {formPreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                    <img src={src} alt={`Photo ${i + 1}`} style={{ width: 88, height: 88, borderRadius: 10, objectFit: "cover", display: "block" }} />
                    {i === 0 && (
                      <span aria-label="Couverture" style={{ position: "absolute", bottom: 4, left: 4, fontSize: 10, fontWeight: 600, color: "#FFF", background: "rgba(0,0,0,0.65)", borderRadius: 6, padding: "2px 6px" }}>Couverture</span>
                    )}
                    <button type="button" onClick={() => removePhoto(i)} aria-label={`Retirer la photo ${i + 1}`} style={{ position: "absolute", top: -7, right: -7, width: 26, height: 26, borderRadius: "50%", background: "#000", border: "1px solid #48484A", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Ajouter d'autres photos" style={{ width: 88, height: 88, flexShrink: 0, borderRadius: 10, border: "1px dashed #48484A", background: "#2C2C2E", color: "#409CFF", fontSize: 28, fontWeight: 300, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
            )}

            {[
              { label: "Titre", id: "memory-title", value: formTitle, set: setFormTitle, placeholder: "Ex: Weekend à Bruges", onBlur: undefined },
              { label: "Lieu", id: "memory-location", value: formLocation, set: setFormLocation, placeholder: "Ex: Bruges, Belgique", onBlur: async () => {
                if (formLocation && !formLat) {
                  const coords = await geocodeLocation(formLocation);
                  if (coords) { setFormLat(coords.lat); setFormLng(coords.lng); }
                }
              }},
            ].map(({ label, id, value, set, placeholder, onBlur }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label htmlFor={id} style={labelStyle}>{label}</label>
                <input id={id} value={value} onChange={(e) => set(e.target.value)} onBlur={onBlur} placeholder={placeholder} style={inputStyle} />
                {label === "Lieu" && formLat && (
                  <p role="status" style={{ fontSize: 12, color: "#30D158", marginTop: 4 }}>📍 Position trouvée automatiquement</p>
                )}
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="memory-date" style={labelStyle}>Date</label>
              <input id="memory-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} />
            </div>

            <button type="button" onClick={() => navigator.geolocation.getCurrentPosition((pos) => { setFormLat(pos.coords.latitude); setFormLng(pos.coords.longitude); }, () => {})} style={{ width: "100%", padding: "12px", minHeight: 44, background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, color: formLat ? "#30D158" : "#AEAEB2", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 14 }}>
              {formLat ? "📍 Position GPS enregistrée" : "📍 Utiliser ma position GPS (optionnel)"}
            </button>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="memory-word" style={labelStyle}>Mon mot (optionnel)</label>
              <textarea id="memory-word" value={formWord} onChange={(e) => setFormWord(e.target.value)} placeholder="Ce que ce moment signifie pour toi..." style={{ ...inputStyle, resize: "none", height: 80, lineHeight: 1.4 }} />
              <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 6 }}>{partnerName} pourra ajouter son mot depuis son compte.</p>
            </div>

            <button type="button" onClick={handleSubmit} disabled={formLoading || !formTitle || !formLocation} style={{ width: "100%", padding: "14px 0", background: "#0A84FF", border: "none", borderRadius: 12, color: "#FFF", fontSize: 16, fontWeight: 600, cursor: formLoading || !formTitle || !formLocation ? "default" : "pointer", opacity: formLoading || !formTitle || !formLocation ? 0.4 : 1, transition: "opacity 0.2s" }}>
              {submitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}