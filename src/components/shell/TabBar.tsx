"use client";
// Tab bar façon réseau social : icônes seules, profil en avatar,
// badge rouge sur l'activité non lue.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useUnreadCount } from "@/store/dataStore";
import { haptic } from "@/lib/device";
import Avatar from "@/components/ui/Avatar";

const W = "#F5F5F5";

const icon = (a: boolean, children: ReactNode, fill = false) => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill={a && fill ? W : "none"} stroke={W} strokeWidth={a ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

type Tab = { href: string; label: string; match: string[]; render: (active: boolean) => ReactNode };

export default function TabBar() {
  const pathname = usePathname() ?? "";
  const openAdd = useUiStore((s) => s.openAddMemory);
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadCount();
  const isActive = (t: Tab) => t.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  const tabs: (Tab | "add")[] = [
    {
      href: "/home",
      label: "Fil",
      match: ["/home", "/p"],
      render: (a) => icon(a, <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z" />, true),
    },
    {
      href: "/map",
      label: "Carte",
      match: ["/map"],
      render: (a) =>
        icon(
          a,
          <>
            <circle cx="12" cy="12" r="9" fill={a ? W : "none"} />
            <path d="m15.5 8.5-2 5-5 2 2-5z" fill={a ? "#000" : "none"} stroke={a ? "#000" : W} />
          </>
        ),
    },
    "add",
    {
      href: "/activity",
      label: "Activité",
      match: ["/activity"],
      render: (a) => (
        <span style={{ position: "relative", display: "inline-flex" }}>
          {icon(a, <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />, true)}
          {unread > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -4,
                right: -7,
                minWidth: 17,
                height: 17,
                padding: "0 4px",
                borderRadius: 999,
                background: "#FF3040",
                color: "#FFF",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 2px #000",
                animation: "badge-in .25s cubic-bezier(.2,.8,.2,1) both",
              }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      ),
    },
    {
      href: "/profile",
      label: "Profil",
      match: ["/profile", "/settings", "/stats", "/memory", "/gifts", "/bucketlist", "/capsule", "/resto"],
      render: (a) => (
        <span style={{ display: "inline-flex", padding: 1.5, borderRadius: "50%", boxShadow: a ? `0 0 0 1.8px ${W}` : "none" }}>
          <Avatar name={user?.name ?? "?"} size={26} />
        </span>
      ),
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 90,
        paddingBottom: "max(var(--safe-bottom), 6px)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
        background: "rgba(0,0,0,0.96)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderTop: "0.5px solid #262626",
      }}
    >
      <ul style={{ listStyle: "none", margin: "0 auto", maxWidth: 560, display: "flex", alignItems: "stretch" }}>
        {tabs.map((t) =>
          t === "add" ? (
            <li key="add" style={{ flex: 1 }}>
              <button
                type="button"
                onClick={() => {
                  haptic(10);
                  openAdd();
                }}
                aria-label="Nouveau souvenir"
                className="tap"
                style={{ width: "100%", height: "var(--tabbar-h)", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: W }}
              >
                <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </button>
            </li>
          ) : (
            <li key={t.href} style={{ flex: 1 }}>
              <Link
                href={t.href}
                aria-label={t.label + (t.href === "/activity" && unread ? ` (${unread} non lues)` : "")}
                aria-current={isActive(t) ? "page" : undefined}
                onClick={() => !isActive(t) && haptic(6)}
                className="tap"
                style={{ height: "var(--tabbar-h)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {t.render(isActive(t))}
              </Link>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}
