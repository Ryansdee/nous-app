"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

interface Letter {
  content: string;
  writtenAt: Date;
}

export default function CapsulePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [myLetter, setMyLetter] = useState<Letter | null>(null);
  const [partnerLetter, setPartnerLetter] = useState<Letter | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Écriture
  const [showWrite, setShowWrite] = useState(false);
  const [letterContent, setLetterContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unlocked = user.weddingDate !== null;
    setIsUnlocked(unlocked);

    Promise.all([
      getDoc(doc(db, "capsule", user.uid)),
      user.partnerId ? getDoc(doc(db, "capsule", user.partnerId)) : Promise.resolve(null),
    ]).then(([mySnap, partnerSnap]) => {
      if (mySnap.exists()) {
        setMyLetter({
          content: mySnap.data().content,
          writtenAt: mySnap.data().writtenAt.toDate(),
        });
        setLetterContent(mySnap.data().content);
      }
      if (partnerSnap?.exists()) {
        setPartnerLetter({
          content: partnerSnap.data().content,
          writtenAt: partnerSnap.data().writtenAt.toDate(),
        });
      }
      setLoading(false);
    });
  }, [user]);

  async function saveLetter() {
    if (!user || !letterContent.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "capsule", user.uid), {
        content: letterContent,
        writtenAt: Timestamp.now(),
        authorName: user.name,
      });
      setMyLetter({ content: letterContent, writtenAt: new Date() });
      setShowWrite(false);
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0C" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const partnerName = user.name === "Ryan" ? "Sarah" : "Ryan";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0A0A0C", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "60px 20px 16px", borderBottom: "1px solid #1C1C1E" }}>
        <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
          {isUnlocked ? "✦ Ouverte" : "🔒 Verrouillée"}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>
          Capsule temporelle
        </h1>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ padding: "20px", paddingBottom: 100, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* État capsule */}
          {!isUnlocked ? (
            <div style={{ background: "#1C1C1E", borderRadius: 20, padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#2C2C2E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                🔒
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 8, letterSpacing: -0.3 }}>
                  Lettres scellées
                </p>
                <p style={{ fontSize: 14, color: "#8E8E93", lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
                  Vos lettres s'ouvriront le jour de votre mariage. En attendant, vous pouvez écrire et modifier la vôtre.
                </p>
              </div>
              <div style={{ background: "#2C2C2E", borderRadius: 12, padding: "12px 20px", width: "100%" }}>
                <p style={{ fontSize: 13, color: "#8E8E93", lineHeight: 1.5, textAlign: "left" }}>
                  🔑 <strong style={{ color: "#FFF" }}>Condition d'ouverture :</strong> la date de mariage doit être enregistrée dans l'application par les deux partenaires.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>✦</span>
              <div>
                <p style={{ fontSize: 15, color: "#c9a96e", fontWeight: 600, marginBottom: 2 }}>Capsule ouverte !</p>
                <p style={{ fontSize: 13, color: "#8E8E93" }}>
                  Mariés le {user.weddingDate?.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}

          {/* MA LETTRE */}
          <div style={{ background: "#1C1C1E", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2C2C2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 11, color: "#0A84FF", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>
                  Ta lettre
                </p>
                <p style={{ fontSize: 15, color: "#FFF", fontWeight: 600 }}>{user.name}</p>
              </div>
              <button
                onClick={() => setShowWrite(true)}
                style={{ background: "#2C2C2E", border: "none", borderRadius: 10, padding: "8px 14px", color: "#0A84FF", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                {myLetter ? "Modifier" : "Écrire"}
              </button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {myLetter ? (
                <>
                  {isUnlocked ? (
                    <p style={{ fontSize: 15, color: "#E5E5EA", lineHeight: 1.7, fontStyle: "italic" }}>
                      « {myLetter.content} »
                    </p>
                  ) : (
                    <div>
                      <p style={{ fontSize: 14, color: "#30D158", marginBottom: 8 }}>✓ Lettre écrite et scellée</p>
                      <p style={{ fontSize: 13, color: "#636366" }}>
                        Écrite le {myLetter.writtenAt.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p style={{ fontSize: 12, color: "#48484A", marginTop: 8, fontStyle: "italic" }}>
                        Le contenu sera révélé à l'ouverture de la capsule.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 14, color: "#636366", fontStyle: "italic" }}>
                  Tu n'as pas encore écrit ta lettre...
                </p>
              )}
            </div>
          </div>

          {/* LETTRE DU PARTENAIRE */}
          <div style={{ background: "#1C1C1E", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2C2C2E" }}>
              <p style={{ fontSize: 11, color: "#FF2D55", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>
                Lettre de
              </p>
              <p style={{ fontSize: 15, color: "#FFF", fontWeight: 600 }}>{partnerName}</p>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {isUnlocked ? (
                partnerLetter ? (
                  <p style={{ fontSize: 15, color: "#E5E5EA", lineHeight: 1.7, fontStyle: "italic" }}>
                    « {partnerLetter.content} »
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: "#636366", fontStyle: "italic" }}>
                    {partnerName} n'a pas encore écrit sa lettre.
                  </p>
                )
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 0" }}>
                  <span style={{ fontSize: 28 }}>🔒</span>
                  {partnerLetter ? (
                    <p style={{ fontSize: 14, color: "#30D158", textAlign: "center" }}>
                      ✓ {partnerName} a écrit sa lettre
                    </p>
                  ) : (
                    <p style={{ fontSize: 14, color: "#636366", textAlign: "center" }}>
                      {partnerName} n'a pas encore écrit sa lettre
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: "#48484A", textAlign: "center" }}>
                    Contenu révélé à l'ouverture
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statut global */}
          <div style={{ background: "#1C1C1E", borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
              Statut
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: `Lettre de ${user.name}`, done: !!myLetter },
                { label: `Lettre de ${partnerName}`, done: !!partnerLetter },
                { label: "Date de mariage enregistrée", done: isUnlocked },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 14, color: item.done ? "#FFF" : "#636366" }}>{item.label}</p>
                  <p style={{ fontSize: 16 }}>{item.done ? "✓" : "○"}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL ÉCRITURE */}
      {showWrite && (
        <div onClick={() => setShowWrite(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C1C1E", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", maxHeight: "88dvh", overflowY: "auto", borderTop: "1px solid #2C2C2E" }}>
            <div style={{ width: 40, height: 5, background: "#48484A", borderRadius: 2.5, margin: "0 auto 20px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 6, letterSpacing: -0.3 }}>
              Ma lettre à {partnerName}
            </h2>
            <p style={{ fontSize: 13, color: "#636366", marginBottom: 20 }}>
              {isUnlocked ? "La capsule est ouverte — tu peux lire et modifier." : "Scellée jusqu'au mariage. Seulement toi peux la lire pour l'instant."}
            </p>
            <textarea
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              placeholder={`Chère/Cher ${partnerName},\n\nJe t'écris cette lettre pour te dire...`}
              style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 12, padding: "16px", color: "#FFF", fontSize: 15, outline: "none", resize: "none", height: 280, lineHeight: 1.7, fontFamily: "var(--font-sans)" }}
            />
            <p style={{ fontSize: 12, color: "#48484A", marginTop: 8, marginBottom: 20 }}>
              {letterContent.length} caractères
            </p>
            <button
              onClick={saveLetter}
              disabled={saving || !letterContent.trim()}
              style={{ width: "100%", padding: "14px 0", background: "#0A84FF", border: "none", borderRadius: 12, color: "#FFF", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: saving || !letterContent.trim() ? 0.4 : 1 }}
            >
              {saving ? "Sauvegarde..." : "Sceller ma lettre"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}