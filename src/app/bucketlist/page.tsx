"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth, db, storage } from "@/lib/firebase";
import { getBucketList, addBucketItem, completeBucketItem, deleteBucketItem, BucketItem } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const CATEGORIES = [
  { key: "voyage", label: "Voyage", emoji: "✈️" },
  { key: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { key: "activité", label: "Activité", emoji: "🎯" },
  { key: "autre", label: "Autre", emoji: "✨" },
];

const EMOJIS = ["✈️", "🏖️", "🗺️", "🏔️", "🍽️", "🍕", "🎯", "🎨", "🎸", "🎭", "🌅", "🌃", "🎡", "🏄", "🧗", "🚴", "🎪", "🌍", "💃", "🎬"];

export default function BucketListPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("voyage");
  const [formEmoji, setFormEmoji] = useState("✈️");
  const [formLoading, setFormLoading] = useState(false);

  // Complete modal
  const [showComplete, setShowComplete] = useState<BucketItem | null>(null);
  const [completePhoto, setCompletePhoto] = useState<File | null>(null);
  const [completePhotoPreview, setCompletePhotoPreview] = useState<string | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    getBucketList().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

  async function handleAdd() {
    if (!user || !formTitle) return;
    setFormLoading(true);
    try {
      await addBucketItem({
        title: formTitle,
        category: formCategory,
        emoji: formEmoji,
        addedBy: user.name,
      });
      setItems(await getBucketList());
      setFormTitle("");
      setFormCategory("voyage");
      setFormEmoji("✈️");
      setShowAdd(false);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleComplete(item: BucketItem) {
    setCompleteLoading(true);
    try {
      let photoUrl: string | null = null;
      if (completePhoto) {
        const storageRef = ref(storage, `bucketlist/${item.id}/${completePhoto.name}`);
        await uploadBytes(storageRef, completePhoto);
        photoUrl = await getDownloadURL(storageRef);
      }
      await completeBucketItem(item.id, photoUrl);
      setItems(await getBucketList());
      setShowComplete(null);
      setCompletePhoto(null);
      setCompletePhotoPreview(null);
    } finally {
      setCompleteLoading(false);
    }
  }

  async function handleDelete(itemId: string) {
    await deleteBucketItem(itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  if (!user || loading) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0C" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const filtered = items
    .filter(i => filter === "all" ? true : filter === "done" ? i.done : !i.done)
    .filter(i => categoryFilter === "all" ? true : i.category === categoryFilter);

  const doneCount = items.filter(i => i.done).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0A0A0C", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "60px 20px 16px", borderBottom: "1px solid #1C1C1E" }}>
        <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
          Ryan & Sarah
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5, marginBottom: 16 }}>
          Bucket List
        </h1>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <p style={{ fontSize: 13, color: "#8E8E93" }}>{doneCount} / {totalCount} accomplis</p>
            <p style={{ fontSize: 13, color: "#30D158", fontWeight: 600 }}>{Math.round(progress)}%</p>
          </div>
          <div style={{ height: 4, background: "#2C2C2E", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #30D158, #34C759)", borderRadius: 2, transition: "width 0.5s" }} />
          </div>
        </div>

        {/* Filtres todo/done */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "all", label: `Tout (${totalCount})` },
            { key: "todo", label: `À faire (${totalCount - doneCount})` },
            { key: "done", label: `Fait (${doneCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: filter === f.key ? "#FFF" : "#1C1C1E", color: filter === f.key ? "#000" : "#8E8E93", fontSize: 12, fontWeight: filter === f.key ? 600 : 400, cursor: "pointer" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ padding: "16px 20px", paddingBottom: 100 }}>

          {/* Filtre catégorie */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            <button
              onClick={() => setCategoryFilter("all")}
              style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, background: categoryFilter === "all" ? "#1C1C1E" : "transparent", color: categoryFilter === "all" ? "#FFF" : "#636366", fontSize: 12, fontWeight: 500, cursor: "pointer", border: categoryFilter === "all" ? "1px solid #3A3A3C" : "1px solid transparent" }}
            >
              Toutes
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(c.key)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: categoryFilter === c.key ? "1px solid #3A3A3C" : "1px solid transparent", background: categoryFilter === c.key ? "#1C1C1E" : "transparent", color: categoryFilter === c.key ? "#FFF" : "#636366", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          {/* Liste */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#1C1C1E", borderRadius: 16 }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>✨</p>
              <p style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500, marginBottom: 4 }}>Aucun élément</p>
              <p style={{ fontSize: 13, color: "#636366" }}>Ajoutez des rêves à accomplir ensemble</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  style={{ background: "#1C1C1E", borderRadius: 16, overflow: "hidden", opacity: item.done ? 0.75 : 1 }}
                >
                  {/* Photo si complété avec photo */}
                  {item.done && item.donePhotoUrl && (
                    <div style={{ height: 160, overflow: "hidden", position: "relative" }}>
                      <img src={item.donePhotoUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(28,28,30,0.8), transparent)" }} />
                      <div style={{ position: "absolute", bottom: 10, left: 12, background: "rgba(48,209,88,0.9)", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, color: "#000" }}>
                        ✓ Accompli
                      </div>
                    </div>
                  )}

                  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => !item.done && setShowComplete(item)}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: item.done ? "none" : "2px solid #3A3A3C", background: item.done ? "#30D158" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: item.done ? "default" : "pointer", flexShrink: 0, fontSize: 14 }}
                    >
                      {item.done && "✓"}
                    </button>

                    {/* Emoji + contenu */}
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{item.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, color: "#FFF", fontWeight: 600, textDecoration: item.done ? "line-through" : "none", marginBottom: 2 }}>
                        {item.title}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 11, color: "#636366" }}>
                          {CATEGORIES.find(c => c.key === item.category)?.emoji} {CATEGORIES.find(c => c.key === item.category)?.label}
                        </p>
                        <p style={{ fontSize: 11, color: "#48484A" }}>· par {item.addedBy}</p>
                      </div>
                      {item.done && item.doneAt && (
                        <p style={{ fontSize: 11, color: "#30D158", marginTop: 2 }}>
                          ✓ {item.doneAt.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: "none", border: "none", color: "#FF453A", fontSize: 16, cursor: "pointer", padding: "4px", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        style={{ position: "fixed", bottom: 80, right: 20, width: 54, height: 54, borderRadius: "50%", background: "#FFF", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 50, color: "#000" }}
      >
        +
      </button>

      {/* ADD MODAL */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C1C1E", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", maxHeight: "88dvh", overflowY: "auto", borderTop: "1px solid #2C2C2E" }}>
            <div style={{ width: 40, height: 5, background: "#48484A", borderRadius: 2.5, margin: "0 auto 20px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 20, letterSpacing: -0.3 }}>Nouveau rêve</h2>

            {/* Catégorie */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 8, letterSpacing: 0.3 }}>Catégorie</label>
              <div style={{ display: "flex", gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => { setFormCategory(c.key); setFormEmoji(c.emoji); }}
                    style={{ flex: 1, padding: "10px 4px", borderRadius: 12, border: formCategory === c.key ? "1px solid #FFF" : "1px solid #3A3A3C", background: formCategory === c.key ? "#2C2C2E" : "#1C1C1E", color: "#FFF", fontSize: 11, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                  >
                    <span style={{ fontSize: 18 }}>{c.emoji}</span>
                    <span style={{ color: formCategory === c.key ? "#FFF" : "#636366" }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 8, letterSpacing: 0.3 }}>Emoji</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setFormEmoji(e)}
                    style={{ width: 40, height: 40, borderRadius: 10, background: formEmoji === e ? "#3A3A3C" : "#2C2C2E", border: formEmoji === e ? "2px solid #FFF" : "1px solid transparent", fontSize: 20, cursor: "pointer" }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>Description</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Voir le soleil se lever au Mont-Blanc"
                style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 15, outline: "none" }}
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={formLoading || !formTitle}
              style={{ width: "100%", padding: "14px 0", background: "#0A84FF", border: "none", borderRadius: 12, color: "#FFF", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: formLoading || !formTitle ? 0.4 : 1 }}
            >
              {formLoading ? "Ajout..." : "Ajouter à notre liste"}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETE MODAL */}
      {showComplete && (
        <div onClick={() => { setShowComplete(null); setCompletePhoto(null); setCompletePhotoPreview(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C1C1E", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", borderTop: "1px solid #2C2C2E" }}>
            <div style={{ width: 40, height: 5, background: "#48484A", borderRadius: 2.5, margin: "0 auto 20px" }} />
            <p style={{ fontSize: 11, color: "#30D158", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>Marquer comme accompli</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 20, letterSpacing: -0.3 }}>
              {showComplete.emoji} {showComplete.title}
            </h2>

            {/* Photo optionnelle */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCompletePhoto(file);
              setCompletePhotoPreview(URL.createObjectURL(file));
            }} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", height: 140, borderRadius: 12, marginBottom: 20, overflow: "hidden", cursor: "pointer", background: "#2C2C2E", border: "1px dashed #48484A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {completePhotoPreview ? (
                <img src={completePhotoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <span style={{ fontSize: 13, color: "#0A84FF", fontWeight: 500 }}>Ajouter une photo souvenir</span>
                  <span style={{ fontSize: 11, color: "#8E8E93" }}>Optionnel</span>
                </>
              )}
            </div>

            <button
              onClick={() => handleComplete(showComplete)}
              disabled={completeLoading}
              style={{ width: "100%", padding: "14px 0", background: "#30D158", border: "none", borderRadius: 12, color: "#000", fontSize: 16, fontWeight: 700, cursor: "pointer", opacity: completeLoading ? 0.4 : 1 }}
            >
              {completeLoading ? "Enregistrement..." : "✓ C'est fait !"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}