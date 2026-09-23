'use client';

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  closeBet,
  computeStats,
  createBet,
  deleteBet,
  formatEuro,
  gap,
  parseAmount,
  submitPrediction,
  subscribeBets,
  type RestoBet,
  type RestoResult,
} from '@/lib/resto';

/* ---------- Design ---------- */

const C = {
  bg: '#0A0A0D',
  surface: '#15151B',
  surface2: '#1D1D25',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5F1EA',
  muted: '#A7A1B3',
  gold: '#D6B26E',
  blush: '#E9B7BB',
  danger: '#FF9A9A',
};
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', system-ui, -apple-system, sans-serif";

const css = `
.nr-btn, .nr-input { font-family: ${sans}; }
.nr-btn { cursor: pointer; transition: opacity .15s ease, transform .15s ease; }
.nr-btn:active:not(:disabled) { transform: scale(.98); }
.nr-btn:disabled { opacity: .45; cursor: not-allowed; }
.nr-btn:focus-visible, .nr-input:focus-visible {
  outline: 2px solid ${C.gold}; outline-offset: 2px;
}
.nr-input::placeholder { color: ${C.muted}; opacity: .7; }
@keyframes nr-reveal { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.nr-reveal { animation: nr-reveal .45s ease both; }
@media (prefers-reduced-motion: reduce) {
  .nr-reveal { animation: none; }
  .nr-btn { transition: none; }
}
.nr-sr { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
`;

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: C.bg,
    color: C.text,
    fontFamily: sans,
    padding: 'calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 110px)',
  },
  wrap: { maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  h1: { fontFamily: serif, fontWeight: 500, fontSize: 38, lineHeight: 1.05, margin: 0 },
  sub: { color: C.muted, fontSize: 15, lineHeight: 1.5, margin: '6px 0 0' },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: 20,
  },
  h2: { fontFamily: serif, fontWeight: 500, fontSize: 26, margin: '0 0 4px' },
  small: { color: C.muted, fontSize: 14, lineHeight: 1.45, margin: 0 },
  row: { display: 'flex', gap: 10, alignItems: 'stretch' },
  input: {
    flex: 1,
    minWidth: 0,
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    color: C.text,
    fontSize: 17,
    padding: '14px 16px',
  },
  btn: {
    background: C.gold,
    color: '#1A1408',
    border: 'none',
    borderRadius: 14,
    fontWeight: 600,
    fontSize: 16,
    padding: '14px 18px',
    whiteSpace: 'nowrap',
  },
  ghost: {
    background: 'transparent',
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    fontSize: 14,
    padding: '10px 14px',
  },
  label: { display: 'block', fontSize: 14, color: C.muted, marginBottom: 8 },
  error: { color: C.danger, fontSize: 14, margin: '10px 0 0' },
};

/* ---------- Page ---------- */

export default function RestoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bets, setBets] = useState<RestoBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RestoResult | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  useEffect(() => {
    if (!user) return;
    return subscribeBets(
      (b) => {
        setBets(b);
        setLoading(false);
      },
      () => {
        setLoadError('Impossible de charger les restos. Vérifie ta connexion.');
        setLoading(false);
      },
    );
  }, [user]);

  const myName = user?.displayName || user?.email?.split('@')[0] || 'Moi';
  const openBet = bets.find((b) => b.status === 'open') ?? null;
  const doneBets = bets.filter((b) => b.status === 'done');
  const stats = useMemo(() => (user ? computeStats(bets, user.uid) : null), [bets, user]);

  const nameOf = (uid: string | null | undefined) =>
    !uid ? '' : uid === user?.uid ? myName : stats?.names[uid] || 'L’autre';

  if (!authReady || (user && loading)) {
    return (
      <main style={s.page}>
        <style>{css}</style>
        <div style={s.wrap}>
          <p style={s.small} role="status">Chargement…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={s.page}>
        <style>{css}</style>
        <div style={s.wrap}>
          <p style={s.small}>Connecte-toi pour jouer.</p>
        </div>
      </main>
    );
  }

  const partnerUid = stats?.players.find((p) => p !== user.uid) ?? null;

  return (
    <main style={s.page}>
      <style>{css}</style>
      <div style={s.wrap}>
        <header>
          <h1 style={s.h1}>Qui paie le resto ?</h1>
          <p style={s.sub}>
            Chacun devine l’addition. Le plus proche gagne un point, l’autre offre le prochain.
          </p>
        </header>

        {loadError && (
          <p role="alert" style={s.error}>
            {loadError}
          </p>
        )}

        {/* Prochain payeur + score */}
        {stats && (
          <section aria-labelledby="score-title" style={{ ...s.card, padding: 24 }}>
            <h2 id="score-title" className="nr-sr">
              Score
            </h2>
            <p style={{ ...s.small, marginBottom: 6 }}>Le prochain resto est offert par</p>
            <p
              style={{
                fontFamily: serif,
                fontSize: 44,
                lineHeight: 1,
                margin: 0,
                color: stats.nextPayerUid ? C.gold : C.muted,
                fontStyle: stats.nextPayerUid ? 'italic' : 'normal',
              }}
            >
              {stats.nextPayerUid ? nameOf(stats.nextPayerUid) : 'personne encore'}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {[user.uid, partnerUid].map((uid, i) => (
                <div key={uid ?? `empty-${i}`}>
                  <p style={{ ...s.small, color: i === 0 ? C.blush : C.gold }}>
                    {uid ? nameOf(uid) : 'En attente'}
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 36, margin: '2px 0 0', lineHeight: 1.1 }}>
                    {uid ? stats.points[uid] ?? 0 : '–'}
                    <span style={{ fontFamily: sans, fontSize: 14, color: C.muted, marginLeft: 6 }}>
                      {(uid ? stats.points[uid] ?? 0 : 0) > 1 ? 'points' : 'point'}
                    </span>
                  </p>
                  {uid && stats.avgGap[uid] != null && (
                    <p style={{ ...s.small, fontSize: 13 }}>
                      écart moyen {formatEuro(stats.avgGap[uid] as number)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Résultat du dernier reveal */}
        <div aria-live="polite">
          {lastResult && (
            <section className="nr-reveal" style={{ ...s.card, borderColor: C.gold }}>
              <p style={s.small}>
                {lastResult.restaurant} · addition {formatEuro(lastResult.actual)}
              </p>
              <p style={{ fontFamily: serif, fontSize: 28, margin: '6px 0 4px', lineHeight: 1.15 }}>
                {lastResult.winnerUid
                  ? `${nameOf(lastResult.winnerUid)} gagne le point.`
                  : 'Égalité parfaite.'}
              </p>
              <p style={s.small}>
                {lastResult.loserUid
                  ? `${nameOf(lastResult.loserUid)} offre le prochain resto.`
                  : 'Personne ne marque, le payeur ne change pas.'}
              </p>
              <button
                type="button"
                className="nr-btn"
                style={{ ...s.ghost, marginTop: 14 }}
                onClick={() => setLastResult(null)}
              >
                Fermer
              </button>
            </section>
          )}
        </div>

        {/* Resto en cours ou nouveau */}
        {openBet ? (
          <OpenBetCard
            bet={openBet}
            uid={user.uid}
            myName={myName}
            nameOf={nameOf}
            onClosed={setLastResult}
          />
        ) : (
          <NewBetCard uid={user.uid} myName={myName} />
        )}

        {/* Historique */}
        <section aria-labelledby="history-title">
          <h2 id="history-title" style={{ ...s.h2, margin: '8px 0 12px' }}>
            Nos restos
          </h2>
          {doneBets.length === 0 ? (
            <p style={s.small}>Votre premier pari apparaîtra ici une fois l’addition révélée.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {doneBets.map((b) => (
                <HistoryItem key={b.id} bet={b} nameOf={nameOf} myUid={user.uid} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------- Nouveau resto ---------- */

function NewBetCard({ uid, myName }: { uid: string; myName: string }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr('Indique le nom du restaurant.');
    setBusy(true);
    try {
      await createBet(name, uid, myName);
      setName('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible de créer le resto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="new-title" style={s.card}>
      <h2 id="new-title" style={s.h2}>
        Nouveau resto
      </h2>
      <p style={{ ...s.small, marginBottom: 16 }}>Lancez un pari avant de commander.</p>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="resto-name" style={s.label}>
          Restaurant
        </label>
        <div style={s.row}>
          <input
            id="resto-name"
            className="nr-input"
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chez Léon"
            autoComplete="off"
            maxLength={80}
            aria-invalid={!!err}
            aria-describedby={err ? 'new-err' : undefined}
          />
          <button type="submit" className="nr-btn" style={s.btn} disabled={busy}>
            {busy ? '…' : 'Lancer'}
          </button>
        </div>
        {err && (
          <p id="new-err" role="alert" style={s.error}>
            {err}
          </p>
        )}
      </form>
    </section>
  );
}

/* ---------- Resto en cours ---------- */

function OpenBetCard({
  bet,
  uid,
  myName,
  nameOf,
  onClosed,
}: {
  bet: RestoBet;
  uid: string;
  myName: string;
  nameOf: (uid: string | null | undefined) => string;
  onClosed: (r: RestoResult) => void;
}) {
  const predictions = bet.predictions ?? {};
  const mine = predictions[uid];
  const otherUid = Object.keys(predictions).find((k) => k !== uid) ?? null;
  const bothIn = mine != null && otherUid != null;

  const [guess, setGuess] = useState('');
  const [editing, setEditing] = useState(false);
  const [actual, setActual] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onGuess(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = parseAmount(guess);
    if (n == null) return setErr('Entre un montant valide, par exemple 64,50.');
    setBusy(true);
    try {
      await submitPrediction(bet.id, uid, myName, n);
      setGuess('');
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible d’enregistrer le pari.');
    } finally {
      setBusy(false);
    }
  }

  async function onReveal(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = parseAmount(actual);
    if (n == null) return setErr('Entre le montant de l’addition, par exemple 71,20.');
    setBusy(true);
    try {
      const r = await closeBet(bet.id, n);
      setActual('');
      onClosed(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible de révéler le résultat.');
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!window.confirm(`Annuler le pari pour ${bet.restaurant} ?`)) return;
    try {
      await deleteBet(bet.id);
    } catch {
      setErr('Impossible d’annuler ce resto.');
    }
  }

  const showGuessForm = mine == null || (editing && !bothIn);

  return (
    <section aria-labelledby="open-title" style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={s.small}>En cours</p>
          <h2 id="open-title" style={{ ...s.h2, overflowWrap: 'anywhere' }}>
            {bet.restaurant}
          </h2>
        </div>
        <button type="button" className="nr-btn" style={s.ghost} onClick={onCancel}>
          Annuler
        </button>
      </div>

      {/* Statut des paris */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
          <span style={{ color: C.blush }}>{myName}</span>
          <span>{mine != null ? formatEuro(mine) : <span style={{ color: C.muted }}>pas encore parié</span>}</span>
        </li>
        <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
          <span style={{ color: C.gold }}>{otherUid ? nameOf(otherUid) : 'L’autre'}</span>
          <span>
            {otherUid == null ? (
              <span style={{ color: C.muted }}>pas encore parié</span>
            ) : bothIn ? (
              <span className="nr-reveal">{formatEuro(predictions[otherUid])}</span>
            ) : (
              <span style={{ color: C.muted }}>pari caché ✓</span>
            )}
          </span>
        </li>
      </ul>

      {showGuessForm && (
        <form onSubmit={onGuess} noValidate>
          <label htmlFor="guess" style={s.label}>
            {mine == null ? 'Ton pronostic pour l’addition' : 'Modifier ton pronostic'}
          </label>
          <div style={s.row}>
            <input
              id="guess"
              className="nr-input"
              style={s.input}
              inputMode="decimal"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="0,00 €"
              autoComplete="off"
              aria-invalid={!!err}
              aria-describedby={err ? 'open-err' : 'guess-hint'}
            />
            <button type="submit" className="nr-btn" style={s.btn} disabled={busy}>
              {busy ? '…' : 'Parier'}
            </button>
          </div>
          <p id="guess-hint" style={{ ...s.small, fontSize: 13, marginTop: 8 }}>
            L’autre ne voit pas ton montant avant d’avoir parié.
          </p>
        </form>
      )}

      {mine != null && !bothIn && !editing && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={s.small} role="status">
            En attente du pari de {otherUid ? nameOf(otherUid) : 'l’autre'}.
          </p>
          <button type="button" className="nr-btn" style={s.ghost} onClick={() => setEditing(true)}>
            Modifier
          </button>
        </div>
      )}

      {bothIn && (
        <form onSubmit={onReveal} noValidate style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <label htmlFor="actual" style={s.label}>
            Montant réel de l’addition
          </label>
          <div style={s.row}>
            <input
              id="actual"
              className="nr-input"
              style={s.input}
              inputMode="decimal"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="0,00 €"
              autoComplete="off"
              aria-invalid={!!err}
              aria-describedby={err ? 'open-err' : undefined}
            />
            <button type="submit" className="nr-btn" style={s.btn} disabled={busy}>
              {busy ? '…' : 'Révéler'}
            </button>
          </div>
        </form>
      )}

      {err && (
        <p id="open-err" role="alert" style={s.error}>
          {err}
        </p>
      )}
    </section>
  );
}

/* ---------- Historique ---------- */

function HistoryItem({
  bet,
  nameOf,
  myUid,
}: {
  bet: RestoBet;
  nameOf: (uid: string | null | undefined) => string;
  myUid: string;
}) {
  const date = bet.closedAt?.toDate?.() ?? bet.createdAt?.toDate?.() ?? null;
  const entries = Object.entries(bet.predictions ?? {}).sort(([a], [b]) =>
    a === myUid ? -1 : b === myUid ? 1 : 0,
  );

  return (
    <li style={{ ...s.card, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <p style={{ fontFamily: serif, fontSize: 21, margin: 0, overflowWrap: 'anywhere' }}>{bet.restaurant}</p>
        <p style={{ margin: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {bet.actual != null ? formatEuro(bet.actual) : '–'}
        </p>
      </div>
      {date && (
        <p style={{ ...s.small, fontSize: 13 }}>
          {date.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map(([uid, p]) => {
          const won = bet.winnerUid === uid;
          return (
            <li key={uid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: won ? C.gold : C.muted }}>
                {nameOf(uid)}
                {won && <span aria-label=" a gagné"> ✦</span>}
              </span>
              <span style={{ color: won ? C.text : C.muted }}>
                {formatEuro(p)}
                {bet.actual != null && ` (±${formatEuro(gap(p, bet.actual))})`}
              </span>
            </li>
          );
        })}
      </ul>
      <p style={{ ...s.small, fontSize: 13, marginTop: 8 }}>
        {bet.loserUid ? `${nameOf(bet.loserUid)} paie le suivant` : 'Égalité, pas de point'}
      </p>
    </li>
  );
}