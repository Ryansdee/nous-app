"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import {
  getBucketList,
  addBucketItem,
  completeBucketItem,
  deleteBucketItem,
  toggleBucketItem,
  uploadPhoto,
  type BucketItem,
} from "@/lib/firestore";
import { haptic } from "@/lib/device";
import { notify } from "@/lib/social";
import { formatDate } from "@/lib/couple";
import { c, input, primaryButton } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import { confirmAction } from "@/components/ui/ActionSheet";
import { Chips, EmojiPicker, EmptyState, Field, HeaderButton, PlusIcon, Segmented, SkeletonList } from "@/components/ui/kit";

const CATEGORIES = [
  { key: "voyage", label: "Voyage", emoji: "✈️" },
  { key: "restaurant", label: "Resto", emoji: "🍽️" },
  { key: "activité", label: "Activité", emoji: "🎯" },
  { key: "autre", label: "Autre", emoji: "✨" },
] as const;

const EMOJIS = ["✈️", "🏖️", "🗺️", "🏔️", "🍽️", "🍕", "🎯", "🎨", "🎸", "🎭", "🌅", "🌃", "🎡", "🏄", "🧗", "🚴", "🎪", "🌍", "💃", "🎬"];

type Filter = "todo" | "done" | "all";

export default function BucketListPage() {
  const user = useAuthStore((s) => s.user)!;
  const showToast = useUiStore((s) => s.showToast);

  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todo");
  const [category, setCategory] = useState<string>("all");

  // Ajout
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [formCat, setFormCat] = useState<string>("voyage");
  const [emoji, setEmoji] = useState("✈️");
  const [saving, setSaving] = useState(false);

  // Accompli
  const [completing, setCompleting] = useState<BucketItem | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [completeSaving, setCompleteSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setItems(await getBucketList());
  }, []);

  useEffect(() => {
    let alive = true;
    getBucketList()
      .then((list) => alive && setItems(list))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addBucketItem({ title: title.trim(), category: formCat, emoji, addedBy: user.name });
      await load();
      haptic([10, 30, 10]);
      setTitle("");
      setFormCat("voyage");
      setEmoji("✈️");
      setShowAdd(false);
      setFilter("todo");
    } catch {
      showToast("Impossible d'ajouter", "error");
    } finally {
      setSaving(false);
    }
  }

  function closeComplete() {
    if (preview) URL.revokeObjectURL(preview);
    setCompleting(null);
    setPhoto(null);
    setPreview(null);
  }

  async function handleComplete() {
    if (!completing) return;
    setCompleteSaving(true);
    try {
      const url = photo ? await uploadPhoto(`bucketlist/${completing.id}/${Date.now()}`, photo) : null;
      await completeBucketItem(completing.id, url);
      notify({ uid: user.uid, name: user.name, partnerId: user.partnerId }, "bucket", { thumb: url, text: completing.title });
      await load();
      haptic([10, 40, 10, 40, 10]);
      showToast("Bravo, c'est fait ! 🎉");
      closeComplete();
    } catch {
      showToast("Échec de l'enregistrement", "error");
    } finally {
      setCompleteSaving(false);
    }
  }

  async function handleUndo(item: BucketItem) {
    const ok = await confirmAction({ title: item.title, confirmLabel: "Remettre « à faire »" });
    if (!ok) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: false, doneAt: null } : i)));
    await toggleBucketItem(item.id, false).catch(() => load());
  }

  async function handleDelete(item: BucketItem) {
    const ok = await confirmAction({ title: item.title, confirmLabel: "Supprimer de la liste", destructive: true });
    if (!ok) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteBucketItem(item.id).catch(() => load());
  }

  const filtered = items
    .filter((i) => (filter === "all" ? true : filter === "done" ? i.done : !i.done))
    .filter((i) => (category === "all" ? true : i.category === category));

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <Screen
      transition="push"
      onRefresh={load}
      header={
        <PageHeader
          back={{ href: "/profile", label: "Profil" }}
          title="Bucket list"
          subtitle={total > 0 ? `${doneCount} sur ${total} accomplis · ${Math.round(progress)} %` : undefined}
          right={<HeaderButton label="Ajouter un rêve" onClick={() => setShowAdd(true)}><PlusIcon /></HeaderButton>}
        >
          {total > 0 && (
            <div role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progression" style={{ height: 4, background: c.card2, borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: c.green, borderRadius: 2, transition: "width .5s" }} />
            </div>
          )}
          <Segmented
            label="Statut"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todo", label: `À faire (${total - doneCount})` },
              { value: "done", label: `Fait (${doneCount})` },
              { value: "all", label: "Tout" },
            ]}
          />
        </PageHeader>
      }
    >
      <div style={{ padding: "14px 16px 0" }}>
        <Chips
          label="Catégorie"
          value={category}
          onChange={setCategory}
          options={[{ value: "all", label: "Toutes" }, ...CATEGORIES.map((c) => ({ value: c.key as string, label: `${c.emoji} ${c.label}` }))]}
        />
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <SkeletonList rows={5} height={68} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={filter === "done" ? "🏁" : "✨"}
            title={filter === "done" ? "Rien d'accompli ici… encore" : "Aucun rêve ici"}
            text={filter === "done" ? "Coche un rêve quand vous l'avez réalisé." : "Ajoutez ce que vous voulez vivre ensemble."}
            action={filter !== "done" ? <button type="button" className="tap" style={{ ...primaryButton, width: "auto", padding: "0 22px" }} onClick={() => setShowAdd(true)}>Ajouter un rêve</button> : undefined}
          />
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((item) => {
              const cat = CATEGORIES.find((k) => k.key === item.category);
              return (
                <li key={item.id} style={{ background: c.card, borderRadius: 16, overflow: "hidden" }}>
                  {item.done && item.donePhotoUrl && (
                    <div style={{ height: 170, position: "relative" }}>
                      <img src={item.donePhotoUrl} alt={item.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <span style={{ position: "absolute", bottom: 10, left: 12, background: "rgba(48,209,88,0.95)", borderRadius: 8, padding: "3px 9px", fontSize: 12, fontWeight: 700, color: "#000" }}>✓ Accompli</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 4px 6px 4px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.done) handleUndo(item);
                        else {
                          haptic(8);
                          setCompleting(item);
                        }
                      }}
                      aria-label={item.done ? `${item.title} : accompli. Remettre à faire` : `Marquer « ${item.title} » comme accompli`}
                      className="tap"
                      style={{ width: 48, height: 48, flexShrink: 0, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <span style={{ width: 28, height: 28, borderRadius: "50%", border: item.done ? "none" : "2px solid #545458", background: item.done ? c.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>
                        {item.done && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                      </span>
                    </button>
                    <span aria-hidden="true" style={{ fontSize: 24, flexShrink: 0 }}>{item.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0, padding: "6px 4px" }}>
                      <p style={{ fontSize: 16, fontWeight: 600, textDecoration: item.done ? "line-through" : "none", color: item.done ? c.text2 : c.text, lineHeight: 1.3 }}>{item.title}</p>
                      <p style={{ fontSize: 13, color: c.text3, marginTop: 2 }}>
                        {cat?.label ?? "Autre"} · {item.addedBy}
                        {item.done && item.doneAt && <span style={{ color: c.green }}> · {formatDate(item.doneAt, { day: "numeric", month: "short", year: "numeric" })}</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleDelete(item)} aria-label={`Supprimer ${item.title}`} className="tap" style={{ width: 44, height: 44, flexShrink: 0, background: "none", border: "none", color: "#636366", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Ajout */}
      <Sheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nouveau rêve"
        locked={saving}
        footer={
          <button type="button" onClick={handleAdd} disabled={saving || !title.trim()} className="tap" style={primaryButton}>
            {saving ? "Ajout…" : "Ajouter à notre liste"}
          </button>
        }
      >
        <Field id="b-title" label="Le rêve">
          <input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Voir le soleil se lever au Mont-Blanc" autoComplete="off" style={input} />
        </Field>
        <Field label="Catégorie">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {CATEGORIES.map((k) => {
              const active = formCat === k.key;
              return (
                <button
                  key={k.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    haptic(6);
                    setFormCat(k.key);
                    setEmoji(k.emoji);
                  }}
                  className="tap"
                  style={{ minHeight: 64, borderRadius: 14, border: active ? "2px solid #FFF" : "2px solid transparent", background: active ? c.card3 : c.card2, color: "#FFF", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <span style={{ fontSize: 22 }}>{k.emoji}</span>
                  <span style={{ fontSize: 12, color: active ? "#FFF" : c.text2 }}>{k.label}</span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Icône" style={{ marginBottom: 0 }}>
          <EmojiPicker value={emoji} onChange={setEmoji} emojis={EMOJIS} />
        </Field>
      </Sheet>

      {/* Accompli */}
      <Sheet
        open={!!completing}
        onClose={closeComplete}
        eyebrow="C'est fait ?"
        title={completing ? `${completing.emoji} ${completing.title}` : ""}
        locked={completeSaving}
        footer={
          <button type="button" onClick={handleComplete} disabled={completeSaving} className="tap" style={{ ...primaryButton, background: c.green, color: "#000" }}>
            {completeSaving ? "Enregistrement…" : "✓ Marquer comme accompli"}
          </button>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (preview) URL.revokeObjectURL(preview);
            setPhoto(f);
            setPreview(URL.createObjectURL(f));
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="tap"
          style={{ width: "100%", height: preview ? 220 : 150, borderRadius: 16, overflow: "hidden", border: preview ? "none" : "1.5px dashed #48484A", background: c.card2, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 0, color: c.link }}
        >
          {preview ? (
            <img src={preview} alt="Aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <>
              <span style={{ fontSize: 30 }} aria-hidden="true">📸</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Ajouter une photo souvenir</span>
              <span style={{ fontSize: 13, color: c.text3 }}>Optionnel</span>
            </>
          )}
        </button>
      </Sheet>
    </Screen>
  );
}
