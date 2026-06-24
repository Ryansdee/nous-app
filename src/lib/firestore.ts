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
} from "firebase/firestore";
import { db } from "./firebase";

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
}

export async function getMemories(): Promise<Memory[]> {
  const q = query(collection(db, "memories"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      location: data.location,
      date: data.date.toDate(),
      photoUrl: data.photoUrl ?? null,
      photoUrls: data.photoUrls ?? [],
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      isSpecial: data.isSpecial ?? false,
      words: data.words ?? { ryan: null, sarah: null },
      createdBy: data.createdBy,
      createdAt: data.createdAt.toDate(),
    };
  });
}

export async function addMemory(data: {
  title: string;
  location: string;
  date: Date;
  photoUrl: string | null;
  isSpecial: boolean;
  word: string | null;
  authorName: string;
  createdBy: string;
}) {
  const words = {
    ryan: data.authorName === "Ryan" ? data.word : null,
    sarah: data.authorName === "Sarah" ? data.word : null,
  };

  await addDoc(collection(db, "memories"), {
    title: data.title,
    location: data.location,
    date: Timestamp.fromDate(data.date),
    photoUrl: data.photoUrl,
    isSpecial: data.isSpecial,
    words,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
  });
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
  await updateDoc(doc(db, "bucketlist"), {
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