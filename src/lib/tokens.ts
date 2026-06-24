// src/lib/tokens.ts
// ─────────────────────────────────────────────────────────────
// Design tokens — Nous ✦
// Source unique de vérité pour les inline styles.
// Tous les contrastes texte/fond sont vérifiés WCAG AA (≥ 4.5:1)
// sur le fond #0d0d0d.
// ─────────────────────────────────────────────────────────────

export const colors = {
  // Fonds
  bg: "#0d0d0d",
  surface: "#161616",        // cards — légèrement éclairci pour mieux se détacher du bg
  surfaceRaised: "#1d1d1d",  // modals, bottom sheets

  // Texte
  text: "#f0ede8",           // contraste ~16:1 sur bg ✓
  textSecondary: "#b5afa5",  // contraste ~8:1 sur bg ✓ (pour le contenu secondaire)
  muted: "#9c968c",          // contraste ~5.9:1 sur bg ✓ (labels, dates — minimum autorisé)
  // ⚠️ Ne JAMAIS descendre sous #8a8a8a pour du texte sur #0d0d0d (AA = 4.5:1)

  // Accent
  accent: "#c9a96e",         // contraste ~8.6:1 sur bg ✓
  accentSoft: "rgba(201, 169, 110, 0.12)",  // fonds de chips/tags uniquement, jamais pour du texte
  onAccent: "#0d0d0d",       // texte sur bouton doré ✓

  // Sarah / Ryan
  rose: "#e8b4b4",           // contraste ~9:1 sur bg ✓
  roseSoft: "rgba(232, 180, 180, 0.12)",

  // Bordures — passées de 0.5px semi-transparent à des valeurs visibles
  border: "rgba(240, 237, 232, 0.14)",
  borderStrong: "rgba(240, 237, 232, 0.24)",  // éléments interactifs

  // États sémantiques (jamais utilisés seuls : toujours accompagnés d'un texte/badge)
  success: "#8fbf9a",
  danger: "#d98a8a",
} as const;

export const font = {
  serif: "var(--font-serif)",  // Cormorant Garamond
  sans: "var(--font-sans)",    // DM Sans

  // Échelle de tailles — 13px = plancher absolu (labels uniquement)
  size: {
    label: 13,      // dates, tags, eyebrows — REMPLACE les anciens 11px/12px
    body: 15,
    bodyLarge: 17,
    title: 20,
    display: 28,    // topbar-title
    hero: 44,       // logo login
  },

  // 16px minimum sur TOUT input/textarea/select → empêche le zoom auto iOS
  inputSize: 16,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

// Taille tactile minimale (Apple HIG : 44pt)
export const TOUCH_TARGET = 44;

// ─────────────────────────────────────────────────────────────
// Styles réutilisables pour les patterns récurrents
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

/** Card standard (surface + bordure visible) */
export const cardStyle: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
};

/**
 * Reset pour transformer un <button> en élément stylable librement.
 * À utiliser pour convertir les anciens <div onClick> :
 * <button style={{ ...buttonReset, ...tesStyles }}>
 */
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

/**
 * Zone tactile élargie pour les petites icônes (like, fermer, etc.)
 * L'icône reste petite visuellement, la zone cliquable fait 44×44.
 */
export const touchTarget: CSSProperties = {
  minWidth: TOUCH_TARGET,
  minHeight: TOUCH_TARGET,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Scrim à poser entre une image/fond saisonnier et du texte.
 * <div style={{ position: "relative" }}>
 *   <img ... />
 *   <div style={scrimStyle} />
 *   <p style={{ position: "relative", zIndex: 1 }}>texte lisible</p>
 * </div>
 */
export const scrimStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(13,13,13,0.25) 0%, rgba(13,13,13,0.75) 100%)",
  pointerEvents: "none",
};

/** Input conforme : 16px (pas de zoom iOS), label requis à côté */
export const inputStyle: CSSProperties = {
  fontSize: font.inputSize,
  fontFamily: font.sans,
  color: colors.text,
  background: colors.surfaceRaised,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radius.sm,
  padding: "12px 14px",
  width: "100%",
};