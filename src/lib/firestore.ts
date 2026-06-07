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
      isSpecial: data.isSpecial ?? false,
      words: {
        ryan: data.words?.ryan ?? null,
        sarah: data.words?.sarah ?? null,
      },
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