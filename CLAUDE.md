# Finelio : mémoire du projet (lue automatiquement par Claude Code)

Finelio (ancien nom : Cap Finances) est un suivi de dépenses à saisie manuelle, utilisé surtout comme PWA sur iPhone. Propriétaire : Téo, francophone. Tout est en français : interface, commentaires de code, messages de commit, échanges.

Contexte complet : `docs/HANDOFF.md`. Benchmark UX et décisions de saisie à prendre : `docs/BENCHMARK-UX.md`. Feuille de route fonctionnelle (paliers, fonctionnalités prévues) : `docs/SPEC-PRODUIT-V1.md`. Maquettes cibles et design system : `docs/design-reference/`.

## Stack et commandes

- Next.js 14 (Pages Router), React 18.3, JavaScript sans TypeScript, lucide-react, recharts, supabase-js, Stripe (mode test).
- Base et authentification : Supabase (Postgres). Déploiement : Vercel, branche `main` en production (GitHub `teobachelerie/app_suivi_compte`).
- `npm run dev` et `npm run build`. `npm run lint` (ESLint, règles Next), `npm run format` (Prettier, vérification seule : ne reformate pas le dépôt entier). Pas de CI à ce jour.
- Vérification visuelle : `npm run build` puis `npm run capture` (WebKit profil iPhone, API simulée dans le navigateur, aucune base ; sortie dans `tools/visual/out/`, ignorée par git) et `npm run test:sheet` (comportement des feuilles). Détails dans `tools/visual/README.md`.
- Développement et prévisualisation Vercel : second projet Supabase `finelio-dev`, jamais la production (`docs/ENVIRONNEMENT-DEV.md`).
- Variables d'environnement : noms dans `.env.local.example`. Ne jamais écrire une valeur réelle dans le code, un log, un commit ou une réponse.
- Repère de poids : le build affiche environ 82 kB de JS partagé. Toute dépendance ajoutée se justifie par son poids.

## Invariants : ne jamais casser

1. **Contrat des Raccourcis iOS.** Des Raccourcis installés chez Téo et ses amis appellent l'API avec l'en-tête `x-api-key` (clé `eak_...`, stockée hachée en SHA-256 dans `api_keys`).
   - `GET /api/meta` renvoie les objets `categories`, `accounts`, `payments` et les chaînes `categoryNames`, `categoryFamilies`, `categorySubcategoriesByFamily` (JSON stringifié `{famille: "Famille,Sous1,Sous2"}`), `accountNames`, `paymentNames`.
   - `POST /api/transactions` attend `{ title, amount, date (YYYY-MM-DD), type ("Dépense" | "Gain" | "Virement"), category, compte, compteDestination?, payment, tags?, splits?, notes? }`.
   - Ne renomme aucune clé, ne change aucun format, n'ajoute aucun champ obligatoire.
2. **Les noms servent d'identifiants.** Catégories et comptes sont résolus par nom (insensible à la casse) via `resolveId`. Unicité `unique(user_id, name)`. Renommer une catégorie ou un compte casse les Raccourcis existants.
3. **Isolation des utilisateurs.** Le serveur utilise la clé `service_role`, qui contourne la RLS. Chaque fonction de `lib/*.js` filtre explicitement par `userId`, y compris sur `update` et `delete`. Toute nouvelle route appelle `getUserId(req)` et répond 401 sinon.
4. **Le navigateur n'accède jamais aux tables.** Il utilise supabase-js uniquement pour l'authentification (clé anon). Les données passent par `/api/*` avec `Authorization: Bearer <jeton>`.
5. **Migrations additives et idempotentes**, dans `supabase/migration-0NN-nom.sql`, en français, exécutées à la main par Téo dans le SQL Editor. Jamais de `drop` ni de `delete` sur la production sans son accord explicite. Pas d'UUID d'utilisateur en dur (la 016 en contient : héritage).
6. **État critique côté serveur.** Safari efface le `localStorage` d'une PWA sans prévenir (cela a déjà cassé l'onboarding). Le `localStorage` reste réservé aux préférences cosmétiques.
7. **Contournements iOS PWA validés sur appareil réel. Ne rien modifier sans test sur un iPhone** (voir section suivante).
8. **Aucune donnée personnelle dans le dépôt** : pas d'export de transactions, pas de `.env`, pas de script contenant des montants réels.

## Contournements iOS PWA (fragiles, chèrement obtenus)

- `apple-mobile-web-app-status-bar-style = black-translucent` (flou de la barre d'état voulu par Téo) combiné à `html { height: calc(100% + env(safe-area-inset-top, 0px)) }` dans `styles/globals.css`. Ce couple corrige un bug WebKit qui laisse une bande noire en bas en mode standalone avec `black-translucent`.
- La barre d'onglets (`TabBar` dans `components/ui/Navigation.jsx`) a un `padding-bottom` fixe de 20 px, sans `env(safe-area-inset-bottom)`. Valeur validée à l'œil par Téo après de nombreuses tentatives.
- Script d'amorçage du thème dans `pages/_document.js` (sombre par défaut) : évite l'éclair clair au démarrage. L'effet de `pages/index.js` (`BG_COLORS`) maintient fond du `body` et `theme-color`.
- Viewport sans zoom, `overscroll-behavior: none`.
- iOS met en cache les balises meta de la PWA : après un changement, Téo doit supprimer l'icône de l'écran d'accueil et la rajouter pour voir l'effet.
- Le stockage d'une PWA installée est séparé de celui de Safari.
- Haptiques iOS (`lib/haptics.js`) : astuce `<input type="checkbox" switch>`, Safari 17.4+, non officielle. Doit rester sans effet de bord en cas d'échec.

## Design system

Références : `docs/design-reference/design-system/README.md` et les maquettes. Règles non négociables :

- Thème sombre par défaut (`#000000`), thème clair fonctionnel (`:root` clair, `[data-theme="dark"]` sombre).
- Orange = marque et appels à l'action. Rouge = dépenses. **Ambre = revenus (pas de vert).** Le token hérité `--green` vaut en réalité de l'ambre.
- Tout texte posé sur un fond d'accent utilise `--on-accent` (`#14100c`, noir chaud fixe dans les deux thèmes), jamais `ink` ni `surface-0` (crème en thème clair). Contraste mesuré, contraignant.
- Ne jamais différencier dépense et élément cliquable par la couleur seule (rouge et orange sont proches) : doubler d'un signe, d'une icône ou d'un texte.
- Aucun emoji dans l'interface. Les icônes de catégories sont des SVG Fluent Emoji (`public/category-icons/`, nom de fichier dans `categories.icon`) posés sur une pastille.
- Police Inter, chiffres tabulaires (`.ds-tabular`) pour tous les montants.
- Élévation par bordure fine (`--border-token`). Plus d'ombres néomorphiques. Les anciens tokens (`--elev-*`, `--surface-raised/inset/highlight/base`) sont des alias de compatibilité vers ce rendu plat.
- Cartes de comptes : couleurs de banque réelles, jamais de logo.
- Mouvement : tokens `--duration-micro` (150 ms), `--duration-base` (200 ms), `--duration-slow` (250 ms), `--ease-standard`, `--ease-out`. La pile de cartes de comptes utilise 280 ms avec `cubic-bezier(0.2, 0.8, 0.2, 1)`. Toute animation CSS passe sous `@media (prefers-reduced-motion: no-preference)`, et les animations JS testent `matchMedia` (voir `lib/useAnimatedNumber.js`).

## Primitives d'interface (à utiliser pour tout nouvel écran)

`components/ui/` : `Button`, `TextField`, `PickerField` (remplace `<select>`), `Chip`, `BottomSheet` (entrée, sortie, glissé pour fermer, clavier iOS). Leur style vit dans `styles/globals.css` (classes `.fin-*`). Champs en 16 px minimum (sinon Safari iOS zoome). Les anciens `Sheet`, `TopSheet`, `OptionSheet`, `Field` de `Sheets.jsx` sont à migrer, pas à étendre.

## Conventions de code

- Commentaires en français, qui expliquent le pourquoi. Les noms de variables restent en français ou en anglais selon l'existant du fichier.
- Les montants s'affichent via `fmtEUR` et `Amount`. Les dates sont des chaînes `YYYY-MM-DD` ; « aujourd'hui » se calcule avec `todayInParis()`, les fonctions Vercel tournant en UTC.
- Les périodes (`PERIODS`) sont des fenêtres glissantes qui se terminent à la dernière transaction, pas des mois calendaires.
- Fonctions pures de calcul dans `lib/` (voir `lib/insights.js`), testables sans navigateur.

## Méthode de travail

1. Ne déclare rien « corrigé » sans preuve : capture d'écran, test ou sortie de build. Si tu ne peux pas vérifier, dis-le explicitement.
2. Travaille sur une branche, committe par lot cohérent, ne force jamais le push sur `main`.
3. Après chaque lot : `npm run build` sans erreur, captures sombre et clair à 390×844, aucune erreur console.
4. Téo teste uniquement sur son iPhone. Termine chaque lot par une checklist de test courte et précise.
5. Tout SQL est livré en fichier, jamais exécuté par toi sur la production.
