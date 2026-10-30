"use client";
// « Nouveau souvenir » — accessible partout via le + central de la tab bar.

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { createMemory } from "@/lib/firestore";
import { notify } from "@/lib/social";
import { useRouter } from "next/navigation";
import { currentPosition, geocode, haptic, reverseGeocode } from "@/lib/device";
import { partnerNameOf } from "@/lib/couple";
import { c, input, primaryButton } from "@/lib/tokens";
import Sheet from "@/components/ui/Sheet";
import { Field } from "@/components/ui/kit";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddMemorySheet() {
  const open = useUiStore((s) => s.addMemoryOpen);
  const close = useUiStore((s) => s.closeAddMemory);
  const showToast = useUiStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(todayISO());
  const [word, setWord] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Libère les URLs d'aperçu au démontage
  const previewsRef = useRef<string[]>([]);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function reset() {
    setTitle("");
    setLocation("");
    setDate(todayISO());
    setWord("");
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPhotos([]);
    setPreviews([]);
    setCoords(null);
    setProgress(null);
  }

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!files.length) return;
    haptic(6);
    setPhotos((p) => [...p, ...files]);
    setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
  }

  function removePhoto(i: number) {
    haptic(6);
    URL.revokeObjectURL(previews[i]);
    setPhotos((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => p.filter((_, j) => j !== i));
  }

  async function useGps() {
    setLocating(true);
    const pos = await currentPosition();
    setLocating(false);
    if (!pos) {
      showToast("Position indisponible", "error");
      return;
    }
    haptic(8);
    setCoords(pos);
    if (!location.trim()) {
      const name = await reverseGeocode(pos.lat, pos.lng);
      if (name) setLocation(name);
    }
  }

  async function onLocationBlur() {
    if (location.trim() && !coords) {
      const r = await geocode(location);
      if (r) setCoords(r);
    }
  }

  const canSubmit = !!user && title.trim().length > 0 && location.trim().length > 0 && !saving;

  async function submit() {
    if (!canSubmit || !user) return;
    setSaving(true);
    try {
      let pos = coords;
      if (!pos) pos = await geocode(location);
      const [y, m, d] = date.split("-").map(Number);
      const { id, cover } = await createMemory(
        {
          title: title.trim(),
          location: location.trim(),
          date: new Date(y, m - 1, d, 12),
          lat: pos?.lat ?? null,
          lng: pos?.lng ?? null,
          word: word.trim() || null,
          authorName: user.name,
          createdBy: user.uid,
        },
        photos,
        (done, total) => setProgress({ done, total })
      );
      haptic([10, 30, 10]);
      notify({ uid: user.uid, name: user.name, partnerId: user.partnerId }, "post", { memoryId: id, text: title.trim(), thumb: cover });
      reset();
      close();
      showToast("Publié ✦");
      if (window.location.pathname !== "/home") router.push("/home");
    } catch (e) {
      console.error(e);
      showToast("Échec de l'envoi. Réessaie.", "error");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const partnerName = partnerNameOf(user?.name);
  const submitLabel = progress
    ? `Envoi des photos ${progress.done}/${progress.total}…`
    : saving
      ? "Publication…"
      : "Partager";

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Nouvelle publication"
      size="full"
      locked={saving}
      footer={
        <button type="button" onClick={submit} disabled={!canSubmit} className="tap" style={primaryButton}>
          {submitLabel}
        </button>
      }
    >
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addFiles} />

      {/* Photos */}
      {previews.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="tap"
          style={{
            width: "100%",
            height: 150,
            borderRadius: 16,
            marginBottom: 18,
            border: "1.5px dashed #48484A",
            background: c.card2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            color: c.link,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Ajouter des photos</span>
          <span style={{ fontSize: 13, color: c.text3 }}>Appareil photo ou galerie · plusieurs possibles</span>
        </button>
      ) : (
        <div className="scroll-x" data-no-drag style={{ display: "flex", gap: 8, margin: "0 -20px 18px", padding: "8px 20px 4px" }}>
          {previews.map((src, i) => (
            <div key={src} style={{ position: "relative", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} style={{ width: 120, height: 150, borderRadius: 12, objectFit: "cover", display: "block" }} />
              {i === 0 && (
                <span style={{ position: "absolute", bottom: 5, left: 5, fontSize: 11, fontWeight: 600, background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "2px 6px" }}>
                  Couverture
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={`Retirer la photo ${i + 1}`}
                style={{ position: "absolute", top: -8, right: -8, width: 30, height: 30, borderRadius: "50%", background: "#000", border: "1.5px solid #48484A", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Ajouter d'autres photos"
            className="tap"
            style={{ width: 120, height: 150, flexShrink: 0, borderRadius: 12, border: "1.5px dashed #48484A", background: c.card2, color: c.link, fontSize: 30, cursor: "pointer" }}
          >
            +
          </button>
        </div>
      )}

      <Field id="m-title" label="Titre">
        <input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend à Bruges" enterKeyHint="next" autoComplete="off" style={input} />
      </Field>

      <Field
        id="m-loc"
        label="Lieu"
        hint={coords ? <span style={{ color: c.green }}>📍 Position enregistrée — visible sur la carte</span> : undefined}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="m-loc"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setCoords(null);
            }}
            onBlur={onLocationBlur}
            placeholder="Bruges, Belgique"
            enterKeyHint="next"
            autoComplete="off"
            style={{ ...input, flex: 1 }}
          />
          <button
            type="button"
            onClick={useGps}
            disabled={locating}
            aria-label="Utiliser ma position"
            className="tap"
            style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 12, border: "none", background: coords ? "rgba(48,209,88,0.15)" : c.card2, color: coords ? c.green : c.link, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {locating ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 3 3 10.5l7.5 2.5 2.5 7.5z" />
              </svg>
            )}
          </button>
        </div>
      </Field>

      <Field id="m-date" label="Date">
        <input id="m-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={input} />
      </Field>

      <Field id="m-word" label="Mon mot (optionnel)" hint={`${partnerName} pourra ajouter le sien depuis son compte.`} style={{ marginBottom: 4 }}>
        <textarea
          id="m-word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Ce que ce moment signifie pour toi…"
          rows={3}
          style={{ ...input, resize: "none", lineHeight: 1.45 }}
        />
      </Field>
    </Sheet>
  );
}
