"use client";
// Feuille d'action iOS pour confirmer une action (suppression, déconnexion…).
// Usage :  const ok = await confirmAction({ title, confirmLabel, destructive: true });
// Remplace window.confirm (moche et bloquant dans une PWA) et évite
// les suppressions accidentelles d'un coup de pouce.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { haptic } from "@/lib/device";

type Request = {
  title?: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
};

const useConfirmStore = create<{
  req: Request | null;
  closing: boolean;
  open: (r: Request) => void;
  finish: (ok: boolean) => void;
}>((set, get) => ({
  req: null,
  closing: false,
  open: (req) => {
    // Une demande déjà affichée est annulée proprement
    get().req?.resolve(false);
    set({ req, closing: false });
  },
  finish: (ok) => {
    const { req, closing } = get();
    if (!req || closing) return;
    req.resolve(ok);
    set({ closing: true });
    setTimeout(() => set({ req: null, closing: false }), 200);
  },
}));

export function confirmAction(opts: Omit<Request, "resolve">): Promise<boolean> {
  haptic(12);
  return new Promise((resolve) => useConfirmStore.getState().open({ ...opts, resolve }));
}

export function ActionSheetHost() {
  const shown = useConfirmStore((s) => s.req);
  const closing = useConfirmStore((s) => s.closing);
  const finish = useConfirmStore((s) => s.finish);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, finish]);

  if (!shown || typeof document === "undefined") return null;

  const rowBase: React.CSSProperties = {
    width: "100%",
    minHeight: 56,
    border: "none",
    background: "rgba(44,44,46,0.96)",
    fontSize: 19,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1100 }}>
      <div
        onClick={() => finish(false)}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", animation: `${closing ? "fade-out" : "fade-in"} .2s ease both` }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={shown.title || shown.confirmLabel}
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          bottom: "calc(var(--safe-bottom) + 8px)",
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          animation: closing ? "sheet-down .2s ease both" : "sheet-up .28s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div style={{ borderRadius: 14, overflow: "hidden", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          {(shown.title || shown.message) && (
            <div style={{ background: "rgba(44,44,46,0.96)", padding: "14px 16px", textAlign: "center", borderBottom: "0.5px solid rgba(84,84,88,0.6)" }}>
              {shown.title && <p style={{ fontSize: 13, fontWeight: 600, color: "#AEAEB2" }}>{shown.title}</p>}
              {shown.message && <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 4, lineHeight: 1.4 }}>{shown.message}</p>}
            </div>
          )}
          <button
            type="button"
            autoFocus
            className="tap-row"
            onClick={() => {
              haptic(shown.destructive ? [10, 40, 10] : 8);
              finish(true);
            }}
            style={{ ...rowBase, color: shown.destructive ? "#FF453A" : "#409CFF" }}
          >
            {shown.confirmLabel}
          </button>
        </div>
        <button
          type="button"
          className="tap-row"
          onClick={() => finish(false)}
          style={{ ...rowBase, borderRadius: 14, color: "#409CFF", fontWeight: 600, background: "rgba(44,44,46,1)" }}
        >
          {shown.cancelLabel ?? "Annuler"}
        </button>
      </div>
    </div>,
    document.body
  );
}
