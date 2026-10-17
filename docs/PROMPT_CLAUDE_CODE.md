Tu reprends le développement de Finelio, une app de suivi de dépenses utilisée en PWA sur iPhone (Next.js 14 Pages Router, Supabase, Stripe en mode test, Vercel). Le propriétaire, Téo, est francophone : tout se fait en français (interface, commentaires, commits, échanges). Téo dicte ses messages à la voix : interprète les erreurs de transcription avec bienveillance.

## Lis d'abord, dans cet ordre, avant toute modification

1. `CLAUDE.md` : règles et invariants (chargé automatiquement).
2. `docs/HANDOFF.md` : contexte complet, infrastructure invisible depuis le code, décisions de Téo, dette technique connue, liste de ce qui n'a jamais été vérifié.
3. `docs/design-reference/` : design system, 28 écrans cibles en HTML (`canvas-ecrans/`), maquettes PNG (`maquettes/`).
4. Le code : `pages/index.js`, `components/AddTransactionWizard.jsx`, `components/TransactionModal.jsx`, `components/ui/`, `styles/globals.css`, `lib/`.

## Mission

Amener l'app à un rendu professionnel : interface soignée, mouvement fluide entre tous les états, aucun bug visible, code propre et maintenable.

Téo juge les fenêtres de saisie de transaction « ultra moches, éclatées » : c'est la priorité visible n°1. Ensuite viennent la navigation et les animations (transitions entre onglets et écrans, ouverture et fermeture des feuilles, listes), puis la chasse aux bugs et la qualité du code.

Plan par priorités (détail dans `HANDOFF.md` §11) : P0 fondations sans changer l'apparence, P1 saisie de transaction, P2 navigation et mouvement, P3 tests et qualité, P4 documentation.

## Étape 1 : audit et plan, avant d'écrire du code applicatif

- Mets en place l'environnement de vérification (voir « Méthode »), puis produis des captures de tous les écrans actuels, sombre et clair, à 390×844.
- Compare chaque écran à sa maquette cible dans `docs/design-reference/` et à la liste de dette de `HANDOFF.md` §9.
- Remets-moi : (a) les défauts constatés, classés par gravité, avec la capture à l'appui ; (b) un plan en lots courts, chacun avec son critère d'acceptation ; (c) les décisions que tu me demandes de trancher.
- Attends ma validation du plan. Ensuite, enchaîne les lots sans redemander à chaque étape, sauf blocage ou décision de produit.

## Ce que tu ne dois pas casser (détail dans CLAUDE.md)

- Contrat de l'API des Raccourcis iOS : `GET /api/meta` et `POST /api/transactions`, mêmes clés, mêmes formats.
- Catégories et comptes sont identifiés par leur nom : ne renomme rien d'existant.
- Isolation des utilisateurs : filtre `userId` explicite dans chaque fonction de `lib/`, `getUserId` sur chaque route.
- Contournements iOS PWA (barre d'état translucide, hauteur de `html`, padding fixe de la barre d'onglets) : ne les modifie qu'avec une raison nouvelle, et seulement après un test sur l'iPhone de Téo.
- Migrations additives et idempotentes, livrées en fichiers que j'exécute moi-même. Aucune écriture SQL sur la base de production par toi.
- État important côté serveur, pas dans le `localStorage`.
- Aucune donnée personnelle ni valeur de clé dans le dépôt, les logs, les commits ou tes réponses.

## Méthode

- Branche dédiée (par exemple `refonte-ui`), commits petits et cohérents en français, jamais de push forcé sur `main`. Un push sur la branche crée un déploiement de prévisualisation Vercel que j'ouvre sur mon iPhone. Vérifie avec moi que les variables d'environnement existent pour l'environnement Preview.
- Ne développe pas contre la base de production. Propose-moi soit un mode démo avec données fictives (strictement hors production, sans toucher à l'authentification serveur), soit un second projet Supabase gratuit.
- Vérification visuelle : Playwright avec WebKit et un profil iPhone, captures sombre et clair à 390×844, 375×667 et 430×932, script réutilisable. Précise toujours ce que WebKit ne reproduit pas (zones de sécurité, barre d'état, cache des balises meta de la PWA) : cela, je le teste sur mon iPhone.
- Ne dis jamais « corrigé » sans preuve (capture, test, sortie de build). Quand tu ne peux pas vérifier, écris-le explicitement.
- Nouvelles dépendances : seulement avec un chiffre de poids JS et une justification. Repère actuel : environ 82 kB de JS partagé. Privilégie les animations CSS et l'API Web Animations ; propose une bibliothèque seulement si elle apporte un gain net sur iPhone.
- Respecte `prefers-reduced-motion`, les durées issues des tokens, l'absence d'emoji dans l'interface, et le texte sur fond d'accent toujours en `surface-0`.
- Supabase en lecture seule via MCP si je l'ai connecté (`HANDOFF.md` §3). Sinon, demande-moi les informations de schéma dont tu as besoin.

## À la fin de chaque lot

1. `npm run build` sans erreur, aucune erreur console.
2. Captures avant et après, sombre et clair.
3. Liste explicite de ce qui n'est pas vérifié.
4. Checklist de test iPhone courte (modèle dans `HANDOFF.md` §12), avec la réinstallation de l'icône si des balises meta ont changé.
5. Fichiers SQL éventuels, avec leur note de retour arrière.

## Comment tu communiques avec moi

Direct et objectif, sans préambule, sans flatterie. Contredis-moi quand ma demande est mauvaise ou repose sur une fausse prémisse, et corrige la prémisse avant d'agir. Raisonne à partir des premiers principes. Indique ton niveau de confiance quand tu n'es pas sûr, et ce qui le changerait. Finis les points concrets par des actions précises : quoi faire, dans quel ordre, comment savoir si ça marche. Évite le schéma « ce n'est pas X, c'est Y » : affirme directement.

Commence par l'étape 1.
