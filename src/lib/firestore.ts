import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  updateDoc,
  Timestamp,
  deleteDoc,
  onSnapshot,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { compressImage } from "./device";

/** Compresse puis envoie une photo dans Storage, renvoie son URL publique. */
export async function uploadPhoto(path: string, file: File): Promise<string> {
  const small = await compressImage(file);
  const ext = small.type === "image/jpeg" ? "jpg" : (small.name.split(".").pop() || "img");
  const storageRef = ref(storage, `${path}.${ext}`);
  await uploadBytes(storageRef, small, { contentType: small.type, cacheControl: "public, max-age=31536000, immutable" });
  return getDownloadURL(storageRef);
}

export async function getUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function createUser(
  uid: string,
  data: {
    name: string;
    email: string;
    partnerId: string;
    birthday?: Date;
  }
) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    weddingDate: null,
    createdAt: Timestamp.now(),
  });
}

export interface Memory {
  id: string;
  title: string;
  location: string;
  date: Date;
  photoUrl: string | null;
  photoUrls?: string[];
  lat: number | null;
  lng: number | null;
  isSpecial: boolean;
  words: {
    ryan: string | null;
    sarah: string | null;
  };
  createdBy: string;
  createdAt: Date;
  /** uid de ceux qui ont aimé */
  likes: string[];
  /** uid de ceux qui ont enregistré le souvenir */
  savedBy: string[];
  commentCount: number;
}

export function mapMemory(d: DocumentSnapshot<DocumentData>): Memory {
  const data = d.data() ?? {};
  return {
    id: d.id,
    title: data.title ?? "",
    location: data.location ?? "",
    date: data.date?.toDate?.() ?? new Date(),
    photoUrl: data.photoUrl ?? null,
    photoUrls: data.photoUrls ?? [],
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    isSpecial: data.isSpecial ?? false,
    words: data.words ?? { ryan: null, sarah: null },
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    likes: data.likes ?? [],
    savedBy: data.savedBy ?? [],
    commentCount: data.commentCount ?? 0,
  };
}

export async function getMemories(): Promise<Memory[]> {
  const q = query(collection(db, "memories"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(mapMemory);
}

/** Souvenirs en temps réel (likes, commentaires, nouveaux posts de l'autre). */
export function subscribeMemories(cb: (m: Memory[]) => void, onError?: (e: Error) => void): () => void {
  const q = query(collection(db, "memories"), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map(mapMemory)), onError);
}

/** Toutes les photos d'un souvenir (ancien champ photoUrl comme nouveau photoUrls). */
export function photosOf(m: Memory): string[] {
  if (m.photoUrls && m.photoUrls.length) return m.photoUrls;
  return m.photoUrl ? [m.photoUrl] : [];
}

/**
 * Crée un souvenir complet : document + upload des photos (compressées)
 * dans l'ordre de sélection. `onProgress` est appelé après chaque photo.
 */
export async function createMemory(
  data: {
    title: string;
    location: string;
    date: Date;
    lat: number | null;
    lng: number | null;
    word: string | null;
    authorName: string;
    createdBy: string;
  },
  photos: File[],
  onProgress?: (done: number, total: number) => void
): Promise<{ id: string; cover: string | null }> {
  const docRef = await addDoc(collection(db, "memories"), {
    title: data.title,
    location: data.location,
    date: Timestamp.fromDate(data.date),
    photoUrl: null,
    photoUrls: [],
    lat: data.lat,
    lng: data.lng,
    isSpecial: !!data.word,
    words: {
      ryan: data.authorName === "Ryan" ? data.word || null : null,
      sarah: data.authorName === "Sarah" ? data.word || null : null,
    },
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
    likes: [],
    savedBy: [],
    commentCount: 0,
  });

  if (photos.length > 0) {
    const urls: string[] = [];
    onProgress?.(0, photos.length);
    for (let i = 0; i < photos.length; i++) {
      urls.push(await uploadPhoto(`memories/${docRef.id}/${i}-${Date.now()}`, photos[i]));
      onProgress?.(i + 1, photos.length);
    }
    await updateDoc(doc(db, "memories", docRef.id), { photoUrl: urls[0] ?? null, photoUrls: urls });
    return { id: docRef.id, cover: urls[0] ?? null };
  }
  return { id: docRef.id, cover: null };
}

export async function addWordToMemory(
  memoryId: string,
  name: string,
  word: string
) {
  const field = name === "Ryan" ? "words.ryan" : "words.sarah";
  await updateDoc(doc(db, "memories", memoryId), {
    [field]: word,
  });
}

// gift items

export interface GiftItem {
  id: string;
  name: string;
  price: number;
  link: string;
  emoji: string;
  addedAt: Date;
  reservedBy: string | null; // uid de celui qui réserve
}

export async function getGifts(userId: string): Promise<GiftItem[]> {
  const q = query(
    collection(db, "gifts", userId, "items"),
    orderBy("addedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    price: d.data().price,
    link: d.data().link ?? "",
    emoji: d.data().emoji ?? "🎁",
    addedAt: d.data().addedAt.toDate(),
    reservedBy: d.data().reservedBy ?? null,
  }));
}

export async function addGift(userId: string, data: {
  name: string;
  price: number;
  link: string;
  emoji: string;
}) {
  await addDoc(collection(db, "gifts", userId, "items"), {
    ...data,
    reservedBy: null,
    addedAt: Timestamp.now(),
  });
}

export async function deleteGift(userId: string, itemId: string) {
  await deleteDoc(doc(db, "gifts", userId, "items", itemId));
}

export async function reserveGift(partnerUid: string, itemId: string, reserverUid: string | null) {
  await updateDoc(doc(db, "gifts", partnerUid, "items", itemId), {
    reservedBy: reserverUid,
  });
}

// bucket list items

export interface BucketItem {
  id: string;
  title: string;
  category: "voyage" | "restaurant" | "activité" | "autre";
  emoji: string;
  done: boolean;
  doneAt: Date | null;
  donePhotoUrl: string | null;
  addedBy: string;
  addedAt: Date;
}

export async function getBucketList(): Promise<BucketItem[]> {
  const q = query(collection(db, "bucketlist"), orderBy("addedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    title: d.data().title,
    category: d.data().category ?? "autre",
    emoji: d.data().emoji ?? "✨",
    done: d.data().done ?? false,
    doneAt: d.data().doneAt?.toDate() ?? null,
    donePhotoUrl: d.data().donePhotoUrl ?? null,
    addedBy: d.data().addedBy,
    addedAt: d.data().addedAt.toDate(),
  }));
}

export async function addBucketItem(data: {
  title: string;
  category: string;
  emoji: string;
  addedBy: string;
}) {
  await addDoc(collection(db, "bucketlist"), {
    ...data,
    done: false,
    doneAt: null,
    donePhotoUrl: null,
    addedAt: Timestamp.now(),
  });
}

export async function toggleBucketItem(itemId: string, done: boolean) {
  await updateDoc(doc(db, "bucketlist", itemId), {
    done,
    doneAt: done ? Timestamp.now() : null,
  });
}

export async function completeBucketItem(itemId: string, photoUrl: string | null) {
  await updateDoc(doc(db, "bucketlist", itemId), {
    done: true,
    doneAt: Timestamp.now(),
    donePhotoUrl: photoUrl,
  });
}

export async function deleteBucketItem(itemId: string) {
  await deleteDoc(doc(db, "bucketlist", itemId));
}