"use client";
// Barre du haut façon réseau social :
// - écran racine : titre aligné à gauche (gras), actions à droite
// - sous-page    : chevron retour, titre centré, actions à droite
import Link from "next/link";
import type { ReactNode } from "react";
import { c } from "@/lib/tokens";

type Props = {
  title: ReactNode;
  /** Petit texte au-dessus du titre (racine) ou sous le titre (sous-page) */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  right?: ReactNode;
  /** Contenu sous la barre (onglets, filtres…) */
  children?: ReactNode;
  bare?: boolean;
};

export default function PageHeader({ title, eyebrow, subtitle, back, right, children, bare }: Props) {
  const meta = subtitle ?? eyebrow;
  return (
    <header
      style={{
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
        paddingTop: "var(--safe-top)",
        background: "rgba(0,0,0,0.94)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: bare ? "none" : `0.5px solid ${c.separator}`,
      }}
    >
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 6px 0 4px", gap: 4 }}>
        {back ? (
          <>
            <Link
              href={back.href}
              aria-label={`Retour : ${back.label}`}
              className="tap"
              style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: c.text, flexShrink: 0 }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.2 }}>{title}</h1>
              {meta && <p style={{ fontSize: 12, color: c.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</p>}
            </div>
            <div style={{ minWidth: 44, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>{right}</div>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, letterSpacing: -0.5, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
              {meta && <p style={{ fontSize: 12, color: c.text3, marginTop: 1 }}>{meta}</p>}
            </div>
            {right && <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{right}</div>}
          </>
        )}
      </div>
      {children && <div style={{ padding: "0 16px 10px" }}>{children}</div>}
    </header>
  );
}
