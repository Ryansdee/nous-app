"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { getGifts, addGift, deleteGift, reserveGift, GiftItem } from "@/lib/firestore";

const EMOJIS = ["🎁", "👗", "👟", "💄", "📱", "🎮", "📚", "🎸", "✈️", "🌸", "💍", "🍫", "🧴", "🎨", "🏋️"];

const TOGETHER_SINCE = new Date(2022, 11, 22);

function getDaysUntil(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (next <= today) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function getUpcomingOccasion(partnerBirthday: Date | null): { label: string; daysLeft: number } | null {
  const occasions = [
    { label: "Noël", date: new Date(new Date().getFullYear(), 11, 25) },
    { label: "Saint-Valentin", date: new Date(new Date().getFullYear(), 1, 14) },
    { label: "Anniversaire de couple", date: TOGETHER_SINCE },
    ...(partnerBirthday ? [{ label: "Anniversaire", date: partnerBirthday }] : []),
  ];
  const soon = occasions
    .map(o => ({ label: o.label, daysLeft: getDaysUntil(o.date) }))
    .filter(o => o.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return soon[0] ?? null;
}

export default function GiftsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [myGifts, setMyGifts] = useState<GiftItem[]>([]);
  const [partnerGifts, setPartnerGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "budget">("my");
  const [partnerBirthday, setPartnerBirthday] = useState<Date | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formEmoji, setFormEmoji] = useState("🎁");
  const [formLoading, setFormLoading] = useState(false);

  // Budget
  const [budget, setBudget] = useState("");
  const [showOccasionBanner, setShowOccasionBanner] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const { getUser } = require("@/lib/firestore");
    Promise.all([
      getGifts(user.uid),
      user.partnerId ? getGifts(user.partnerId) : Promise.resolve([]),
      user.partnerId ? getUser(user.partnerId) : Promise.resolve(null),
    ]).then(([mine, partner, partnerData]: [GiftItem[], GiftItem[], any]) => {
      setMyGifts(mine);
      setPartnerGifts(partner);
      if (partnerData?.birthday) {
        const d = partnerData.birthday.toDate();
        setPartnerBirthday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }
      setLoading(false);
    });
  }, [user]);

  async function handleAdd() {
    if (!user || !formName || !formPrice) return;
    setFormLoading(true);
    try {
      await addGift(user.uid, {
        name: formName,
        price: parseFloat(formPrice),
        link: formLink,
        emoji: formEmoji,
      });
      setMyGifts(await getGifts(user.uid));
      setFormName(""); setFormPrice(""); setFormLink(""); setFormEmoji("🎁");
      setShowAdd(false);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!user) return;
    await deleteGift(user.uid, itemId);
    setMyGifts(prev => prev.filter(g => g.id !== itemId));
  }

  async function handleReserve(gift: GiftItem) {
    if (!user || !user.partnerId) return;
    const newReserver = gift.reservedBy === user.uid ? null : user.uid;
    await reserveGift(user.partnerId, gift.id, newReserver);
    setPartnerGifts(prev => prev.map(g =>
      g.id === gift.id ? { ...g, reservedBy: newReserver } : g
    ));
  }

  if (!user || loading) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0C" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const partnerName = user.name === "Ryan" ? "Sarah" : "Ryan";
  const budgetNum = parseFloat(budget) || 0;
  const affordable = partnerGifts.filter(g => budgetNum === 0 || g.price <= budgetNum);
  const totalReserved = partnerGifts
    .filter(g => g.reservedBy === user.uid)
    .reduce((s, g) => s + g.price, 0);
  const upcomingOccasion = getUpcomingOccasion(partnerBirthday);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0A0A0C", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "60px 20px 0", borderBottom: "1px solid #1C1C1E" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5, marginBottom: 16 }}>Cadeaux</h1>
        <div style={{ display: "flex" }}>
          {[
            { key: "my", label: "Ma wishlist" },
            { key: "budget", label: `Pour ${partnerName}` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as "my" | "budget")}
              style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: tab === t.key ? "2px solid #FFF" : "2px solid transparent", color: tab === t.key ? "#FFF" : "#636366", fontSize: 14, fontWeight: tab === t.key ? 600 : 400, cursor: "pointer" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

        {/* MA WISHLIST */}
        {tab === "my" && (
          <div style={{ padding: "20px", paddingBottom: 100, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>
                {myGifts.length} souhait{myGifts.length > 1 ? "s" : ""}
              </p>
              <p style={{ fontSize: 12, color: "#636366" }}>🔒 Privé</p>
            </div>

            {myGifts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "#1C1C1E", borderRadius: 16 }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🎁</p>
                <p style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500, marginBottom: 4 }}>Ta wishlist est vide</p>
                <p style={{ fontSize: 13, color: "#636366" }}>Ajoute des cadeaux que tu aimerais recevoir</p>
              </div>
            ) : (
              myGifts.map((g) => (
                <div key={g.id} style={{ background: "#1C1C1E", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "#2C2C2E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {g.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, color: "#FFF", fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
                    <p style={{ fontSize: 16, color: "#c9a96e", fontWeight: 700 }}>€{g.price.toFixed(0)}</p>
                    {g.link && (
                      <a href={g.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0A84FF", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🔗 {g.link.replace(/^https?:\/\//, "").split("/")[0]}
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleDelete(g.id)} style={{ background: "none", border: "none", color: "#FF453A", fontSize: 18, cursor: "pointer", padding: "4px", flexShrink: 0 }}>✕</button>
                </div>
              ))
            )}

            <button
              onClick={() => setShowAdd(true)}
              style={{ background: "#1C1C1E", border: "1px dashed #3A3A3C", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#0A84FF", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
            >
              + Ajouter un souhait
            </button>
          </div>
        )}

        {/* POUR LE PARTENAIRE */}
        {tab === "budget" && (
          <div style={{ padding: "20px", paddingBottom: 100, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Banner occasion */}
            {upcomingOccasion && showOccasionBanner && (
              <div style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 13, color: "#c9a96e", fontWeight: 600, marginBottom: 2 }}>
                    🎉 {upcomingOccasion.label} dans {upcomingOccasion.daysLeft} jour{upcomingOccasion.daysLeft > 1 ? "s" : ""}
                  </p>
                  <p style={{ fontSize: 12, color: "#8E8E93" }}>C'est le bon moment pour choisir un cadeau !</p>
                </div>
                <button onClick={() => setShowOccasionBanner(false)} style={{ background: "none", border: "none", color: "#636366", fontSize: 16, cursor: "pointer" }}>✕</button>
              </div>
            )}

            {/* Info privé */}
            <div style={{ background: "#1C1C1E", borderRadius: 14, padding: "12px 16px" }}>
              <p style={{ fontSize: 13, color: "#8E8E93" }}>
                🔒 {partnerName} ne voit pas ce que tu réserves pour lui/elle.
              </p>
            </div>

            {/* Budget input */}
            <div style={{ background: "#1C1C1E", borderRadius: 16, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>
                Filtrer par budget
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, color: "#c9a96e", fontWeight: 700 }}>€</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Illimité"
                  style={{ flex: 1, background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "10px 12px", color: "#FFF", fontSize: 22, fontWeight: 700, outline: "none" }}
                />
              </div>
            </div>

            {/* Résumé réservations */}
            {partnerGifts.filter(g => g.reservedBy === user.uid).length > 0 && (
              <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 13, color: "#30D158", fontWeight: 600, marginBottom: 2 }}>
                    ✓ {partnerGifts.filter(g => g.reservedBy === user.uid).length} cadeau{partnerGifts.filter(g => g.reservedBy === user.uid).length > 1 ? "x" : ""} réservé{partnerGifts.filter(g => g.reservedBy === user.uid).length > 1 ? "s" : ""}
                  </p>
                  <p style={{ fontSize: 12, color: "#8E8E93" }}>Total : €{totalReserved.toFixed(0)}</p>
                </div>
              </div>
            )}

            {/* Liste cadeaux */}
            <div>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>
                Wishlist de {partnerName} {budgetNum > 0 ? `(≤ €${budgetNum})` : ""}
              </p>

              {partnerGifts.length === 0 ? (
                <div style={{ background: "#1C1C1E", borderRadius: 14, padding: "32px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#636366" }}>{partnerName} n'a pas encore ajouté de cadeaux</p>
                </div>
              ) : affordable.length === 0 ? (
                <div style={{ background: "#1C1C1E", borderRadius: 14, padding: "24px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#636366" }}>Aucun cadeau dans ce budget</p>
                  <p style={{ fontSize: 12, color: "#48484A", marginTop: 4 }}>
                    Moins cher : €{Math.min(...partnerGifts.map(g => g.price)).toFixed(0)}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {affordable.map((g) => {
                    const isReservedByMe = g.reservedBy === user.uid;
                    const isReservedByOther = g.reservedBy && g.reservedBy !== user.uid;
                    return (
                      <div
                        key={g.id}
                        style={{ background: "#1C1C1E", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: isReservedByMe ? "1px solid #30D158" : "1px solid transparent", opacity: isReservedByOther ? 0.4 : 1 }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#2C2C2E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                          {g.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, color: "#FFF", fontWeight: 600, marginBottom: 2, textDecoration: isReservedByOther ? "line-through" : "none" }}>{g.name}</p>
                          <p style={{ fontSize: 15, color: "#c9a96e", fontWeight: 700 }}>€{g.price.toFixed(0)}</p>
                          {g.link && !isReservedByOther && (
                            <a href={g.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0A84FF", textDecoration: "none" }}>
                              Voir le produit →
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => handleReserve(g)}
                          disabled={!!isReservedByOther}
                          style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none", background: isReservedByMe ? "#30D158" : "#2C2C2E", color: isReservedByMe ? "#000" : "#FFF", fontSize: 13, fontWeight: 600, cursor: isReservedByOther ? "default" : "pointer" }}
                        >
                          {isReservedByMe ? "✓ Je prends" : isReservedByOther ? "Pris" : "Je prends"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB wishlist */}
      {tab === "my" && (
        <button
          onClick={() => setShowAdd(true)}
          style={{ position: "fixed", bottom: 95, right: 20, width: 54, height: 54, borderRadius: "50%", background: "#FFF", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 50, color: "#000" }}
        >
          +
        </button>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C1C1E", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", maxHeight: "88dvh", overflowY: "auto", borderTop: "1px solid #2C2C2E" }}>
            <div style={{ width: 40, height: 5, background: "#48484A", borderRadius: 2.5, margin: "0 auto 20px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#FFF", marginBottom: 20, letterSpacing: -0.3 }}>Nouveau souhait</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 8, letterSpacing: 0.3 }}>Icône</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setFormEmoji(e)} style={{ width: 40, height: 40, borderRadius: 10, background: formEmoji === e ? "#3A3A3C" : "#2C2C2E", border: formEmoji === e ? "2px solid #FFF" : "1px solid transparent", fontSize: 20, cursor: "pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: "Nom du cadeau", value: formName, set: setFormName, placeholder: "Ex: AirPods Pro" },
              { label: "Lien (optionnel)", value: formLink, set: setFormLink, placeholder: "https://..." },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>{label}</label>
                <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 15, outline: "none" }} />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>Prix moyen (€)</label>
              <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0" style={{ width: "100%", background: "#2C2C2E", border: "1px solid #3A3A3C", borderRadius: 10, padding: "12px", color: "#FFF", fontSize: 15, outline: "none" }} />
            </div>

            <button onClick={handleAdd} disabled={formLoading || !formName || !formPrice} style={{ width: "100%", padding: "14px 0", background: "#0A84FF", border: "none", borderRadius: 12, color: "#FFF", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: formLoading || !formName || !formPrice ? 0.4 : 1 }}>
              {formLoading ? "Ajout..." : "Ajouter à ma wishlist"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}