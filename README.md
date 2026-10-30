# Nous ✦

Journal de couple de Ryan & Sarah. C'est une PWA mobile-first (Next.js App Router, Firebase, Zustand).

## Lancer

```bash
npm install
npm run dev      # génère public/sw.js puis lance next dev (le SW n'est actif qu'en prod)
npm run build    # génère public/sw.js (version unique) puis next build
```

Variables d'environnement : `NEXT_PUBLIC_FIREBASE_*` (voir `src/lib/firebase.ts`).

## Architecture mobile

```
src/app/
  layout.tsx            viewport (viewport-fit=cover), meta iOS, splash screens, PwaManager
  manifest.ts           manifest PWA (icônes any + maskable, raccourcis)
  login/                hors coquille (pas de tab bar)
  (app)/layout.tsx      coquille connectée : garde d'auth, abonnements temps réel, TabBar, « Nouvelle publication »
  (app)/home            fil : stories + publications (j'aime, commentaires, partage, enregistrer)
  (app)/map             carte des lieux
  (app)/activity        notifications de l'autre (badge dans la tab bar)
  (app)/profile         profil du couple : stats, « à la une », grille / enregistrés / mots
  (app)/p/[id]          détail d'une publication (?c=1 ouvre les commentaires)
  (app)/settings|stats|memory|gifts|bucketlist|capsule|resto   sous-pages (bouton retour)
src/components/
  ui/Screen.tsx         écran = en-tête + zone scrollable + tirer pour rafraîchir
  ui/PageHeader.tsx     titre large, safe-area, retour, actions
  ui/Sheet.tsx          bottom sheet (glisser pour fermer, suit le clavier)
  ui/ActionSheet.tsx    confirmations iOS (remplace window.confirm)
  ui/kit.tsx            Segmented, Chips, EmptyState, squelettes, EmojiPicker…
  ui/Avatar.tsx         avatars (Ryan bleu, Sarah rose) + avatar du couple
  feed/                 PostCard, CommentsSheet, Stories (rangée + visionneuse), WordSheet
  shell/                TabBar, AddMemorySheet, PwaManager, Splash
src/store/              authStore (status loading/authed/anon), dataStore (cache partagé), uiStore
src/lib/                social.ts (j'aime, enregistrés, commentaires, activité), time.ts (dates relatives), couple.ts (dates du couple), device.ts (haptique, compression photo, GPS), pwa.ts, tokens.ts
scripts/                build-sw.mjs + sw-template.js → public/sw.js
```

**Principes**

- Le document ne scrolle jamais : chaque écran a son conteneur de scroll. Il n'y a donc ni rebond global ni tab bar qui bouge.
- Les safe-areas passent par des variables CSS (`--safe-top`, `--safe-bottom`, `--tabbar-space`).
- Les inputs font 16 px minimum (pas de zoom iOS), les cibles tactiles 44 px minimum.
- Le cache Firestore est persistant (IndexedDB) : l'app s'ouvre avec les données même hors ligne.
- Le service worker sert les pages avec la stratégie réseau d'abord (4 s) → cache → `/offline.html`. Les photos et les tuiles de carte sont mises en cache.
- Chaque déploiement change `sw.js`, ce qui affiche la bannière « Nouvelle version disponible ».
- Les photos sont compressées avant envoi (JPEG, 2048 px max).

Les icônes et les splash screens iOS sont dans `public/icons`, `public/splash`, `src/app/icon.png` et `src/app/apple-icon.png`.

## Social (Firestore)

```
memories/{id}                  likes: uid[], savedBy: uid[], commentCount
memories/{id}/comments/{cid}   text, authorUid, authorName, createdAt
activity/{aid}                 type, toUid, actorUid, actorName, memoryId, thumb, text, read, createdAt
```

Les règles de sécurité correspondantes sont dans `firestore.rules`. Il faut les publier pour que les commentaires et l'activité fonctionnent.
