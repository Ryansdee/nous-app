// src/lib/couple.ts
// ─────────────────────────────────────────────────────────────
// Source unique pour tout ce qui concerne « le couple » :
// date de début, calculs de jours, prénom du/de la partenaire.
// ⚠️ Avant, gifts/page.tsx utilisait 2022 et home/stats 2021.
// ─────────────────────────────────────────────────────────────

export const TOGETHER_SINCE = new Date(2021, 11, 22);

export const PEOPLE = {
  Ryan: { color: "#0A84FF", soft: "#409CFF" },
  Sarah: { color: "#FF2D55", soft: "#FF6482" },
} as const;

export const COUPLE_GRADIENT = "linear-gradient(135deg, #FF6482, #409CFF)";
export const COUPLE_GRADIENT_BAR = "linear-gradient(90deg, #FF2D55, #0A84FF)";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Jours entiers écoulés depuis `since` (aujourd'hui inclus = 0). */
export function daysSince(since: Date = TOGETHER_SINCE): number {
  return Math.round((startOfDay(new Date()).getTime() - startOfDay(since).getTime()) / 86400000);
}

/** Jours avant la prochaine occurrence annuelle (jour/mois) de `date`. 0 = aujourd'hui. */
export function daysUntilNext(date: Date): number {
  const today = startOfDay(new Date());
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function monthsSince(since: Date = TOGETHER_SINCE): number {
  const now = new Date();
  let m = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
  if (now.getDate() < since.getDate()) m -= 1;
  return Math.max(0, m);
}

export function yearsSince(since: Date = TOGETHER_SINCE): number {
  return Math.floor(monthsSince(since) / 12);
}

export function partnerNameOf(name: string | undefined | null): string {
  return name === "Ryan" ? "Sarah" : "Ryan";
}

export function formatDate(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return d.toLocaleDateString("fr-BE", opts);
}
