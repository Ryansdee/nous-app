// src/lib/tokens.ts
// ─────────────────────────────────────────────────────────────
// Design tokens — Nous ✦ (palette iOS sombre)
// Source unique pour les inline styles de toute l'app.
// Contrastes texte vérifiés AA sur #000 / #1C1C1E.
// ─────────────────────────────────────────────────────────────
import type { CSSProperties } from "react";

export const c = {
  bg: "#000000",
  card: "#161618",
  card2: "#262629",
  card3: "#36363A",
  separator: "#262626",
  text: "#F5F5F5",
  text2: "#C7C7CC",
  text3: "#A8A8A8",
  blue: "#0095F6",
  link: "#4CB5F9",
  green: "#30D158",
  red: "#FF453A",
  pink: "#FF2D55",
  rose: "#FF6482",
  orange: "#FF9F0A",
  yellow: "#FFD60A",
  gold: "#D6B26E",
  purple: "#BF5AF2",
  teal: "#40C8E0",
} as const;

/** Dégradé de marque (anneaux de stories, bouton +, accents) */
export const BRAND = "linear-gradient(45deg, #FF3769 0%, #FF6B9A 35%, #9B6BFF 70%, #1E8CFF 100%)";

export const font = {
  serif: "var(--font-serif), Georgia, serif",
  sans: "var(--font-sans), system-ui, -apple-system, sans-serif",
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;

/** Taille tactile minimale (Apple HIG) */
export const TOUCH = 44;

// ── Patterns réutilisables ───────────────────────────────────

export const card: CSSProperties = {
  background: c.card,
  borderRadius: radius.lg,
};

export const eyebrow: CSSProperties = {
  fontSize: 12,
  color: c.text3,
  textTransform: "uppercase",
  fontWeight: 600,
  letterSpacing: 0.5,
};

export const label: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: c.text3,
  fontWeight: 600,
  marginBottom: 6,
  paddingLeft: 4,
};

/** 16 px minimum → pas de zoom auto iOS au focus */
export const input: CSSProperties = {
  width: "100%",
  background: c.card,
  border: "1px solid #2A2A2E",
  borderRadius: 12,
  padding: "13px 14px",
  color: c.text,
  fontSize: 16,
  fontFamily: font.sans,
  outline: "none",
  minHeight: 48,
};

export const buttonReset: CSSProperties = {
  appearance: "none",
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "inherit",
  cursor: "pointer",
};

export const primaryButton: CSSProperties = {
  ...buttonReset,
  width: "100%",
  minHeight: 50,
  borderRadius: 12,
  background: c.blue,
  color: "#FFF",
  fontSize: 16,
  fontWeight: 600,
  textAlign: "center",
};

export const secondaryButton: CSSProperties = {
  ...primaryButton,
  background: c.card2,
  color: c.text,
};

export const iconButton: CSSProperties = {
  ...buttonReset,
  width: TOUCH,
  height: TOUCH,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: radius.pill,
  flexShrink: 0,
};
