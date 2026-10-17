# Finelio : audit étape 1 (17 octobre 2026)

Base : commit `75990ce` (main), build de production local, WebKit (Playwright 1.49.1) en profil iPhone 14, 390×844 sombre et clair, échantillon à 375×667 et 430×932. Données fictives, API et session simulées dans le navigateur : aucun code applicatif modifié, aucune donnée de production touchée.

Captures : `docs/audit/2026-10-17/captures/` (planches). Les 76 captures unitaires (38 écrans × 2 thèmes) sont générées par le script, voir « Reproduire ».

## 0. Ce que j'ai constaté sur l'environnement

- Le zip contenait `CLAUDE.md`, `docs/` et des variantes de `.gitignore` et `.env.local.example`. Le dossier de travail est plus récent sur le simulateur PEA (plafond 150 k) : je l'ai conservé. J'ai ajouté `CLAUDE.md` et `docs/`, remplacé `.gitignore` et `.env.local.example` par les versions du zip. Rien n'est commité.
- `node_modules` était incomplet (`stripe`, `jsonwebtoken` absents : `next build` échouait). `npm ci` règle le problème. Next installé : 14.2.5, alors que `package.json` demande `^14.2.35`.
- `.env.local` ne contient que des variables Notion héritées, aucune clé Supabase : l'app ne tourne pas en local sans mode démo ou second projet.
- Baseline de poids : JS partagé **82,2 kB** (conforme au repère). La page `/` pèse **213 kB** de plus, soit **293 kB** de premier chargement : tout l'app, recharts compris, est dans un seul bloc.
- Aucune erreur ni avertissement console sur les 38 écrans parcourus (hors scénarios d'édition qui échouaient à cause de mon script, corrigés depuis).

## 1. Défauts constatés

Gravité : **A** = visible tout de suite et dégrade l'impression pro ; **B** = écart net avec la maquette ou usage dégradé ; **C** = finition ou dette.

### Saisie de transaction (priorité n°1)

| # | G | Défaut | Preuve |
|---|---|---|---|
| S1 | A | Deux interfaces sans lien : ajout plein écran en 3 étapes, édition en feuille. Champs, boutons, espacements et libellés diffèrent. | `saisie-ajout-*`, `saisie-edition-sombre` |
| S2 | A | Étape Détails : listes `<select>` natives (rendu grisé, non stylé), `<input type="date">` natif, anneau de focus bleu par défaut sur le Titre, zone de remarques redimensionnable. Ne ressemble ni à l'édition, ni à la maquette `Details`. | `saisie-ajout-details-sombre` |
| S3 | A | Bouton retour des étapes Montant et Détails quasi invisible : le caractère « ‹ » est sombre sur fond sombre. | `saisie-ajout-categories-montant-sombre`, 4ᵉ vignette |
| S4 | A | Édition : le bouton de fermeture flotte à cheval sur le bord de la feuille, le pied de page « Confirmer » est en `position: fixed` hors du panneau, la liste de catégories est une liste plate d'une soixantaine de noms sans icône ni famille, et sa feuille recouvre le pied de page. | `saisie-edition-sombre`, vignette 3 |
| S5 | A | Montant d'édition en champ texte brut (`52.4`, point décimal, aucun format), alors que l'ajout affiche `42,5 €`. Pas de séparateur de milliers. | idem |
| S6 | B | Montant : « Suivant » actif à 0 €, l'erreur n'arrive qu'après appui. Écart avec la maquette : touches de 56 px (64 px en maquette), pas de formatage du montant. | `27-ajout-erreur` |
| S7 | B | `autoFocus` sur le Titre : le clavier iOS s'ouvre dès l'arrivée sur Détails et masque la moitié du formulaire. Aucune gestion du clavier (visual viewport) nulle part. | code `AddTransactionWizard.jsx:241` |
| S8 | B | Feuille de catégories à l'ajout : bonne base (familles puis sous-catégories) mais aucune transition entre les deux niveaux, aucune animation d'ouverture ni de fermeture. | `20`, `21` |
| S9 | B | Feuille « Nouveau plafond » : `<select>` natif et anneau de focus bleu, même défaut que S2. | `budgets-reglages-sombre`, vignette 3 |

### Mouvement et navigation

| # | G | Défaut | Preuve |
|---|---|---|---|
| M1 | A | Aucune transition entre onglets ni entre écrans empilés (Objectifs, PEA, Abonnements, détail livret, flux) : rendu conditionnel, l'écran change d'un coup. | code `pages/index.js:860-1127` |
| M2 | A | Les feuilles apparaissent en zoomant depuis le coin haut droit (`transform-origin: top right`), y compris celles du bas. Aucune animation de sortie (démontage immédiat), aucun glissé pour fermer. | `Sheets.jsx:76` |
| M3 | A | Conflit avec la règle `prefers-reduced-motion` : les animations de `Sheets.jsx` (`style jsx`) et du `Toast` ne sont pas sous la media query. Durées en dur (0,2 s, 0,28 s, 240 ms) au lieu des tokens. | `Sheets.jsx:44,75`, `Toast.jsx:24` |
| M4 | B | Le Toast n'a pas d'animation de sortie. Les lignes de liste n'ont ni entrée ni sortie (suppression : la ligne disparaît d'un coup). | code |
| M5 | C | Seuls bons points : la pile de cartes de comptes, la barre d'onglets (largeur animée) et les montants animés. | captures |

### Écarts avec les maquettes et l'accueil

| # | G | Défaut | Preuve |
|---|---|---|---|
| D1 | B | Accueil : puce de période active en gris, bouton « + » blanc (`#FFFFFF`, icône `#0A0A0A`). La maquette `Accueil Option C` a la puce **orange** et le « + » **orange**. | `accueil-flux-sombre`, maquette PNG |
| D2 | B | Conflit de spécification : la maquette `CategoryPicker-*` pose des pastilles **colorées par famille** avec une icône au trait ; `CLAUDE.md` et l'app utilisent des Fluent Emoji sur pastille neutre. | maquette vs `20-ajout-categories` |
| D3 | B | Camembert des budgets : plusieurs familles reçoivent des violets et bleus voisins (palette par défaut hachée), peu lisibles. Mesure à faire : l'animation de recharts dure plus de 900 ms, ma capture a pris le donut incomplet. | `budgets-reglages-sombre`, vignette 1 |
| D4 | B | Thème clair : le gain `+2 290,79 €` en ambre sur la carte Patrimoine pêche est quasi illisible. | `clair-echantillon`, vignette 1 |
| D5 | C | Cibles tactiles de 36 px (retour, fermer, filtres) sous les 44 px recommandés ; boutons de la barre d'onglets sans `aria-label`. | code |

### Performance, code et dette

| # | G | Défaut |
|---|---|---|
| P1 | B | Police Inter chargée par `@import` Google Fonts dans `globals.css` : requête tierce bloquante, aucun repli hors ligne. À remplacer par `next/font` (auto-hébergée, 0 requête tierce). |
| P2 | B | 293 kB de premier chargement : recharts est chargé avant d'être utile. Chargement différé possible. |
| P3 | C | Dette de `HANDOFF.md` §9 confirmée : `pages/index.js` (1219 lignes, 50 `useState`), deux interfaces de saisie, 437 styles en ligne, tokens `--elev-*` alias, pas de test ni de lint. |
| P4 | C | Le texte sur fond d'accent utilise `--on-accent` (`#14100c`) et non `surface-0` : plus sûr en thème clair (où `surface-0` est crème), mais contredit la lettre de `CLAUDE.md`. À trancher (question 8). |

## 2. Plan en lots

Branche `refonte-ui`. Chaque lot : build sans erreur, 0 erreur console, captures avant/après sombre et clair (390×844, 375×667, 430×932), liste du non vérifié, checklist iPhone, SQL éventuel (aucun prévu).

| Lot | Contenu | Critère d'acceptation |
|---|---|---|
| **L0** Outillage | Playwright WebKit et script de captures commités (`tools/visual/`), ESLint et Prettier (sans reformater le dépôt), scripts `npm run capture`, mode démo ou second projet (question 1). | `npm run capture` produit les 76 captures de l'audit ; `npm run lint` passe ; aucune capture applicative ne change. |
| **L1** Primitives | `Button`, `TextField`, `PickerField` (remplace les `<select>`), `Sheet` animée (entrée, sortie, glissé pour fermer, `prefers-reduced-motion`, tokens de durée), `Chip`. Aucun écran migré sauf la feuille Plafond. | Comparaison de captures : écarts uniquement sur la feuille Plafond ; animation mesurée (durée = token) ; aucun défaut S9, M2, M3 sur cette feuille. |
| **L2** Saisie, ajout | Refonte Catégorie → Sous-catégorie → Montant → Détails sur la maquette : retour visible, montant formaté, touches de 64 px, transitions entre étapes, titre sans `autoFocus`, sélecteurs stylés, clavier iOS (visual viewport), retour visuel et haptique à l'enregistrement. | S2, S3, S5, S6, S7, S8 corrigés, prouvés par captures et parcours Playwright (ajout dépense, revenu, virement, erreurs). |
| **L3** Saisie, édition | Même composant pour l'édition (fractionnement, virement, suppression annulable). | S1, S4 corrigés ; parcours modifier, fractionner, supprimer, annuler ; `GET /api/meta` et `POST /api/transactions` inchangés (test de contrat). |
| **L4** Découpage de `index.js` | Hooks de données et un fichier par onglet, sans changement d'apparence. Chargement différé de recharts. | Captures identiques au pixel près sur les 38 écrans ; premier chargement < 293 kB ; `index.js` < 300 lignes. |
| **L5** Feuilles et mouvement | Toutes les feuilles (Filtres, Période, Options, Plafond) sur la `Sheet` de L1 ; Toast avec sortie ; entrée et sortie des lignes de liste. | M2, M3, M4 corrigés ; `prefers-reduced-motion` testé. |
| **L6** Navigation | Transitions entre onglets et écrans empilés (aller et retour), tokens de durée. | M1 corrigé ; vidéo ou séquence d'images à l'appui ; aucun scroll horizontal. |
| **L7** Écarts de design | Puce et « + » orange, pastilles de catégories (question 2), couleurs du camembert, contraste du thème clair, cibles à 44 px, `aria-label`. | D1 à D5 corrigés selon décisions. |
| **L8** Tests et qualité | Tests unitaires de `lib/` (insights, format, calcul du solde), parcours Playwright, `next/font` à la place de l'`@import`. | Suite verte ; P1 corrigé ; chiffres de poids avant/après. |
| **L9** Documentation | README restructuré, `CLAUDE.md` et `HANDOFF.md` à jour. | Relecture par Téo. |

Ordre : L0, L1, L2, L3 (tout ce que tu vois en priorité), puis L4 avant L5 et L6 pour ne pas animer un fichier de 1219 lignes.

## 3. Décisions à trancher

1. **Données de développement et prévisualisation.** Un déploiement Preview Vercel branché sur la base de production écrirait dans les vraies données. Option A (recommandée) : mode démo avec données fictives, activé par une variable posée uniquement dans l'environnement Preview, désactivé et refusé en production. Tu testes l'interface sur iPhone sans risque ; la connexion réelle reste à valider séparément. Option B : second projet Supabase gratuit, plus fidèle mais plus lourd à maintenir. Confiance dans A : élevée pour l'interface, nulle pour l'authentification.
2. **Icônes de catégories** (D2) : Fluent Emoji sur pastille neutre (actuel) ou pastille colorée par famille avec icône au trait (maquette). Je recommande les Fluent Emoji sur pastille teintée de la couleur de la famille : garde l'identité actuelle et apporte le repère couleur de la maquette. À valider visuellement sur une capture.
3. **Bouton « + » et puce de période** : orange comme la maquette (recommandé), ou blanc et gris actuels.
4. **Édition d'une transaction** : plein écran comme l'ajout (recommandé, un seul composant) ou feuille.
5. **Geste de retour** : je recommande de ne pas simuler le glissé depuis le bord (conflit avec le geste système de Safari), et de miser sur le bouton retour et des transitions claires. Confiance moyenne ; un test sur ton iPhone trancherait.
6. **Dépendances de développement** : Playwright, ESLint, Prettier, Vitest. Poids JS livré : 0 kB, elles restent hors du bundle. Je les ajoute en `devDependencies` si tu valides. `next/font` est inclus dans Next, sans dépendance.
7. **Les captures d'audit dans le dépôt** (`docs/audit/`) : à garder ou à ne pas commiter ?
8. **Texte sur fond orange** : `CLAUDE.md` dit « `surface-0` », le code utilise `--on-accent`. Je garde `--on-accent` (noir chaud fixe, sûr dans les deux thèmes) et je corrige `CLAUDE.md`, sauf objection.

## 3 bis. Décisions de Téo (17 octobre 2026)

1. Développement et Preview sur un **second projet Supabase** (pas de mode démo, jamais la production).
2. Icônes de catégories : Fluent Emoji teintés par la couleur de la famille.
3. Bouton « + » et puce de période actives en orange.
4. Édition en plein écran, un seul composant avec l'ajout.
5. Pas de geste de retour personnalisé.
6. Dépendances de développement autorisées.
7. Captures d'audit commitées.
8. `--on-accent` conservé, `CLAUDE.md` corrigé.

## 4. Actions pour toi, dans l'ordre

1. Réponds aux questions 1 à 8 (un mot par numéro suffit).
2. Dans Vercel, Settings > Environment Variables : indique-moi quelles variables sont cochées pour **Preview**.
3. Dans Supabase, Authentication > URL Configuration : ajoute le domaine de prévisualisation Vercel aux URL de redirection autorisées (utile seulement si on teste la connexion réelle).

## 5. Non vérifié

- Tout ce que WebKit sous macOS ne reproduit pas : zones de sécurité, barre d'état translucide, bande noire iOS, cache des balises meta, clavier iOS, haptiques, gestes.
- Fluidité réelle des animations sur iPhone (la capture est fixe).
- Thème clair au-delà d'un échantillon de 4 écrans (les 38 captures claires existent, je n'en ai regardé que 4).
- 375×667 et 430×932 : 4 écrans regardés sur 5 captures par taille.
- Aucune requête de production, aucun test d'authentification réelle.

## Reproduire

Le harnais est dans le dossier temporaire de la session (`verif/`) : `fixtures.mjs`, `harness.mjs`, `capture.mjs`, `montage.mjs`. L0 le commite sous `tools/visual/`. Principe : `next start` avec des variables Supabase factices, session injectée dans le `localStorage` sous la clé `sb-127-auth-token`, toutes les routes `/api/*` interceptées par `page.route`, date figée au 16 octobre 2026.
