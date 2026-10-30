"use client";
// Petites briques UI partagées : contrôle segmenté, chips, état vide,
// squelettes, bouton icône « + », champ de formulaire.

import type { CSSProperties, ReactNode } from "react";
import { c, iconButton, input as inputStyle, label as labelStyle } from "@/lib/tokens";
import { haptic } from "@/lib/device";

/* ── Onglets soulignés (style profil réseau social) ──────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" aria-label={label} style={{ position: "relative", display: "flex", margin: "0 -16px -10px", borderTop: `0.5px solid ${c.separator}` }}>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 1.5,
          width: `${100 / options.length}%`,
          transform: `translateX(${idx * 100}%)`,
          background: "#F5F5F5",
          transition: "transform .25s cubic-bezier(.2,.8,.2,1)",
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic(6);
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              border: "none",
              background: "transparent",
              color: active ? c.text : c.text3,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              padding: "0 6px",
              transition: "color .2s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Chips horizontales (filtres) ─────────────────────────────── */
export function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="scroll-x" style={{ display: "flex", gap: 8, margin: "0 -16px", padding: "0 16px" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            className="tap"
            onClick={() => {
              haptic(6);
              onChange(o.value);
            }}
            style={{
              flexShrink: 0,
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: "none",
              background: active ? "#F5F5F5" : c.card2,
              color: active ? "#000" : c.text,
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── État vide ────────────────────────────────────────────────── */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {icon && <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 6 }}>{icon}</div>}
      <p style={{ fontSize: 17, color: c.text, fontWeight: 600 }}>{title}</p>
      {text && <p style={{ fontSize: 15, color: c.text3, lineHeight: 1.45, maxWidth: 280 }}>{text}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ── Squelettes ───────────────────────────────────────────────── */
export function SkeletonList({ rows = 4, height = 72 }: { rows?: number; height?: number }) {
  return (
    <div aria-busy="true" aria-label="Chargement" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 16 }} />
      ))}
    </div>
  );
}

/* ── Bouton icône (barres du haut) ─────────────────────────── */
export function HeaderButton({
  onClick,
  label,
  children,
  badge,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  filled?: boolean;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic(8);
        onClick();
      }}
      aria-label={label}
      className="tap"
      style={{ ...iconButton, color: c.text, position: "relative" }}
    >
      {children}
      {badge && <span aria-hidden="true" style={{ position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: "50%", background: "#FF3040", boxShadow: "0 0 0 2px #000" }} />}
    </button>
  );
}

/** « + » dans un carré arrondi (créer) */
export function PlusIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/* ── Champ de formulaire (label + input) ──────────────────────── */
export function Field({ id, label, hint, children, style }: { id?: string; label: string; hint?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 13, color: c.text3, marginTop: 6, paddingLeft: 4 }}>{hint}</div>}
    </div>
  );
}

export { inputStyle };

/* ── Grille de choix d'emoji ──────────────────────────────────── */
export function EmojiPicker({ value, onChange, emojis }: { value: string; onChange: (e: string) => void; emojis: string[] }) {
  return (
    <div role="radiogroup" aria-label="Icône" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: 6 }}>
      {emojis.map((e) => {
        const active = value === e;
        return (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              haptic(6);
              onChange(e);
            }}
            className="tap"
            style={{
              height: 44,
              borderRadius: 12,
              background: active ? c.card3 : c.card2,
              border: active ? "2px solid #FFF" : "2px solid transparent",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}
