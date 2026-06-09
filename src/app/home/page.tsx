"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { getUser, getMemories, Memory } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase";
import { addDoc, collection, Timestamp, updateDoc, doc } from "firebase/firestore";

const SEASONS = {
  winter: { label: "Hiver", bg: "#0A0A0C" },
  spring: { label: "Printemps", bg: "#0A0C0A" },
  summer: { label: "Été", bg: "#0C0B0A" },
  autumn: { label: "Automne", bg: "#0C0A0A" },
};

function getSeason(): keyof typeof SEASONS {
  const m = new Date().getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}

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

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const season = getSeason();
  const s = SEASONS[season];

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [partnerBirthday, setPartnerBirthday] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formWord, setFormWord] = useState("");
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormPhoto(file);
    setFormPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!user || !formTitle || !formLocation || !formDate) return;
    setFormLoading(true);
    try {
      const docRef = await addDoc(collection(db, "memories"), {
        title: formTitle,
        location: formLocation,
        date: Timestamp.fromDate(new Date(formDate)),
        photoUrl: null,
        lat: formLat,
        lng: formLng,
        isSpecial: !!formWord,
        words: {
          ryan: user.name === "Ryan" ? formWord || null : null,
          sarah: user.name === "Sarah" ? formWord || null : null,
        },
        createdBy: user.uid,
        createdAt: Timestamp.now(),
      });

      if (formPhoto) {
        const storageRef = ref(storage, `memories/${docRef.id}/${formPhoto.name}`);
        await uploadBytes(storageRef, formPhoto);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "memories", docRef.id), { photoUrl: url });
      }

      const updated = await getMemories();
      setMemories(updated);
      setFormTitle("");
      setFormLocation("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormWord("");
      setFormPhoto(null);
      setFormPhotoPreview(null);
      setFormLat(null);
      setFormLng(null);
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  }

  if (!user) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const partnerName = user.name === "Ryan" ? "Sarah" : "Ryan";
  const daysUntilPartnerBirthday = partnerBirthday ? getDaysUntil(partnerBirthday) : null;
  const daysTogether = getDaysTogether(TOGETHER_SINCE);
  const daysUntilAnniversary = getDaysUntil(TOGETHER_SINCE);
  const todayMemory = memories.find((m) => {
    const now = new Date();
    return m.date.getMonth() === now.getMonth() && m.date.getDate() === now.getDate();
  });

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: s.bg, color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "60px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1C1C1E" }}>
        <div>
          <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
            {s.label}
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>
            Bonjour {user.name}
          </h1>
        </div>
        <button
          onClick={() => auth.signOut().then(() => router.push("/login"))}
          style={{ background: "#1C1C1E", border: "none", borderRadius: 8, padding: "8px 14px", color: "#FF453A", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Déconnexion
        </button>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ padding: "20px", paddingBottom: 100, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Compteur */}
          <div style={{ background: "#1C1C1E", borderRadius: 16, padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 12, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3, marginBottom: 4 }}>Coucou a nous deux</p>
              <p style={{ fontSize: 44, fontWeight: 800, color: "#FFF", letterSpacing: -1, lineHeight: 1 }}>Je t'aime</p>
            </div>
          </div>

          {/* Ce jour-là */}
          {todayMemory ? (
            <div style={{ background: "#2C2C2E", borderRadius: 14, padding: "16px", borderLeft: "4px solid #0A84FF" }}>
              <p style={{ fontSize: 11, color: "#0A84FF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Ce jour-là</p>
              <p style={{ fontSize: 16, color: "#FFF", fontWeight: 600, marginBottom: 2 }}>{todayMemory.title}</p>
              <p style={{ fontSize: 13, color: "#AEAEB2" }}>{todayMemory.location}</p>
            </div>
          ) : (
            <div style={{ background: "#1C1C1E", borderRadius: 14, padding: "16px", border: "1px dashed #2C2C2E" }}>
              <p style={{ fontSize: 11, color: "#8E8E93", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Ce jour-là</p>
              <p style={{ fontSize: 14, color: "#636366" }}>
                Aucun souvenir pour le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.
              </p>
            </div>
          )}

          {/* Fil des souvenirs */}
          <div>
            <p style={{ fontSize: 12, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
              Fil des souvenirs ({memories.length})
            </p>

            {loadingMemories ? (
              <p style={{ fontSize: 14, color: "#636366", textAlign: "center", padding: "40px 0" }}>Chargement...</p>
            ) : memories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "#1C1C1E", borderRadius: 16 }}>
                <p style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500, marginBottom: 4 }}>Aucun souvenir encore</p>
                <p style={{ fontSize: 13, color: "#636366" }}>Appuie sur + pour ajouter le premier.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {memories.map((m) => {
                  const yearsAgo = new Date().getFullYear() - m.date.getFullYear();
                  return (
                    <div key={m.id} style={{ background: "#1C1C1E", borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ height: 220, position: "relative", background: "#2C2C2E" }}>
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#48484A", fontSize: 14 }}>Pas de photo</span>
                          </div>
                        )}
                        {yearsAgo > 0 && (
                          <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.75)", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#FFD60A" }}>
                            Il y a {yearsAgo} an{yearsAgo > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "16px" }}>
                        <p style={{ fontSize: 11, color: "#8E8E93", fontWeight: 500, marginBottom: 4 }}>
                          {m.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} — {m.location}
                        </p>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#FFF", marginBottom: (m.words.ryan || m.words.sarah) ? 14 : 0, letterSpacing: -0.2 }}>
                          {m.title}
                        </h3>
                        {(m.words.ryan || m.words.sarah) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #2C2C2E", paddingTop: 12 }}>
                            {m.words.ryan && (
                              <div style={{ background: "#2C2C2E", borderRadius: 8, padding: "10px 12px" }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: "#0A84FF", marginBottom: 2 }}>Ryan</p>
                                <p style={{ fontSize: 13, color: "#E5E5EA", lineHeight: 1.4 }}>« {m.words.ryan} »</p>
                              </div>
                            )}
                            {m.words.sarah && (
                              <div style={{ background: "#2C2C2E", borderRadius: 8, padding: "10px 12px" }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: "#FF2D55", marginBottom: 2 }}>Sarah</p>
                                <p style={{ fontSize: 13, color: "#E5E5EA", lineHeight: 1.4 }}>« {m.words.sarah} »</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{ position: "fixed", bottom: 95, right: 20, width: 54, height: 54, borderRadius: "50%", background: "#FFF", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 50, color: "#000" }}
      >
        +
      </button>

      {/* MODAL */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C1C1E", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", maxHeight: "88dvh", overflowY: "auto", borderTop: "1px solid #2C2C2E" }}>
            <div style={{ width: 40, height: 5, background: "#48484A", borderRadius: 2.5, margin: "0 auto 20px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 20, letterSpacing: -0.3 }}>Nouveau souvenir</h2>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: 20, overflow: "hidden", cursor: "pointer", background: "#2C2C2E", border: "1px dashed #48484A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {formPhotoPreview ? (
                <img src={formPhotoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <span style={{ fontSize: 13, color: "#0A84FF", fontWeight: 500 }}>Ajouter une photo</span>
                  <span style={{ fontSize: 11, color: "#8E8E93" }}>JPG ou PNG</span>
                </>
              )}
            </div>

            {[
              { label: "Titre", value: formTitle, set: setFormTitle, placeholder: "Ex: Weekend à Bruges" },
              { label: "Lieu", value: formLocation, set: setFormLocation, placeholder: "Ex: Bruges, Belgique" },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>{label}</label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 15, outline: "none" }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 15, outline: "none" }}
              />
            </div>

            {/* Géolocalisation */}
            <button
              type="button"
              onClick={() => navigator.geolocation.getCurrentPosition(
                (pos) => { setFormLat(pos.coords.latitude); setFormLng(pos.coords.longitude); },
                () => {}
              )}
              style={{ width: "100%", padding: "12px", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, color: formLat ? "#30D158" : "#0A84FF", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 14 }}
            >
              {formLat ? "📍 Position enregistrée !" : "📍 Utiliser ma position actuelle"}
            </button>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>Mon mot (optionnel)</label>
              <textarea
                value={formWord}
                onChange={(e) => setFormWord(e.target.value)}
                placeholder="Ce que ce moment signifie pour toi..."
                style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 15, outline: "none", resize: "none", height: 80, lineHeight: 1.4 }}
              />
              <p style={{ fontSize: 12, color: "#636366", marginTop: 6 }}>
                {partnerName} pourra ajouter son mot depuis son compte.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={formLoading || !formTitle || !formLocation}
              style={{ width: "100%", padding: "14px 0", background: "#0A84FF", border: "none", borderRadius: 12, color: "#FFF", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: formLoading || !formTitle || !formLocation ? 0.4 : 1, transition: "opacity 0.2s" }}
            >
              {formLoading ? "Enregistrement..." : "Publier le souvenir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}