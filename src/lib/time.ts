// Dates relatives façon réseau social : « à l'instant », « 5 min », « 3 h », « 2 j »…

export function timeAgo(date: Date, short = false): string {
  const s = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return short ? `${m} min` : `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return short ? `${h} h` : `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return short ? `${d} j` : `il y a ${d} j`;
  const w = Math.floor(d / 7);
  if (d < 30) return short ? `${w} sem` : `il y a ${w} sem`;
  return date.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: short ? "short" : "long",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** « 12 octobre » / « 12 octobre 2024 » selon l'année. */
export function smartDate(date: Date): string {
  return date.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}
