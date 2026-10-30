"use client";
/* eslint-disable @next/next/no-img-element */
// Activité : ce que l'autre a fait (j'aime, commentaires, publications…),
// groupé par période comme sur un réseau social.

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useDataStore } from "@/store/dataStore";
import { markActivityRead, type Activity } from "@/lib/social";
import { timeAgo } from "@/lib/time";
import { c } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import { EmptyState, SkeletonList } from "@/components/ui/kit";

function sentence(a: Activity): string {
  switch (a.type) {
    case "like":
      return "a aimé votre souvenir.";
    case "comment":
      return `a commenté : ${a.text ?? ""}`;
    case "post":
      return a.text ? `a publié un nouveau souvenir : ${a.text}` : "a publié un nouveau souvenir.";
    case "word":
      return `a ajouté son mot : ${a.text ?? ""}`;
    case "bucket":
      return `a coché un rêve de la bucket list : ${a.text ?? ""} 🎉`;
    case "capsule":
      return "a scellé une lettre dans la capsule 💌";
    default:
      return "";
  }
}

function hrefOf(a: Activity): string {
  if (a.type === "bucket") return "/bucketlist";
  if (a.type === "capsule") return "/capsule";
  if (a.memoryId) return `/p/${a.memoryId}${a.type === "comment" ? "?c=1" : ""}`;
  return "/home";
}

function bucketOf(d: Date): string {
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 1 && new Date().toDateString() === d.toDateString()) return "Aujourd'hui";
  if (days < 7) return "Cette semaine";
  if (days < 30) return "Ce mois-ci";
  return "Plus tôt";
}

export default function ActivityPage() {
  const activity = useDataStore((s) => s.activity);
  const loaded = useDataStore((s) => s.activityLoaded);

  // Les notifications vues sont marquées lues (le badge disparaît)
  useEffect(() => {
    if (!loaded || !activity.some((a) => !a.read)) return;
    const t = setTimeout(() => markActivityRead(activity).catch(() => {}), 1200);
    return () => clearTimeout(t);
  }, [loaded, activity]);

  const groups = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activity) {
      const k = bucketOf(a.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return [...map.entries()];
  }, [activity]);

  return (
    <Screen header={<PageHeader title="Activité" />}>
      {!loaded ? (
        <div style={{ padding: 16 }}>
          <SkeletonList rows={6} height={56} />
        </div>
      ) : activity.length === 0 ? (
        <EmptyState icon="💌" title="Rien de neuf pour l'instant" text="Quand l'autre aimera, commentera ou publiera un souvenir, ça apparaîtra ici." />
      ) : (
        groups.map(([label, items]) => (
          <section key={label} aria-label={label} style={{ paddingTop: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, padding: "0 16px 6px" }}>{label}</h2>
            <ul style={{ listStyle: "none" }}>
              {items.map((a) => (
                <li key={a.id}>
                  <Link
                    href={hrefOf(a)}
                    className="tap-row"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", textDecoration: "none", color: c.text, background: a.read ? "transparent" : "rgba(0,149,246,0.07)" }}
                  >
                    <span style={{ position: "relative" }}>
                      <Avatar name={a.actorName} size={44} />
                      <span aria-hidden="true" style={{ position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: "50%", background: a.type === "like" ? "#FF3040" : a.type === "comment" ? c.blue : "#9B6BFF", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                        {a.type === "like" ? "♥" : a.type === "comment" ? "💬" : a.type === "post" ? "＋" : a.type === "bucket" ? "✓" : "✦"}
                      </span>
                    </span>
                    <p style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      <span style={{ fontWeight: 600 }}>{a.actorName}</span> {sentence(a)} <span style={{ color: c.text3 }}>{timeAgo(a.createdAt, true)}</span>
                    </p>
                    {a.thumb ? (
                      <img src={a.thumb} alt="" loading="lazy" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    ) : !a.read ? (
                      <span aria-label="Non lu" style={{ width: 8, height: 8, borderRadius: "50%", background: c.blue, flexShrink: 0 }} />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Screen>
  );
}
