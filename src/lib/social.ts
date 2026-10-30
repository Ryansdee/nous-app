// src/lib/social.ts
// Couche « réseau social » : j'aime, enregistrés, commentaires, activité.
//
// Firestore :
//   memories/{id}                 likes: string[], savedBy: string[], commentCount: number
//   memories/{id}/comments/{cid}  { text, authorUid, authorName, createdAt }
//   activity/{aid}                { type, toUid, actorUid, actorName, memoryId, thumb, text, read, createdAt }

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type Actor = { uid: string; name: string; partnerId: string };

/* ── Activité ──────────────────────────────────────────────── */

export type ActivityType = "post" | "like" | "comment" | "word" | "bucket" | "capsule";

export interface Activity {
  id: string;
  type: ActivityType;
  toUid: string;
  actorUid: string;
  actorName: string;
  memoryId: string | null;
  thumb: string | null;
  text: string | null;
  read: boolean;
  createdAt: Date;
}

/** Notifie l'autre (jamais soi-même). Ne bloque jamais l'action principale. */
export async function notify(
  actor: Actor,
  type: ActivityType,
  extra: { memoryId?: string | null; thumb?: string | null; text?: string | null } = {}
) {
  if (!actor.partnerId) return;
  try {
    await addDoc(collection(db, "activity"), {
      type,
      toUid: actor.partnerId,
      actorUid: actor.uid,
      actorName: actor.name,
      memoryId: extra.memoryId ?? null,
      thumb: extra.thumb ?? null,
      text: extra.text ? extra.text.slice(0, 140) : null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("activity:", e);
  }
}

/** Activité reçue, temps réel. (Tri côté client → pas d'index composite requis.) */
export function subscribeActivity(uid: string, cb: (a: Activity[]) => void): () => void {
  const q = query(collection(db, "activity"), where("toUid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          type: x.type,
          toUid: x.toUid,
          actorUid: x.actorUid,
          actorName: x.actorName,
          memoryId: x.memoryId ?? null,
          thumb: x.thumb ?? null,
          text: x.text ?? null,
          read: !!x.read,
          createdAt: (x.createdAt as Timestamp | null)?.toDate?.() ?? new Date(),
        } as Activity;
      });
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      cb(list.slice(0, 150));
    },
    (e) => console.warn("activity:", e)
  );
}

export async function markActivityRead(items: Activity[]) {
  const unread = items.filter((a) => !a.read);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.slice(0, 400).forEach((a) => batch.update(doc(db, "activity", a.id), { read: true }));
  await batch.commit();
}

/* ── J'aime / enregistrés ──────────────────────────────────── */

export async function setLike(actor: Actor, memoryId: string, liked: boolean, thumb: string | null) {
  await updateDoc(doc(db, "memories", memoryId), {
    likes: liked ? arrayUnion(actor.uid) : arrayRemove(actor.uid),
  });
  if (liked) notify(actor, "like", { memoryId, thumb });
}

export async function setSaved(uid: string, memoryId: string, saved: boolean) {
  await updateDoc(doc(db, "memories", memoryId), {
    savedBy: saved ? arrayUnion(uid) : arrayRemove(uid),
  });
}

/* ── Commentaires ──────────────────────────────────────────── */

export interface Comment {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: Date;
  pending: boolean;
}

export function subscribeComments(memoryId: string, cb: (c: Comment[]) => void): () => void {
  const q = query(collection(db, "memories", memoryId, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: "estimate" });
          return {
            id: d.id,
            text: x.text,
            authorUid: x.authorUid,
            authorName: x.authorName,
            createdAt: x.createdAt?.toDate?.() ?? new Date(),
            pending: d.metadata.hasPendingWrites,
          };
        })
      ),
    (e) => console.warn("comments:", e)
  );
}

export async function addComment(actor: Actor, memoryId: string, text: string, thumb: string | null) {
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;
  await addDoc(collection(db, "memories", memoryId, "comments"), {
    text: clean,
    authorUid: actor.uid,
    authorName: actor.name,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "memories", memoryId), { commentCount: increment(1) });
  notify(actor, "comment", { memoryId, thumb, text: clean });
}

export async function deleteComment(memoryId: string, commentId: string) {
  await deleteDoc(doc(db, "memories", memoryId, "comments", commentId));
  await updateDoc(doc(db, "memories", memoryId), { commentCount: increment(-1) });
}
