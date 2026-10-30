"use client";
// Squelette d'un écran : en-tête fixe + zone scrollable qui s'arrête
// au-dessus de la tab bar. Option : tirer pour rafraîchir (absent
// nativement dans une PWA iOS installée).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { haptic } from "@/lib/device";

type Props = {
  header?: ReactNode;
  children: ReactNode;
  onRefresh?: () => Promise<unknown> | void;
  /** Style du contenu (padding…) */
  contentStyle?: CSSProperties;
  /** Animation d'entrée : "fade" (onglet) ou "push" (sous-page) */
  transition?: "fade" | "push";
};

const TRIGGER = 70;
const MAX_PULL = 110;

export default function Screen({ header, children, onRefresh, contentStyle, transition = "fade" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);
  const busy = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onRefresh) return;
    let startY = 0;
    let startX = 0;
    let active = false;
    let decided = false;
    let dist = 0;
    let buzzed = false;

    const onStart = (e: TouchEvent) => {
      if (busy.current || el.scrollTop > 0) {
        active = false;
        return;
      }
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      active = true;
      decided = false;
      dist = 0;
      buzzed = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (!decided) {
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        decided = true;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || el.scrollTop > 0) {
          active = false;
          return;
        }
      }
      if (dy <= 0) {
        dist = 0;
        setPull(0);
        return;
      }
      e.preventDefault();
      dist = Math.min(MAX_PULL, dy * 0.5);
      if (dist >= TRIGGER && !buzzed) {
        buzzed = true;
        haptic(10);
      }
      setPull(dist);
    };
    const onEnd = async () => {
      if (!active) return;
      active = false;
      if (dist >= TRIGGER && refreshRef.current) {
        busy.current = true;
        setRefreshing(true);
        setPull(56);
        try {
          await refreshRef.current();
        } finally {
          busy.current = false;
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh]);

  const progress = Math.min(1, pull / TRIGGER);

  return (
    <div
      className={transition === "push" ? "push-in" : "screen-in"}
      style={{ height: "100%", display: "flex", flexDirection: "column", background: "#000", overflow: "hidden" }}
    >
      {header}
      <div ref={scrollRef} className="scroll-y" style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {onRefresh && (
          <div
            aria-hidden={!refreshing}
            role={refreshing ? "status" : undefined}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: pull,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {refreshing ? (
              <>
                <span className="spinner" />
                <span className="sr-only">Actualisation…</span>
              </>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8E8E93"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: progress, transform: `rotate(${progress >= 1 ? 180 : 0}deg)`, transition: "transform .2s" }}
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            )}
          </div>
        )}
        <div
          ref={innerRef}
          style={{
            transform: pull ? `translateY(${pull}px)` : undefined,
            transition: pull === 0 || refreshing ? "transform .3s cubic-bezier(.2,.8,.2,1)" : "none",
            paddingBottom: "calc(var(--tabbar-space) + 28px)",
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
