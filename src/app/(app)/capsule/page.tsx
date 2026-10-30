"use client";
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { formatDate, partnerNameOf, PEOPLE } from "@/lib/couple";
import { haptic } from "@/lib/device";
import { notify } from "@/lib/social";
import { c, font, input, primaryButton } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import { SkeletonList } from "@/components/ui/kit";

interface Letter {
  content: string;
  writtenAt: Date;
}

const DRAFT_KEY = "nous.capsule.draft";

export default function CapsulePage() {
  const user = useAuthStore((s) => s.user)!;
  const showToast = useUiStore((s) => s.showToast);
  const partnerName = partnerNameOf(user.name);
  const isUnlocked = user.weddingDate !== null;

  const [myLetter, setMyLetter] = useState<Letter | null>(null);
  const [partnerLetter, setPartnerLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLetters = useCallback(async (): Promise<[Letter | null, Letter | null]> => {
    const [mine, partner] = await Promise.all([
      getDoc(doc(db, "capsule", user.uid)),
      user.partnerId ? getDoc(doc(db, "capsule", user.partnerId)) : Promise.resolve(null),
    ]);
    const toLetter = (snap: typeof mine | null): Letter | null => {
      if (!snap?.exists()) return null;
      const d = snap.data();
      return { content: d.content, writtenAt: d.writtenAt.toDate() };
    };
    return [toLetter(mine), toLetter(partner)];
  }, [user.uid, user.partnerId]);

  const load = useCallback(async () => {
    const [m, p] = await fetchLetters();
    setMyLetter(m);
    setPartnerLetter(p);
  }, [fetchLetters]);

  useEffect(() => {
    let alive = true;
    fetchLetters()
      .then(([m, p]) => {
        if (!alive) return;
        setMyLetter(m);
        setPartnerLetter(p);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchLetters]);

  function openEditor() {
    // Brouillon local : rien n'est perdu si l'app est fermée en cours d'écriture
    let draft: string | null = null;
    try {
      draft = localStorage.getItem(DRAFT_KEY);
    } catch {
      /* noop */
    }
    setText(draft ?? myLetter?.content ?? "");
    setWriting(true);
  }

  function onChange(v: string) {
    setText(v);
    try {
      localStorage.setItem(DRAFT_KEY, v);
    } catch {
      /* noop */
    }
  }

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "capsule", user.uid), { content: text, writtenAt: Timestamp.now(), authorName: user.name });
      if (!myLetter) notify({ uid: user.uid, name: user.name, partnerId: user.partnerId }, "capsule");
      setMyLetter({ content: text, writtenAt: new Date() });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* noop */
      }
      haptic([10, 40, 10]);
      setWriting(false);
      showToast(isUnlocked ? "Lettre enregistrée" : "Lettre scellée 💌");
    } catch {
      showToast("Impossible d'enregistrer", "error");
    } finally {
      setSaving(false);
    }
  }

  const me = PEOPLE[user.name as keyof typeof PEOPLE] ?? PEOPLE.Ryan;
  const them = PEOPLE[partnerName as keyof typeof PEOPLE] ?? PEOPLE.Sarah;

  return (
    <Screen
      transition="push"
      onRefresh={load}
      header={<PageHeader back={{ href: "/profile", label: "Profil" }} eyebrow={isUnlocked ? "✦ Ouverte" : "🔒 Scellée"} title="Capsule temporelle" />}
    >
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {loading ? (
          <SkeletonList rows={3} height={120} />
        ) : (
          <>
            {isUnlocked ? (
              <div style={{ background: "rgba(214,178,110,0.12)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }} aria-hidden="true">✦</span>
                <div>
                  <p style={{ fontSize: 16, color: c.gold, fontWeight: 600 }}>La capsule est ouverte</p>
                  <p style={{ fontSize: 14, color: c.text2 }}>Mariés le {user.weddingDate && formatDate(user.weddingDate)}</p>
                </div>
              </div>
            ) : (
              <div style={{ background: c.card, borderRadius: 20, padding: "28px 22px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span aria-hidden="true" style={{ width: 72, height: 72, borderRadius: "50%", background: c.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>💌</span>
                <p style={{ fontFamily: font.serif, fontSize: 26, fontWeight: 600 }}>Lettres scellées</p>
                <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.5, maxWidth: 300 }}>
                  Elles s&apos;ouvriront le jour de votre mariage. D&apos;ici là, tu peux écrire et réécrire la tienne autant que tu veux.
                </p>
              </div>
            )}

            {/* Ma lettre */}
            <section style={{ background: c.card, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: me.soft, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Ta lettre</p>
                  <p style={{ fontSize: 14, color: c.text3, marginTop: 2 }}>
                    {myLetter ? `Écrite le ${formatDate(myLetter.writtenAt)}` : "Pas encore écrite"}
                  </p>
                </div>
                <button type="button" onClick={openEditor} className="tap" style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, border: "none", background: c.card2, color: c.link, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  {myLetter ? "Modifier" : "Écrire"}
                </button>
              </div>
              {myLetter && isUnlocked && (
                <p style={{ padding: "0 16px 16px", fontFamily: font.serif, fontSize: 19, lineHeight: 1.55, fontStyle: "italic", whiteSpace: "pre-wrap", color: "#E5E5EA" }}>{myLetter.content}</p>
              )}
            </section>

            {/* Lettre du/de la partenaire */}
            <section style={{ background: c.card, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 12, color: them.soft, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Lettre de {partnerName}</p>
                <p style={{ fontSize: 14, color: partnerLetter ? c.green : c.text3, marginTop: 2 }}>
                  {partnerLetter ? (isUnlocked ? `Écrite le ${formatDate(partnerLetter.writtenAt)}` : `✓ ${partnerName} a écrit sa lettre`) : `${partnerName} n'a pas encore écrit`}
                </p>
              </div>
              {isUnlocked && partnerLetter ? (
                <p style={{ padding: "0 16px 16px", fontFamily: font.serif, fontSize: 19, lineHeight: 1.55, fontStyle: "italic", whiteSpace: "pre-wrap", color: "#E5E5EA" }}>{partnerLetter.content}</p>
              ) : !isUnlocked ? (
                <div style={{ margin: "0 16px 16px", height: 70, borderRadius: 12, background: "repeating-linear-gradient(45deg, #232325 0 10px, #161618 10px 20px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: c.text3 }}>
                  🔒 Révélée au mariage
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>

      <Sheet
        open={writing}
        onClose={() => setWriting(false)}
        title={`Ma lettre à ${partnerName}`}
        size="full"
        locked={saving}
        footer={
          <button type="button" onClick={save} disabled={saving || !text.trim()} className="tap" style={primaryButton}>
            {saving ? "Enregistrement…" : isUnlocked ? "Enregistrer" : "Sceller ma lettre"}
          </button>
        }
      >
        <p style={{ fontSize: 14, color: c.text3, marginBottom: 12 }}>
          {isUnlocked ? "La capsule est ouverte : vous pouvez tous les deux la lire." : `Seul·e toi peux la lire avant le mariage. Brouillon sauvegardé automatiquement.`}
        </p>
        <label htmlFor="letter" className="sr-only">Ta lettre</label>
        <textarea
          id="letter"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${partnerName},\n\nJe t'écris cette lettre pour te dire…`}
          style={{ ...input, minHeight: "45dvh", resize: "none", lineHeight: 1.6, fontFamily: font.serif, fontSize: 19, padding: 16 }}
        />
        <p style={{ fontSize: 12, color: "#636366", marginTop: 8, textAlign: "right" }}>{text.length} caractères</p>
      </Sheet>
    </Screen>
  );
}
