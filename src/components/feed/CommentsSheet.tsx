"use client";
// Commentaires d'un souvenir, en temps réel.
// Réactions rapides en emoji, « Répondre » (mention), suppression des siens.

import { useEffect, useRef, useState } from "react";
import { photosOf, type Memory } from "@/lib/firestore";
import { addComment, deleteComment, subscribeComments, type Comment } from "@/lib/social";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { haptic } from "@/lib/device";
import { timeAgo } from "@/lib/time";
import { c } from "@/lib/tokens";
import Sheet from "@/components/ui/Sheet";
import Avatar from "@/components/ui/Avatar";
import { confirmAction } from "@/components/ui/ActionSheet";

const QUICK = ["❤️", "😍", "🥹", "😂", "🔥", "👏", "🙌", "😘"];

export default function CommentsSheet({ memory, autoFocus, onClose }: { memory: Memory | null; autoFocus?: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)!;
  const showToast = useUiStore((s) => s.showToast);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLLIElement>(null);
  const memoryId = memory?.id ?? null;

  const [prevId, setPrevId] = useState<string | null>(null);
  if (memoryId !== prevId) {
    setPrevId(memoryId);
    setComments(null);
    setText("");
  }

  useEffect(() => {
    if (!memoryId) return;
    return subscribeComments(memoryId, setComments);
  }, [memoryId]);

  // Défile vers le dernier commentaire à chaque nouveau message
  useEffect(() => {
    if (comments?.length) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [comments?.length]);

  useEffect(() => {
    if (memoryId && autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [memoryId, autoFocus]);

  async function send(value = text) {
    if (!memory || !value.trim() || sending) return;
    setSending(true);
    haptic(8);
    setText("");
    try {
      await addComment({ uid: user.uid, name: user.name, partnerId: user.partnerId }, memory.id, value, photosOf(memory)[0] ?? null);
    } catch {
      setText(value);
      showToast("Commentaire non envoyé", "error");
    } finally {
      setSending(false);
    }
  }

  async function remove(cm: Comment) {
    if (!memory) return;
    const ok = await confirmAction({ title: "Supprimer ce commentaire ?", confirmLabel: "Supprimer", destructive: true });
    if (ok) deleteComment(memory.id, cm.id).catch(() => showToast("Suppression impossible", "error"));
  }

  function reply(name: string) {
    setText((t) => (t.startsWith(`@${name}`) ? t : `@${name} ${t}`));
    inputRef.current?.focus();
  }

  return (
    <Sheet
      open={!!memory}
      onClose={onClose}
      title="Commentaires"
      size="full"
      footer={
        <div>
          <div className="scroll-x" data-no-drag style={{ display: "flex", justifyContent: "space-between", gap: 4, margin: "0 -8px 10px" }}>
            {QUICK.map((e) => (
              <button key={e} type="button" onClick={() => send(e)} aria-label={`Réagir ${e}`} className="tap" style={{ flex: 1, minWidth: 38, height: 38, fontSize: 24, background: "none", border: "none", cursor: "pointer" }}>
                {e}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <Avatar name={user.name} size={34} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", border: "1px solid #3A3A3E", borderRadius: 999, padding: "0 4px 0 16px", minHeight: 44 }}>
              <label htmlFor="comment-input" className="sr-only">Ajouter un commentaire</label>
              <input
                id="comment-input"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ajouter un commentaire…"
                autoComplete="off"
                enterKeyHint="send"
                maxLength={1000}
                style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 16, padding: "10px 0" }}
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                style={{ background: "none", border: "none", color: c.blue, fontWeight: 600, fontSize: 15, padding: "8px 10px", cursor: "pointer", opacity: text.trim() ? 1 : 0.4 }}
              >
                Publier
              </button>
            </div>
          </form>
        </div>
      }
    >
      {comments === null ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <span className="spinner" />
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <p style={{ fontSize: 22, fontWeight: 700 }}>Aucun commentaire</p>
          <p style={{ fontSize: 14, color: c.text3, marginTop: 6 }}>Lance la conversation.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 18, paddingTop: 6 }}>
          {comments.map((cm) => {
            const mine = cm.authorUid === user.uid;
            const emojiOnly = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}‍️\s]*$/u.test(cm.text);
            return (
              <li key={cm.id} style={{ display: "flex", gap: 12, opacity: cm.pending ? 0.6 : 1, animation: "fade-in .2s ease both" }}>
                <Avatar name={cm.authorName} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{cm.authorName}</span>{" "}
                    <span style={{ color: c.text3 }}>{cm.pending ? "Envoi…" : timeAgo(cm.createdAt, true)}</span>
                  </p>
                  <p style={{ fontSize: emojiOnly ? 28 : 15, lineHeight: 1.4, marginTop: 2, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    {cm.text.split(/(@(?:Ryan|Sarah))/).map((part, i) =>
                      /^@(Ryan|Sarah)$/.test(part) ? (
                        <span key={i} style={{ color: c.link }}>{part}</span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    {!mine && (
                      <button type="button" onClick={() => reply(cm.authorName)} style={{ background: "none", border: "none", padding: "4px 0", color: c.text3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Répondre
                      </button>
                    )}
                    {mine && !cm.pending && (
                      <button type="button" onClick={() => remove(cm)} style={{ background: "none", border: "none", padding: "4px 0", color: c.text3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          <li ref={endRef} aria-hidden="true" />
        </ul>
      )}
    </Sheet>
  );
}
