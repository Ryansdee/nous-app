import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type RestoStatus = 'open' | 'done';

export interface RestoBet {
  id: string;
  restaurant: string;
  status: RestoStatus;
  predictions: Record<string, number>;
  names: Record<string, string>;
  actual: number | null;
  winnerUid: string | null;
  loserUid: string | null;
  createdBy: string;
  createdAt: Timestamp | null;
  closedAt: Timestamp | null;
}

export interface RestoResult {
  restaurant: string;
  actual: number;
  winnerUid: string | null;
  loserUid: string | null;
}

const COL = 'restoBets';
const betsRef = collection(db, COL);

/* ---------- Helpers ---------- */

const euro = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });

export function formatEuro(n: number): string {
  return euro.format(n);
}

/** Accepte "42", "42,5", "42.50", "42 €" → 42.5 ; null si invalide */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Math.round(parseFloat(cleaned) * 100) / 100;
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return null;
  return n;
}

export function gap(prediction: number, actual: number): number {
  return Math.round(Math.abs(prediction - actual) * 100) / 100;
}

/* ---------- Temps réel ---------- */

export function subscribeBets(
  cb: (bets: RestoBet[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const q = query(betsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<RestoBet, 'id'>),
        })),
      ),
    onError,
  );
}

/* ---------- Actions ---------- */

export async function createBet(restaurant: string, uid: string, name: string): Promise<void> {
  const clean = restaurant.trim();
  if (!clean) throw new Error('Indique le nom du restaurant.');
  await addDoc(betsRef, {
    restaurant: clean,
    status: 'open',
    predictions: {},
    names: { [uid]: name },
    actual: null,
    winnerUid: null,
    loserUid: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    closedAt: null,
  });
}

export async function submitPrediction(
  betId: string,
  uid: string,
  name: string,
  amount: number,
): Promise<void> {
  const ref = doc(db, COL, betId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Ce resto n’existe plus.');
    const data = snap.data() as Omit<RestoBet, 'id'>;
    if (data.status !== 'open') throw new Error('Ce resto est déjà clôturé.');

    const others = Object.keys(data.predictions ?? {}).filter((k) => k !== uid);
    if (others.length >= 1 && uid in (data.predictions ?? {})) {
      throw new Error('Les deux paris sont posés, ils ne peuvent plus changer.');
    }
    if (others.length >= 2) throw new Error('Deux paris sont déjà posés.');

    tx.update(ref, {
      [`predictions.${uid}`]: amount,
      [`names.${uid}`]: name,
    });
  });
}

export async function closeBet(betId: string, actual: number): Promise<RestoResult> {
  const ref = doc(db, COL, betId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Ce resto n’existe plus.');
    const data = snap.data() as Omit<RestoBet, 'id'>;
    if (data.status !== 'open') throw new Error('Ce resto est déjà clôturé.');

    const entries = Object.entries(data.predictions ?? {});
    if (entries.length !== 2) throw new Error('Il faut les deux paris avant de révéler.');

    const [[uidA, a], [uidB, b]] = entries;
    const gapA = gap(a, actual);
    const gapB = gap(b, actual);

    let winnerUid: string | null = null;
    let loserUid: string | null = null;
    if (gapA < gapB) {
      winnerUid = uidA;
      loserUid = uidB;
    } else if (gapB < gapA) {
      winnerUid = uidB;
      loserUid = uidA;
    }

    tx.update(ref, {
      status: 'done',
      actual,
      winnerUid,
      loserUid,
      closedAt: serverTimestamp(),
    });

    return { restaurant: data.restaurant, actual, winnerUid, loserUid };
  });
}

export async function deleteBet(betId: string): Promise<void> {
  await deleteDoc(doc(db, COL, betId));
}

/* ---------- Stats ---------- */

export interface RestoStats {
  players: string[];
  names: Record<string, string>;
  points: Record<string, number>;
  avgGap: Record<string, number | null>;
  nextPayerUid: string | null;
  played: number;
}

/** bets doit être trié du plus récent au plus ancien */
export function computeStats(bets: RestoBet[], myUid: string): RestoStats {
  const names: Record<string, string> = {};
  const points: Record<string, number> = {};
  const gaps: Record<string, number[]> = {};
  const players = new Set<string>([myUid]);

  for (const b of bets) {
    for (const [uid, n] of Object.entries(b.names ?? {})) {
      names[uid] = names[uid] ?? n;
      players.add(uid);
    }
    if (b.status !== 'done' || b.actual == null) continue;
    for (const [uid, p] of Object.entries(b.predictions ?? {})) {
      (gaps[uid] ??= []).push(gap(p, b.actual));
    }
    if (b.winnerUid) points[b.winnerUid] = (points[b.winnerUid] ?? 0) + 1;
  }

  const ordered = [myUid, ...[...players].filter((u) => u !== myUid)].slice(0, 2);
  const avgGap: Record<string, number | null> = {};
  for (const uid of ordered) {
    points[uid] = points[uid] ?? 0;
    const g = gaps[uid];
    avgGap[uid] = g?.length ? Math.round((g.reduce((s, x) => s + x, 0) / g.length) * 100) / 100 : null;
  }

  const lastDecided = bets.find((b) => b.status === 'done' && b.loserUid);

  return {
    players: ordered,
    names,
    points,
    avgGap,
    nextPayerUid: lastDecided?.loserUid ?? null,
    played: bets.filter((b) => b.status === 'done').length,
  };
}