"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { getMemories, getUser, Memory } from "@/lib/firestore";

const TOGETHER_SINCE = new Date(2021, 11, 22);

function getDaysTogether(): number {
  const today = new Date();
  const start = new Date(TOGETHER_SINCE.getFullYear(), TOGETHER_SINCE.getMonth(), TOGETHER_SINCE.getDate());
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now.getTime() - start.getTime()) / 86400000);
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (next <= today) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function getYearsTogether(): number {
  const now = new Date();
  return Math.floor(getDaysTogether() / 365);
}

function getMonthsTogether(): number {
  const now = new Date();
  return (now.getFullYear() - TOGETHER_SINCE.getFullYear()) * 12 + (now.getMonth() - TOGETHER_SINCE.getMonth());
}

export default function StatsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [partnerBirthday, setPartnerBirthday] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMemories(),
      user.partnerId ? getUser(user.partnerId) : Promise.resolve(null),
    ]).then(([mems, partnerData]) => {
      setMemories(mems);
      if (partnerData?.birthday) {
        const d = partnerData.birthday.toDate();
        setPartnerBirthday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }
      setLoading(false);
    });
  }, [user]);

  if (!user || loading) return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0C" }}>
      <p style={{ fontSize: 18, color: "#8E8E93" }}>Chargement...</p>
    </div>
  );

  const daysTogether = getDaysTogether();
  const monthsTogether = getMonthsTogether();
  const yearsTogether = getYearsTogether();
  const partnerName = user.name === "Ryan" ? "Sarah" : "Ryan";

  // Stats depuis les souvenirs
  const totalMemories = memories.length;
  const memoriesWithBothWords = memories.filter(m => m.words.ryan && m.words.sarah).length;
  const memoriesWithPhoto = memories.filter(m => m.photoUrl).length;
  const uniqueLocations = [...new Set(memories.map(m => m.location))].length;

  // Milestones
  const MILESTONES = [
    { label: "100 jours", days: 100 },
    { label: "6 mois", days: 182 },
    { label: "1 an", days: 365 },
    { label: "500 jours", days: 500 },
    { label: "2 ans", days: 730 },
    { label: "1000 jours", days: 1000 },
    { label: "3 ans", days: 1095 },
    { label: "5 ans", days: 1825 },
  ];

  const nextMilestone = MILESTONES.find(m => m.days > daysTogether);
  const lastMilestone = [...MILESTONES].reverse().find(m => m.days <= daysTogether);

  // Prochaines dates
  const upcomingDates = [
    { label: `Anniversaire ${partnerName}`, date: partnerBirthday, emoji: "🎂", color: "#FF2D55" },
    { label: "Anniversaire de couple", date: TOGETHER_SINCE, emoji: "✦", color: "#c9a96e" },
    { label: "Noël", date: new Date(new Date().getFullYear(), 11, 25), emoji: "🎄", color: "#30D158" },
    { label: `Anniversaire ${user.name}`, date: user.birthday, emoji: "🎂", color: "#0A84FF" },
  ].filter(d => d.date !== null) as { label: string; date: Date; emoji: string; color: string }[];

  upcomingDates.sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  // Souvenirs par année
  const memoriesByYear = memories.reduce((acc, m) => {
    const y = m.date.getFullYear().toString();
    acc[y] = (acc[y] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const maxYear = Math.max(...Object.values(memoriesByYear), 1);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0A0A0C", color: "#FFF", fontFamily: "var(--font-sans)", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "60px 20px 16px", borderBottom: "1px solid #1C1C1E" }}>
        <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
          Ryan & Sarah
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>
          Notre histoire
        </h1>
      </div>

      {/* SCROLL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ padding: "20px", paddingBottom: 100, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Hero — jours ensemble */}
          <div style={{ background: "#1C1C1E", borderRadius: 20, padding: "28px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: "rgba(201,169,110,0.05)", filter: "blur(40px)", pointerEvents: "none" }} />
            <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>
              Ensemble depuis le 22 déc. 2022
            </p>
            <p style={{ fontSize: 72, fontWeight: 800, color: "#FFF", letterSpacing: -2, lineHeight: 1, marginBottom: 4 }}>
              {daysTogether}
            </p>
            <p style={{ fontSize: 16, color: "#8E8E93", marginBottom: 20 }}>jours partagés</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>{yearsTogether}</p>
                <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>ans</p>
              </div>
              <div style={{ width: 1, background: "#2C2C2E" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>{monthsTogether}</p>
                <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>mois</p>
              </div>
              <div style={{ width: 1, background: "#2C2C2E" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5 }}>{daysTogether}</p>
                <p style={{ fontSize: 11, color: "#636366", marginTop: 2 }}>jours</p>
              </div>
            </div>
          </div>

          {/* Milestone */}
          {nextMilestone && (
            <div style={{ background: "#1C1C1E", borderRadius: 16, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
                Prochain milestone
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  {lastMilestone && (
                    <p style={{ fontSize: 12, color: "#636366", marginBottom: 4 }}>✓ {lastMilestone.label}</p>
                  )}
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#FFF" }}>{nextMilestone.label}</p>
                  <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>
                    dans {nextMilestone.days - daysTogether} jours
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#c9a96e" }}>
                    {Math.round((daysTogether / nextMilestone.days) * 100)}%
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: "#2C2C2E", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((daysTogether / nextMilestone.days) * 100, 100)}%`, background: "#c9a96e", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Souvenirs", value: totalMemories, sub: "enregistrés", color: "#0A84FF" },
              { label: "Lieux visités", value: uniqueLocations, sub: "ensemble", color: "#30D158" },
              { label: "Mots écrits", value: memoriesWithBothWords, sub: "par vous deux", color: "#FF9F0A" },
              { label: "Avec photo", value: memoriesWithPhoto, sub: "souvenirs", color: "#FF2D55" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "#1C1C1E", borderRadius: 16, padding: "16px" }}>
                <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3, marginBottom: 8 }}>{stat.label}</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: stat.color, letterSpacing: -1, lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: "#636366", marginTop: 4 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Souvenirs par année */}
          {Object.keys(memoriesByYear).length > 0 && (
            <div style={{ background: "#1C1C1E", borderRadius: 16, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 16 }}>
                Souvenirs par année
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(memoriesByYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, count]) => (
                  <div key={year} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <p style={{ fontSize: 13, color: "#AEAEB2", fontWeight: 500, width: 36, flexShrink: 0 }}>{year}</p>
                    <div style={{ flex: 1, height: 6, background: "#2C2C2E", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / maxYear) * 100}%`, background: "#0A84FF", borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: 13, color: "#636366", width: 16, flexShrink: 0, textAlign: "right" }}>{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prochaines dates */}
          <div style={{ background: "#1C1C1E", borderRadius: 16, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, color: "#8E8E93", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
              Prochaines dates
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {upcomingDates.map((d, i) => {
                const daysLeft = getDaysUntil(d.date);
                return (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < upcomingDates.length - 1 ? "1px solid #2C2C2E" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2C2C2E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {d.emoji}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: "#FFF", fontWeight: 500 }}>{d.label}</p>
                        <p style={{ fontSize: 12, color: "#636366", marginTop: 1 }}>
                          {d.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {daysLeft === 0 ? (
                        <p style={{ fontSize: 13, color: "#30D158", fontWeight: 600 }}>Aujourd'hui 🎉</p>
                      ) : (
                        <>
                          <p style={{ fontSize: 15, fontWeight: 700, color: d.color }}>J-{daysLeft}</p>
                          <p style={{ fontSize: 11, color: "#636366" }}>{daysLeft === 1 ? "demain" : `${daysLeft} jours`}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}