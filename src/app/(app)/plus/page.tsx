"use client";
// Hub « Plus » : toutes les sections secondaires + réglages de l'app,
// en liste groupée façon Réglages iOS.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { usePwaStore, promptInstall, hardRefresh, applyUpdate } from "@/lib/pwa";
import { isIOS, isStandalone } from "@/lib/device";
import { PEOPLE, TOGETHER_SINCE, daysSince, partnerNameOf } from "@/lib/couple";
import { c, font, primaryButton } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import { confirmAction } from "@/components/ui/ActionSheet";

type Row = { href?: string; onClick?: () => void; icon: string; tint: string; title: string; subtitle?: string; danger?: boolean; badge?: string };

function Group({ title, rows, footer }: { title?: string; rows: Row[]; footer?: ReactNode }) {
  return (
    <section style={{ margin: "0 16px 26px" }}>
      {title && <h2 style={{ fontSize: 13, color: c.text3, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500, padding: "0 16px 8px" }}>{title}</h2>}
      <ul style={{ listStyle: "none", background: c.card, borderRadius: 14, overflow: "hidden" }}>
        {rows.map((r, i) => {
          const inner = (
            <>
              <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 8, background: r.tint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                {r.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, alignSelf: "stretch", borderBottom: i < rows.length - 1 ? `0.5px solid ${c.separator}` : "none", paddingRight: 12 }}>
                <span style={{ flex: 1, minWidth: 0, padding: "12px 0" }}>
                  <span style={{ display: "block", fontSize: 17, color: r.danger ? c.red : c.text }}>{r.title}</span>
                  {r.subtitle && <span style={{ display: "block", fontSize: 13, color: c.text3, marginTop: 1 }}>{r.subtitle}</span>}
                </span>
                {r.badge && (
                  <span style={{ background: c.red, color: "#FFF", fontSize: 13, fontWeight: 600, borderRadius: 999, padding: "2px 8px" }}>{r.badge}</span>
                )}
                {r.href && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5A5E" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                )}
              </span>
            </>
          );
          const style = { display: "flex", alignItems: "center", gap: 14, paddingLeft: 14, minHeight: 56, textDecoration: "none", color: "inherit", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, font: "inherit" };
          return (
            <li key={r.title}>
              {r.href ? (
                <Link href={r.href} className="tap-row" style={style}>{inner}</Link>
              ) : (
                <button type="button" onClick={r.onClick} className="tap-row" style={style}>{inner}</button>
              )}
            </li>
          );
        })}
      </ul>
      {footer && <div style={{ fontSize: 13, color: c.text3, padding: "8px 16px 0", lineHeight: 1.4 }}>{footer}</div>}
    </section>
  );
}

export default function PlusPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user)!;
  const installEvent = usePwaStore((s) => s.installEvent);
  const waiting = usePwaStore((s) => s.waitingWorker);
  // Rendu uniquement côté client (derrière la garde d'auth) → lecture directe
  const [standalone] = useState(() => isStandalone());
  const [ios] = useState(() => isIOS());
  const [iosHelp, setIosHelp] = useState(false);

  async function logout() {
    const ok = await confirmAction({ title: `Connecté·e en tant que ${user.name}`, confirmLabel: "Se déconnecter", destructive: true });
    if (!ok) return;
    await auth.signOut();
    router.replace("/login");
  }

  async function install() {
    if (installEvent) await promptInstall();
    else setIosHelp(true);
  }

  const me = PEOPLE[user.name as keyof typeof PEOPLE] ?? PEOPLE.Ryan;
  const partner = partnerNameOf(user.name);

  const appRows: Row[] = [];
  if (!standalone && (installEvent || ios)) {
    appRows.push({ onClick: install, icon: "📲", tint: "#0A84FF", title: "Installer l'app", subtitle: "Plein écran, icône sur l'écran d'accueil" });
  }
  if (waiting) {
    appRows.push({ onClick: applyUpdate, icon: "⬆️", tint: "#30D158", title: "Mettre à jour", badge: "1" });
  }
  appRows.push({ onClick: hardRefresh, icon: "🔄", tint: "#636366", title: "Recharger l'app", subtitle: "Si quelque chose semble bloqué" });

  return (
    <Screen header={<PageHeader title="Plus" />}>
      {/* Carte profil */}
      <div style={{ margin: "18px 16px 26px", background: c.card, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: "50%", background: me.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
          {user.name[0]}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 20, fontWeight: 600 }}>{user.name}</p>
          <p style={{ fontSize: 14, color: c.text3 }}>
            Avec {partner} depuis {daysSince(TOGETHER_SINCE).toLocaleString("fr-BE")} jours
          </p>
        </div>
      </div>

      <Group
        title="Ensemble"
        rows={[
          { href: "/memory", icon: "🖼️", tint: "#BF5AF2", title: "Souvenirs", subtitle: "Tous vos moments, mois par mois" },
          { href: "/bucketlist", icon: "✨", tint: "#30D158", title: "Bucket list", subtitle: "Ce que vous rêvez de faire" },
          { href: "/gifts", icon: "🎁", tint: "#FF9F0A", title: "Cadeaux", subtitle: `Ta wishlist · idées pour ${partner}` },
          { href: "/resto", icon: "🍽️", tint: "#D6B26E", title: "Qui paie le resto ?", subtitle: "Devinez l'addition" },
          { href: "/capsule", icon: "💌", tint: "#FF2D55", title: "Capsule temporelle", subtitle: "Lettres scellées jusqu'au mariage" },
        ]}
      />

      <Group title="Application" rows={appRows} />

      <Group rows={[{ onClick: logout, icon: "↩︎", tint: "#3A3A3C", title: "Se déconnecter", danger: true }]} />

      <p style={{ textAlign: "center", fontFamily: font.serif, fontSize: 18, color: "#48484A", paddingTop: 4 }}>Nous ✦</p>

      {/* Aide installation iOS (Safari n'a pas d'invite automatique) */}
      <Sheet
        open={iosHelp}
        onClose={() => setIosHelp(false)}
        title="Installer Nous"
        footer={
          <button type="button" className="tap" style={primaryButton} onClick={() => setIosHelp(false)}>
            Compris
          </button>
        }
      >
        <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
          {[
            ["1", "Ouvre ce site dans Safari", "Les autres navigateurs iOS ne permettent pas toujours l'installation."],
            ["2", "Touche le bouton Partager", "Le carré avec une flèche vers le haut, en bas de l'écran."],
            ["3", "« Sur l'écran d'accueil »", "Fais défiler la liste si tu ne le vois pas, puis touche Ajouter."],
          ].map(([n, t, d]) => (
            <li key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: c.blue, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{n}</span>
              <span>
                <span style={{ display: "block", fontSize: 17, fontWeight: 600 }}>{t}</span>
                <span style={{ display: "block", fontSize: 15, color: c.text3, marginTop: 2, lineHeight: 1.4 }}>{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Sheet>
    </Screen>
  );
}
