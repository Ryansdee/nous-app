"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { usePartnerBirthday } from "@/store/dataStore";
import { getGifts, addGift, deleteGift, reserveGift, type GiftItem } from "@/lib/firestore";
import { TOGETHER_SINCE, daysUntilNext, partnerNameOf } from "@/lib/couple";
import { haptic } from "@/lib/device";
import { c, input, primaryButton } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import { confirmAction } from "@/components/ui/ActionSheet";
import { EmojiPicker, EmptyState, Field, HeaderButton, PlusIcon, Segmented, SkeletonList } from "@/components/ui/kit";

const EMOJIS = ["🎁", "👗", "👟", "💄", "📱", "🎮", "📚", "🎸", "✈️", "🌸", "💍", "🍫", "🧴", "🎨", "🏋️", "⌚️"];
const euro = (n: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function upcomingOccasion(partnerBirthday: Date | null) {
  const occasions = [
    { label: "Noël", date: new Date(2000, 11, 25) },
    { label: "Saint-Valentin", date: new Date(2000, 1, 14) },
    { label: "Votre anniversaire de couple", date: TOGETHER_SINCE },
    ...(partnerBirthday ? [{ label: "Son anniversaire", date: partnerBirthday }] : []),
  ];
  return (
    occasions
      .map((o) => ({ label: o.label, daysLeft: daysUntilNext(o.date) }))
      .filter((o) => o.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0] ?? null
  );
}

function domainOf(link: string) {
  try {
    return new URL(link.startsWith("http") ? link : `https://${link}`).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

export default function GiftsPage() {
  const user = useAuthStore((s) => s.user)!;
  const showToast = useUiStore((s) => s.showToast);
  const partnerBirthday = usePartnerBirthday();
  const partnerName = partnerNameOf(user.name);

  const [myGifts, setMyGifts] = useState<GiftItem[]>([]);
  const [partnerGifts, setPartnerGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "partner">("mine");
  const [budget, setBudget] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(
    () =>
      Promise.all([
        getGifts(user.uid),
        user.partnerId ? getGifts(user.partnerId) : Promise.resolve([] as GiftItem[]),
      ]),
    [user.uid, user.partnerId]
  );

  const load = useCallback(async () => {
    const [mine, partner] = await fetchAll();
    setMyGifts(mine);
    setPartnerGifts(partner);
  }, [fetchAll]);

  useEffect(() => {
    let alive = true;
    fetchAll()
      .then(([mine, partner]) => {
        if (!alive) return;
        setMyGifts(mine);
        setPartnerGifts(partner);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchAll]);

  async function handleAdd() {
    const p = parseFloat(price.replace(",", "."));
    if (!name.trim() || !Number.isFinite(p)) return;
    setSaving(true);
    try {
      await addGift(user.uid, { name: name.trim(), price: p, link: link.trim(), emoji });
      setMyGifts(await getGifts(user.uid));
      haptic([10, 30, 10]);
      setName("");
      setPrice("");
      setLink("");
      setEmoji("🎁");
      setShowAdd(false);
      showToast("Ajouté à ta wishlist");
    } catch {
      showToast("Impossible d'ajouter ce souhait", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: GiftItem) {
    const ok = await confirmAction({ title: g.name, confirmLabel: "Supprimer de ma wishlist", destructive: true });
    if (!ok) return;
    setMyGifts((prev) => prev.filter((x) => x.id !== g.id));
    await deleteGift(user.uid, g.id).catch(() => load());
  }

  async function handleReserve(g: GiftItem) {
    if (!user.partnerId) return;
    const next = g.reservedBy === user.uid ? null : user.uid;
    haptic(next ? [10, 30, 10] : 8);
    setPartnerGifts((prev) => prev.map((x) => (x.id === g.id ? { ...x, reservedBy: next } : x)));
    await reserveGift(user.partnerId, g.id, next).catch(() => load());
  }

  const budgetNum = parseFloat(budget.replace(",", ".")) || 0;
  const affordable = partnerGifts.filter((g) => budgetNum === 0 || g.price <= budgetNum);
  const reservedByMe = partnerGifts.filter((g) => g.reservedBy === user.uid);
  const totalReserved = reservedByMe.reduce((s, g) => s + g.price, 0);
  const occasion = upcomingOccasion(partnerBirthday);
  const canAdd = name.trim().length > 0 && Number.isFinite(parseFloat(price.replace(",", "."))) && !saving;

  return (
    <Screen
      transition="push"
      onRefresh={load}
      header={
        <PageHeader
          back={{ href: "/profile", label: "Profil" }}
          title="Cadeaux"
          right={
            tab === "mine" ? (
              <HeaderButton label="Ajouter un souhait" onClick={() => setShowAdd(true)}>
                <PlusIcon />
              </HeaderButton>
            ) : (
              <span aria-hidden="true" style={{ width: 44, height: 44 }} />
            )
          }
        >
          <Segmented
            label="Liste affichée"
            value={tab}
            onChange={setTab}
            options={[
              { value: "mine", label: "Ma wishlist" },
              { value: "partner", label: `Pour ${partnerName}` },
            ]}
          />
        </PageHeader>
      }
    >
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <SkeletonList rows={4} />
        ) : tab === "mine" ? (
          <>
            <p style={{ fontSize: 13, color: c.text3, padding: "0 4px" }}>
              🔒 {partnerName} voit ta liste, mais pas qui a réservé quoi.
            </p>
            {myGifts.length === 0 ? (
              <EmptyState
                icon="🎁"
                title="Ta wishlist est vide"
                text={`Ajoute ce qui te ferait plaisir — ${partnerName} pourra s'en inspirer.`}
                action={<button type="button" className="tap" style={{ ...primaryButton, width: "auto", padding: "0 22px" }} onClick={() => setShowAdd(true)}>Ajouter un souhait</button>}
              />
            ) : (
              <ul style={{ listStyle: "none", background: c.card, borderRadius: 16, overflow: "hidden" }}>
                {myGifts.map((g, i) => (
                  <li key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 6px 12px 14px", borderBottom: i < myGifts.length - 1 ? `0.5px solid ${c.separator}` : "none" }}>
                    <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: c.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{g.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 16, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
                      <p style={{ fontSize: 15, color: c.gold, fontWeight: 700 }}>{euro(g.price)}</p>
                      {g.link && (
                        <a href={g.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: c.link, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {domainOf(g.link)} ↗
                        </a>
                      )}
                    </div>
                    <button type="button" onClick={() => handleDelete(g)} aria-label={`Supprimer ${g.name}`} className="tap" style={{ width: 44, height: 44, flexShrink: 0, background: "none", border: "none", color: c.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {occasion && (
              <div style={{ background: "rgba(214,178,110,0.12)", borderRadius: 14, padding: "14px 16px" }}>
                <p style={{ fontSize: 15, color: c.gold, fontWeight: 600 }}>
                  🎉 {occasion.label} {occasion.daysLeft === 0 ? "aujourd'hui !" : `dans ${occasion.daysLeft} jour${occasion.daysLeft > 1 ? "s" : ""}`}
                </p>
                <p style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>C&apos;est le moment de choisir.</p>
              </div>
            )}

            <div style={{ background: c.card, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <label htmlFor="budget" style={{ fontSize: 16, flex: 1 }}>Budget max</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  id="budget"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="∞"
                  style={{ ...input, width: 96, minHeight: 40, padding: "8px 12px", textAlign: "right", fontWeight: 700 }}
                />
                <span style={{ color: c.text3, fontSize: 16 }}>€</span>
              </div>
            </div>

            {reservedByMe.length > 0 && (
              <div style={{ background: "rgba(48,209,88,0.1)", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 15, color: c.green, fontWeight: 600 }}>
                  ✓ {reservedByMe.length} réservé{reservedByMe.length > 1 ? "s" : ""}
                </p>
                <p style={{ fontSize: 15, color: c.text2 }}>Total {euro(totalReserved)}</p>
              </div>
            )}

            <p style={{ fontSize: 13, color: c.text3, padding: "4px 4px 0" }}>
              🔒 {partnerName} ne voit pas ce que tu réserves.
            </p>

            {partnerGifts.length === 0 ? (
              <EmptyState icon="🤷" title={`${partnerName} n'a encore rien ajouté`} text="Glisse-lui un mot pour qu'il·elle remplisse sa wishlist." />
            ) : affordable.length === 0 ? (
              <EmptyState icon="💸" title="Rien dans ce budget" text={`Le moins cher est à ${euro(Math.min(...partnerGifts.map((g) => g.price)))}.`} />
            ) : (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {affordable.map((g) => {
                  const mine = g.reservedBy === user.uid;
                  const taken = !!g.reservedBy && !mine;
                  return (
                    <li key={g.id} style={{ background: c.card, borderRadius: 16, padding: "12px 12px 12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: mine ? `inset 0 0 0 1.5px ${c.green}` : "none", opacity: taken ? 0.45 : 1 }}>
                      <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: c.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{g.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 16, fontWeight: 600, textDecoration: taken ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
                        <p style={{ fontSize: 15, color: c.gold, fontWeight: 700 }}>{euro(g.price)}</p>
                        {g.link && !taken && (
                          <a href={g.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: c.link, textDecoration: "none" }}>
                            Voir le produit ↗
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReserve(g)}
                        disabled={taken}
                        aria-pressed={mine}
                        className="tap"
                        style={{ flexShrink: 0, minHeight: 40, padding: "0 14px", borderRadius: 999, border: "none", background: mine ? c.green : c.card2, color: mine ? "#000" : "#FFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                      >
                        {mine ? "✓ Pris" : taken ? "Pris" : "Je prends"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <Sheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nouveau souhait"
        locked={saving}
        footer={
          <button type="button" onClick={handleAdd} disabled={!canAdd} className="tap" style={primaryButton}>
            {saving ? "Ajout…" : "Ajouter à ma wishlist"}
          </button>
        }
      >
        <Field id="g-name" label="Quoi ?">
          <input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="AirPods Pro" autoComplete="off" enterKeyHint="next" style={input} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field id="g-price" label="Prix (€)" style={{ flex: "0 0 110px" }}>
            <input id="g-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" style={input} />
          </Field>
          <Field id="g-link" label="Lien (optionnel)" style={{ flex: 1, minWidth: 0 }}>
            <input id="g-link" type="url" inputMode="url" autoCapitalize="off" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" style={input} />
          </Field>
        </div>
        <Field label="Icône" style={{ marginBottom: 0 }}>
          <EmojiPicker value={emoji} onChange={setEmoji} emojis={EMOJIS} />
        </Field>
      </Sheet>
    </Screen>
  );
}
