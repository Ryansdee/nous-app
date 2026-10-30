"use client";
// Bottom sheet façon iOS :
// - glisser vers le bas (poignée, en-tête, ou contenu déjà en haut) pour fermer
// - suit le clavier (visualViewport) → le bouton d'action reste visible
// - verrouille le scroll derrière, Échap pour fermer, focus géré
// - rendu dans un portal → toujours au-dessus de la tab bar

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { c, iconButton } from "@/lib/tokens";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Petit texte au-dessus du titre */
  eyebrow?: ReactNode;
  children: ReactNode;
  /** Zone collée en bas (bouton principal) — reste au-dessus du clavier */
  footer?: ReactNode;
  /** "auto" = hauteur du contenu ; "full" = quasi plein écran (formulaires longs) */
  size?: "auto" | "full";
  /** Empêche la fermeture (pendant un envoi par ex.) */
  locked?: boolean;
};

const CLOSE_DISTANCE = 110;

export default function Sheet({ open, onClose, title, eyebrow, children, footer, size = "auto", locked = false }: Props) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [kb, setKb] = useState(0);
  const [vh, setVh] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // Montage / démontage avec animation de sortie (état dérivé de `open`)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
      setEntered(false);
    } else if (mounted) {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (open) lastFocus.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      lastFocus.current?.focus?.();
    }, 240);
    return () => clearTimeout(t);
  }, [closing]);

  const requestClose = useCallback(() => {
    if (!lockedRef.current) onClose();
  }, [onClose]);

  // Focus + Échap
  useEffect(() => {
    if (!mounted || closing) return;
    const t = setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, closing, requestClose]);

  // Clavier virtuel : on remonte la feuille de la hauteur du clavier
  useEffect(() => {
    if (!mounted) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb(inset > 80 ? inset : 0);
      setVh(vv.height);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [mounted]);

  // Glisser pour fermer (listeners natifs non-passifs)
  useEffect(() => {
    const panel = panelRef.current;
    if (!mounted || !panel) return;
    let startY = 0;
    let startX = 0;
    let dy = 0;
    let dragging = false;
    let decided = false;
    let allowed = false;

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const inBody = bodyRef.current?.contains(target);
      // Depuis le contenu : seulement si celui-ci est déjà tout en haut
      allowed = !inBody || (bodyRef.current?.scrollTop ?? 0) <= 0;
      if (target.closest("input, textarea, select, [data-no-drag]")) allowed = false;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      dy = 0;
      dragging = false;
      decided = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!allowed || lockedRef.current) return;
      const y = e.touches[0].clientY - startY;
      const x = e.touches[0].clientX - startX;
      if (!decided) {
        if (Math.abs(y) < 6 && Math.abs(x) < 6) return;
        decided = true;
        dragging = y > 0 && Math.abs(y) > Math.abs(x);
        if (dragging) {
          (document.activeElement as HTMLElement | null)?.blur?.();
        }
      }
      if (!dragging) return;
      e.preventDefault();
      dy = Math.max(0, y);
      panel.style.transition = "none";
      panel.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      if (dy > CLOSE_DISTANCE) {
        panel.style.setProperty("--drag", `${dy}px`);
        requestClose();
      } else {
        panel.style.transition = "transform .25s cubic-bezier(.2,.8,.2,1)";
        panel.style.transform = "translateY(0)";
      }
    };
    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd);
    panel.addEventListener("touchcancel", onEnd);
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
    };
  }, [mounted, requestClose]);

  // Réinitialise la position quand on ré-ouvre
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.style.transform = "";
      panelRef.current.style.transition = "";
      panelRef.current.style.removeProperty("--drag");
    }
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  const available = (vh ?? (typeof window !== "undefined" ? window.innerHeight : 800));
  const maxH = kb > 0 ? available - 8 : `calc(100dvh - var(--safe-top) - 24px)`;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
      {/* Fond */}
      <div
        onClick={requestClose}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          animation: `${closing ? "fade-out" : "fade-in"} .24s ease both`,
        }}
      />

      {/* Panneau */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && !closing) setEntered(true);
        }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: kb,
          margin: "0 auto",
          maxWidth: 640,
          height: size === "full" && kb === 0 ? maxH : undefined,
          maxHeight: maxH,
          display: "flex",
          flexDirection: "column",
          background: c.card,
          borderRadius: kb > 0 ? 18 : "18px 18px 0 0",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
          outline: "none",
          // L'animation d'entrée est retirée une fois finie, sinon son
          // « fill » écraserait le transform appliqué pendant le drag.
          animation: closing
            ? "sheet-down .24s cubic-bezier(.4,0,1,1) both"
            : entered
              ? "none"
              : "sheet-up .32s cubic-bezier(.2,.8,.2,1) both",
          transition: "bottom .2s ease",
        }}
      >
        {/* Poignée + en-tête (zone de drag) */}
        <div style={{ flexShrink: 0, padding: "8px 8px 0", touchAction: "none" }}>
          <div aria-hidden="true" style={{ width: 38, height: 5, borderRadius: 3, background: "#48484A", margin: "0 auto 6px" }} />
          {(title || eyebrow) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px 10px 12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {eyebrow && (
                  <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: c.text3, marginBottom: 2 }}>
                    {eyebrow}
                  </p>
                )}
                {title && (
                  <h2 id={titleId} style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: c.text }}>
                    {title}
                  </h2>
                )}
              </div>
              <button
                type="button"
                onClick={requestClose}
                disabled={locked}
                aria-label="Fermer"
                className="tap"
                style={{ ...iconButton, width: 32, height: 32, background: c.card2, color: c.text2, margin: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div
          ref={bodyRef}
          className="scroll-y"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            padding: footer ? "4px 20px 12px" : `4px 20px calc(${kb > 0 ? "0px" : "var(--safe-bottom)"} + 24px)`,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: `10px 20px calc(${kb > 0 ? "0px" : "var(--safe-bottom)"} + 14px)`,
              borderTop: `0.5px solid ${c.separator}`,
              background: c.card,
              borderRadius: kb > 0 ? "0 0 18px 18px" : 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
