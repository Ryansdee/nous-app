"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

const ACTIVE = "#FFFFFF";
const INACTIVE = "#8E8E93"; // contraste AA sur le fond de la barre (≈ 5.6:1)

type Tab = {
  id: string;
  path: string;
  label: string;
  icon: (active: boolean) => ReactNode;
};

const svgProps = (active: boolean) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: active ? ACTIVE : INACTIVE,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

const TABS: Tab[] = [
  {
    id: "home",
    path: "/home",
    label: "Accueil",
    icon: (a) => (
      <svg {...svgProps(a)} fill={a ? ACTIVE : "none"}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" stroke={a ? "#121214" : INACTIVE} />
      </svg>
    ),
  },
  {
    id: "stats",
    path: "/stats",
    label: "Histoire",
    icon: (a) => (
      <svg {...svgProps(a)} fill={a ? ACTIVE : "none"}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: "map",
    path: "/map",
    label: "Carte",
    icon: (a) => (
      <svg {...svgProps(a)}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" fill={a ? ACTIVE : "none"} />
      </svg>
    ),
  },
  {
    id: "resto",
    path: "/resto",
    label: "Resto",
    icon: (a) => (
      <svg {...svgProps(a)}>
        {/* fourchette */}
        <path d="M6 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" />
        <line x1="8" y1="3" x2="8" y2="21" />
        {/* couteau */}
        <path d="M18 21V3c-2 1.5-3 4.5-3 8h3" fill={a ? ACTIVE : "none"} />
      </svg>
    ),
  },
  {
    id: "gifts",
    path: "/gifts",
    label: "Cadeaux",
    icon: (a) => (
      <svg {...svgProps(a)}>
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" fill={a ? ACTIVE : "none"} />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    id: "bucketlist",
    path: "/bucketlist",
    label: "Liste",
    icon: (a) => (
      <svg {...svgProps(a)}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <polyline points="3 6 4 7 6 5" />
        <polyline points="3 12 4 13 6 11" />
        <polyline points="3 18 4 19 6 17" />
      </svg>
    ),
  },
  {
    id: "capsule",
    path: "/capsule",
    label: "Capsule",
    icon: (a) => (
      <svg {...svgProps(a)}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill={a ? ACTIVE : "none"} />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const css = `
.nv-tab { -webkit-tap-highlight-color: transparent; }
.nv-tab:focus-visible { outline: 2px solid #D6B26E; outline-offset: -2px; border-radius: 12px; }
.nv-tab:active .nv-icon { transform: scale(0.9); }
.nv-icon { transition: transform .15s ease; }
@media (prefers-reduced-motion: reduce) { .nv-icon { transition: none; } }
`;

const barStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 90,
  paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
  background: "rgba(18,18,20,0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderTop: "0.5px solid rgba(255,255,255,0.08)",
};

export default function Navbar() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Navigation principale" style={barStyle}>
      <style>{css}</style>
      <ul
        style={{
          listStyle: "none",
          margin: "0 auto",
          padding: "6px 4px 0",
          maxWidth: 560,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`);
          return (
            <li key={tab.id} style={{ flex: 1, minWidth: 0 }}>
              <Link
                href={tab.path}
                className="nv-tab"
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  minHeight: 48,
                  padding: "4px 0",
                  textDecoration: "none",
                }}
              >
                <span className="nv-icon" style={{ display: "flex" }}>
                  {tab.icon(active)}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    lineHeight: 1.2,
                    color: active ? ACTIVE : INACTIVE,
                    fontFamily: "var(--font-sans)",
                    fontWeight: active ? 600 : 500,
                    letterSpacing: 0.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}