"use client";
import { useAuthStore } from "@/store/authStore";
import { useMemories, usePartnerBirthday } from "@/store/dataStore";
import {
  TOGETHER_SINCE,
  COUPLE_GRADIENT,
  COUPLE_GRADIENT_BAR,
  daysSince,
  daysUntilNext,
  monthsSince,
  yearsSince,
  partnerNameOf,
} from "@/lib/couple";
import { photosOf } from "@/lib/firestore";
import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/ui/PageHeader";
import { SkeletonList } from "@/components/ui/kit";

const eyebrow: React.CSSProperties = {
  fontSize: 12, color: "#8E8E93", textTransform: "uppercase",
  fontWeight: 600, letterSpacing: 0.5, marginBottom: 12,
};

const MILESTONES = [
  { label: "100 jours", days: 100 },
  { label: "6 mois", days: 182 },
  { label: "1 an", days: 365 },
  { label: "500 jours", days: 500 },
  { label: "2 ans", days: 730 },
  { label: "1000 jours", days: 1000 },
  { label: "3 ans", days: 1095 },
  { label: "4 ans", days: 1461 },
  { label: "5 ans", days: 1826 },
  { label: "2000 jours", days: 2000 },
  { label: "6 ans", days: 2191 },
  { label: "7 ans", days: 2557 },
  { label: "3000 jours", days: 3000 },
  { label: "10 ans", days: 3652 },
];

export default function StatsPage() {
  const user = useAuthStore((s) => s.user)!;
  const { memories, loading, refresh } = useMemories();
  const partnerBirthday = usePartnerBirthday();

  const daysTogether = daysSince(TOGETHER_SINCE);
  const monthsTogether = monthsSince(TOGETHER_SINCE);
  const yearsTogether = yearsSince(TOGETHER_SINCE);
  const partnerName = partnerNameOf(user.name);
  const getDaysUntil = daysUntilNext;

  const totalMemories = memories.length;
  const memoriesWithBothWords = memories.filter(m => m.words.ryan && m.words.sarah).length;
  const memoriesWithPhoto = memories.filter(m => photosOf(m).length > 0).length;
  const uniqueLocations = [...new Set(memories.map(m => m.location.split(",")[0].trim().toLowerCase()))].length;

  const nextMilestone = MILESTONES.find(m => m.days > daysTogether);
  const lastMilestone = [...MILESTONES].reverse().find(m => m.days <= daysTogether);

  const upcomingDates = [
    { label: `Anniversaire ${partnerName}`, date: partnerBirthday, emoji: "🎂", color: "#FF6482" },
    { label: "Anniversaire de couple", date: TOGETHER_SINCE, emoji: "✦", color: "#FF2D55" },
    { label: "Saint-Valentin", date: new Date(2000, 1, 14), emoji: "💝", color: "#FF6482" },
    { label: "Noël", date: new Date(2000, 11, 25), emoji: "🎄", color: "#30D158" },
    { label: `Anniversaire ${user.name}`, date: user.birthday, emoji: "🎂", color: "#409CFF" },
  ].filter(d => d.date !== null) as { label: string; date: Date; emoji: string; color: string }[];
  upcomingDates.sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  const memoriesByYear = memories.reduce((acc, m) => {
    const y = m.date.getFullYear().toString();
    acc[y] = (acc[y] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxYear = Math.max(...Object.values(memoriesByYear), 1);

  const sinceLabel = TOGETHER_SINCE.toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Screen onRefresh={refresh} transition="push" header={<PageHeader back={{ href: "/profile", label: "Profil" }} subtitle="Ryan & Sarah" title="Notre histoire" />}>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Hero — jours ensemble, nombre en dégradé couple */}
          <div style={{ background: "#161618", borderRadius: 20, padding: "28px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden="true" style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,100,130,0.12), rgba(64,156,255,0.06) 50%, transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />
            <p style={{ fontSize: 12, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, position: "relative" }}>
              Ensemble depuis le {sinceLabel}
            </p>
            <p style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginBottom: 4, position: "relative", background: COUPLE_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
              {daysTogether}
            </p>
            <p style={{ fontSize: 16, color: "#8E8E93", marginBottom: 20, position: "relative" }}>jours partagés</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, position: "relative" }}>
              {[
                { v: yearsTogether, l: "ans" },
                { v: monthsTogether, l: "mois" },
                { v: daysTogether, l: "jours" },
              ].map((x, i) => (
                <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  {i > 0 && <div style={{ width: 1, height: 32, background: "#262629" }} />}
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>{x.v}</p>
                    <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{x.l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestone */}
          {nextMilestone && (
            <section style={{ background: "#161618", borderRadius: 16, padding: "16px 20px" }}>
              <h2 style={eyebrow}>Prochain milestone</h2>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  {lastMilestone && (
                    <p style={{ fontSize: 12, color: "#8E8E93", marginBottom: 4 }}>✓ {lastMilestone.label}</p>
                  )}
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#FFF" }}>{nextMilestone.label}</p>
                  <p style={{ fontSize: 13, color: "#AEAEB2", marginTop: 2 }}>
                    dans {nextMilestone.days - daysTogether} jours
                  </p>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, background: COUPLE_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {Math.round(((daysTogether - (lastMilestone?.days ?? 0)) / (nextMilestone.days - (lastMilestone?.days ?? 0))) * 100)}%
                </p>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(((daysTogether - (lastMilestone?.days ?? 0)) / (nextMilestone.days - (lastMilestone?.days ?? 0))) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progression vers ${nextMilestone.label}`}
                style={{ height: 6, background: "#262629", borderRadius: 3, overflow: "hidden" }}
              >
                <div style={{ height: "100%", width: `${Math.min(((daysTogether - (lastMilestone?.days ?? 0)) / (nextMilestone.days - (lastMilestone?.days ?? 0))) * 100, 100)}%`, background: COUPLE_GRADIENT_BAR, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
            </section>
          )}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Souvenirs", value: totalMemories, sub: "enregistrés", color: "#409CFF" },
              { label: "Lieux visités", value: uniqueLocations, sub: "ensemble", color: "#30D158" },
              { label: "Mots écrits", value: memoriesWithBothWords, sub: "par vous deux", color: "#FF9F0A" },
              { label: "Avec photo", value: memoriesWithPhoto, sub: "souvenirs", color: "#FF6482" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "#161618", borderRadius: 16, padding: "16px" }}>
                <p style={{ fontSize: 12, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3, marginBottom: 8 }}>{stat.label}</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: stat.color, letterSpacing: -1, lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Souvenirs par année */}
          {Object.keys(memoriesByYear).length > 0 && (
            <section style={{ background: "#161618", borderRadius: 16, padding: "16px 20px" }}>
              <h2 style={{ ...eyebrow, marginBottom: 16 }}>Souvenirs par année</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(memoriesByYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, count]) => (
                  <div key={year} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <p style={{ fontSize: 13, color: "#AEAEB2", fontWeight: 500, width: 36, flexShrink: 0 }}>{year}</p>
                    <div style={{ flex: 1, height: 6, background: "#262629", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / maxYear) * 100}%`, background: COUPLE_GRADIENT_BAR, borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: 13, color: "#8E8E93", width: 16, flexShrink: 0, textAlign: "right" }}>{count}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Prochaines dates */}
          <section style={{ background: "#161618", borderRadius: 16, padding: "16px 20px" }}>
            <h2 style={eyebrow}>Prochaines dates</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {upcomingDates.map((d, i) => {
                const daysLeft = getDaysUntil(d.date);
                return (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < upcomingDates.length - 1 ? "1px solid #262629" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "#262629", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {d.emoji}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: "#FFF", fontWeight: 500 }}>{d.label}</p>
                        <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 1 }}>
                          {d.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {daysLeft === 0 ? (
                        <p style={{ fontSize: 13, color: "#30D158", fontWeight: 600 }}>Aujourd&apos;hui 🎉</p>
                      ) : (
                        <>
                          <p style={{ fontSize: 15, fontWeight: 700, color: d.color }}>J-{daysLeft}</p>
                          <p style={{ fontSize: 12, color: "#8E8E93" }}>{daysLeft === 1 ? "demain" : `${daysLeft} jours`}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {loading && <SkeletonList rows={2} height={120} />}
        </div>
    </Screen>
  );
}
