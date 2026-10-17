# Finelio : document de passation

Rédigé le 17 octobre 2026 par l'assistant qui a construit l'app avec Téo pendant plusieurs semaines. Objectif : te donner tout ce que tu ne peux pas voir dans le code. Les règles courtes et les invariants sont dans `CLAUDE.md` à la racine.

Un principe d'honnêteté pour tout le document : chaque affirmation marquée « non vérifié » l'est vraiment. Traite-la comme une hypothèse.

---

## 1. Le produit

Finelio (ex Cap Finances, ex « Expenses App ») est un suivi de dépenses à **saisie manuelle**. Pas de connexion bancaire, pas de cours de bourse en temps réel : choix de positionnement assumé.

- **Usage réel** : PWA ajoutée à l'écran d'accueil d'un iPhone. Saisie rapide via **Raccourcis iOS** qui appellent l'API avec une clé personnelle.
- **Utilisateurs** : Téo (administrateur, palier `investisseur`) et quelques amis en bêta fermée. Pas de lancement public prévu.
- **Historique** : démarré sur Notion comme base de données (script legacy `scripts/migrate-notion-to-supabase.mjs`), migré vers Supabase, multi-utilisateur, paliers d'abonnement Stripe en mode test, taxonomie de catégories hiérarchique, assistant d'ajout en plusieurs étapes, pile de cartes de comptes, thèmes sombre et clair, plafonds de budget, détection de récurrences.
- **Fonctions** : transactions (dépense, gain, virement entre comptes), catégories en 11 familles et environ 60 sous-catégories, comptes et livrets avec couleurs de banque, budgets (répartition réelle et plafonds mensuels), objectifs d'épargne, abonnements récurrents générés automatiquement, simulateur PEA, règles de catégorisation automatique, tags, fractionnement d'une dépense en plusieurs catégories, import/export JSON et CSV, visite guidée, taux d'épargne, comparaison avec la période précédente.

## 2. Qui est Téo et comment travailler avec lui

- Prénom : Téo (Téo Bachelerie). Créateur de contenu et monteur vidéo freelance, en France. L'app est son projet perso, construite avec l'aide d'une IA. Il décide du produit et teste tout sur son iPhone.
- **Il dicte ses messages à la voix.** Attends-toi à des erreurs de transcription (« super base » = Supabase, « Opus.5 » = très probablement Opus 5.5, phrases sans ponctuation). Interprète avec bienveillance et reformule en une ligne si un point reste ambigu.
- Ses consignes de communication, écrites par lui :
  - raisonner à partir des premiers principes, décomposer avant de répondre ;
  - précision et objectivité avant la politesse, réponses directes sans préambule, sans reformuler sa question ;
  - ne pas chercher à lui plaire, ne rien valider par défaut, contredire clairement quand il se trompe, présenter une position défendable même si elle est inconfortable ;
  - corriger une fausse prémisse avant de répondre ;
  - pour un problème concret, finir par des actions précises : quoi faire, dans quel ordre, comment savoir si ça marche ;
  - indiquer son niveau de confiance quand une affirmation est incertaine, et ce qui le ferait changer ;
  - éviter le schéma « ce n'est pas X, c'est Y » : affirmer directement.
- **Ce qui l'a le plus agacé** : une longue série de corrections successives de la barre noire iOS (voir §8), où l'assistant annonçait « c'est corrigé » sans preuve. Il veut des résultats vérifiés. Dis « je n'ai pas pu vérifier » quand c'est le cas.
- Il valorise le rendu visuel, les animations et l'impression « app pro ». Il juge l'interface actuelle de saisie de transaction « ultra moche, éclatée ».

## 3. Infrastructure que tu ne vois pas

| Élément | Détail |
|---|---|
| Supabase | Un seul projet, qui est la **production** : données de Téo et de ses amis. Postgres + Auth (email/mot de passe). |
| Vercel | Projet `finelio` (`finelio.vercel.app`). Déploiement automatique à chaque push sur `main`. Une tâche planifiée : `0 6 * * *` (UTC) sur `/api/cron/subscriptions`. |
| GitHub | `teobachelerie/app_suivi_compte`, branche `main`. **Visibilité inconnue : à vérifier, privé fortement recommandé.** |
| Stripe | Mode test. Produits Confirmé (4,99 €) et Investisseur (8,99 €). Webhook : `https://finelio.vercel.app/api/billing/webhook`, événements gérés `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Mise à jour de l'URL du webhook après le renommage du projet : statut inconnu. |
| Raccourcis iOS | Deux raccourcis publics (dépense et revenu), liens iCloud dans `lib/constants.js` (`SHORTCUT_URL_DEPENSE`, `SHORTCUT_URL_REVENU`). Chaque utilisateur génère sa clé dans Réglages. |

Variables d'environnement (noms dans `.env.local.example`, valeurs dans Vercel) : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CONFIRME`, `STRIPE_PRICE_INVESTISSEUR`. `SUPABASE_JWT_SECRET` est optionnelle et absente en production. Ces variables sont-elles aussi définies pour l'environnement **Preview** de Vercel ? Inconnu : à vérifier avant d'utiliser les déploiements de prévisualisation.

**Ce que seul Téo peut faire** : tout ce qui passe par les tableaux de bord Supabase (SQL Editor, réglages d'authentification), Vercel (variables), Stripe, tester sur son iPhone, modifier ses Raccourcis. Quand tu as besoin d'une de ces actions, donne-lui un pas-à-pas court et précis.

### Connecter Supabase à Claude Code (optionnel, en lecture seule)

Commande issue de la documentation officielle de Supabase :

    claude mcp add --scope local --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<REF>&read_only=true"

Puis, dans Claude Code : `/mcp`, choisir `supabase`, « Authenticate » (connexion dans le navigateur). `<REF>` est l'identifiant dans l'URL du projet (`https://<REF>.supabase.co`). **Garde `read_only=true`** : la documentation de Supabase présente ce serveur comme un outil de développement, et le seul projet existant est la production. Tu t'en sers pour lire le schéma et diagnostiquer, jamais pour écrire. Les modifications de schéma passent par des fichiers SQL que Téo exécute.

## 4. Architecture du code

```
pages/
  index.js                 Composant Home : 1219 lignes, 50 useState. Auth, état global, tous les écrans et feuilles.
  _app.js, _document.js    Styles globaux ; balises PWA iOS et script de thème.
  api/                     Routes serveur (voir tableau ci-dessous).
components/
  AddTransactionWizard     Ajout : type, famille, sous-catégorie, montant (calculatrice), détails.
  TransactionModal         Édition d'une transaction : ancien formulaire, distinct de l'assistant d'ajout.
  AccountCardStack         Pile de cartes de comptes + SavingsCard ; styles de 10 banques.
  GoalsScreen, SubscriptionsScreen, PeaSimulatorScreen, ReglagesScreen (561 lignes)
  AuthScreen, ResetPasswordScreen, Onboarding, Coachmark (visite guidée)
  BudgetSheet, Toast, LoadingScreen (3 variantes)
  ui/                      Primitives : Card, Amount, ListRow, Sheet/OptionSheet/Field, NavBar/TabBar, SegmentedControl, PeriodChips, StatTile…
lib/
  db.js                    Client Supabase service role, getUserId(req), resolveId.
  transactions, budgets, goals, subscriptions, categoryRules, apiKeys, billing, account, meta
  insights.js              Fonctions pures : récurrences, plafonds, comparaison de périodes.
  format.js, constants.js  Formats, périodes, paliers, banques, icônes.
  haptics.js, useAnimatedNumber.js, authErrors.js, authLink.js, api.js, supabaseClient.js
styles/globals.css         Tokens (thèmes) + classes utilitaires + animations.
supabase/                  schema.sql, migration-002 à 017, ops/ (diagnostic).
docs/                      Ce dossier.
```

### Routes API

| Route | Méthodes | Rôle |
|---|---|---|
| `/api/meta` | GET, PATCH | Catégories, comptes, moyens de paiement, palier. Contrat des Raccourcis. |
| `/api/transactions`, `/[id]`, `/import` | GET POST / PATCH DELETE / POST | CRUD. GET renvoie **tout** l'historique. Import JSON strict, tout ou rien. |
| `/api/budgets`, `/[id]` | GET POST / DELETE | Plafonds mensuels par famille. |
| `/api/goals`, `/[id]` | GET POST / PATCH DELETE | Objectifs d'épargne. |
| `/api/subscriptions`, `/[id]` | GET POST / PATCH DELETE | Abonnements récurrents. |
| `/api/category-rules`, `/[id]` | GET POST / DELETE | Règles de catégorisation automatique. |
| `/api/categories/[id]`, `/api/accounts/[id]` | PATCH | Renommage, couleur, banque. |
| `/api/api-keys`, `/[id]` | GET POST / DELETE | Clés des Raccourcis. |
| `/api/billing/{checkout,portal,plan,webhook}` | | Stripe et palier courant. |
| `/api/onboarding/complete` | POST | Marque la visite guidée comme vue (côté serveur). |
| `/api/account/delete` | | Suppression de compte, table par table puis utilisateur Auth. |
| `/api/cron/subscriptions` | | Génère les dépenses des abonnements du jour. Protégée par `CRON_SECRET`. |

### Authentification et isolation

1. `AuthScreen` (connexion, inscription, mot de passe oublié) utilise supabase-js côté navigateur.
2. `lib/api.js` ajoute `Authorization: Bearer <access_token>` à chaque appel.
3. `getUserId(req)` valide le jeton (appel `supabase.auth.getUser`, ou vérification HS256 si `SUPABASE_JWT_SECRET` existe), ou accepte `x-api-key`.
4. Le serveur parle à Postgres avec la clé `service_role` : **la RLS est contournée**. La sécurité repose sur le filtre `user_id` explicite dans chaque fonction de `lib/`. La RLS est activée sur toutes les tables comme filet de sécurité, avec des politiques limitées au propriétaire de la ligne (`auth.uid() = user_id`).
5. Réinitialisation de mot de passe : `resetPasswordForEmail` envoie un lien vers le domaine de l'app. `lib/authLink.js` lit le fragment d'URL au chargement du module (avant que supabase-js ne l'efface), `Home` affiche alors `ResetPasswordScreen`.

### Création d'un nouvel utilisateur

Trigger `on_auth_user_created` → fonction `seed_default_data()` (version de la migration 013) : crée le compte « Compte courant », la ligne `user_plans` (palier `amateur` par défaut) et appelle `seed_category_taxonomy(new.id)`. Les utilisateurs existants lors de la migration 010 sont passés en `investisseur`. `getUserPlan` crée la ligne `user_plans` si elle manque (filet de sécurité).

## 5. Modèle de données

| Table | Colonnes notables |
|---|---|
| `categories` | `name` (unique par utilisateur), `color`, `parent_id` (famille → sous-catégorie), `tier`, `icon` (nom de fichier Fluent Emoji), `is_fallback`, `archived`. `tier = null` : catégorie historique, toujours visible. |
| `accounts` | `name` (unique par utilisateur), `bank_id` (thème de carte), `archived`. |
| `transactions` | `title`, `amount`, `date`, `type` (Dépense, Gain, Virement), `category_id` (null pour un virement), `account_id`, `to_account_id`, `payment_method`, `tags text[]`, `splits jsonb`, `notes`, `subscription_id`, `emoji` (ignorée par l'interface). |
| `subscriptions` | `title`, `amount`, `category_id`, `account_id`, `payment_method`, `billing_day` (1 à 28), `active`, `last_generated_month`. |
| `goals`, `category_rules`, `category_budgets`, `api_keys` | Voir les migrations 003, 006, 017. |
| `user_plans` | `tier`, champs Stripe, `cancel_at_period_end`, `current_period_end`, `onboarding_seen`. |

Ordre pour recréer une base vierge : `schema.sql`, puis `migration-002` à `017`. **Attention à la 016** : seule sa section 0 (redéfinition de `seed_category_taxonomy`) sert aux nouveaux utilisateurs. Le reste corrige les données de Téo avec son UUID en dur et échouerait sur une base vierge.

### Règles métier à connaître

- **Taxonomie** : les noms de sous-catégories sont uniques par utilisateur, d'où l'absence de doublons entre familles. Une famille est elle-même un choix valide (« la famille en premier »). Visibilité par palier via `TIER_RANK`.
- **Virement** : catégorie nulle, visible dans l'historique des deux comptes.
- **Abonnements** : la tâche de 6 h UTC crée les dépenses dont le jour de prélèvement correspond à aujourd'hui (calendrier de Paris), une fois par mois (`last_generated_month`). Créer un abonnement génère tout de suite la dépense du mois si le jour est déjà passé, sauf avec `skipCurrentMonth` (utilisé par les récurrences détectées, pour ne pas dupliquer une dépense déjà saisie).
- **Récurrences** (`detectRecurring`) : au moins 3 mois distincts, majoritairement consécutifs, encore actives, au plus une occurrence par mois, montants récents stables à ±25 %. Volontairement prudent.
- **Plafonds** : sur le mois calendaire en cours, par famille (sous-catégories incluses), tous comptes confondus.
- **Périodes** : fenêtres glissantes se terminant à la dernière transaction. La comparaison se fait avec la fenêtre de même durée juste avant.
- **Paliers** (`TIER_LIMITS`) : Amateur 1 compte et 1 objectif, export limité à 3 mois ; Confirmé 5 comptes, 3 objectifs ; Investisseur sans limite.
- **Comptes « principaux »** : les deux premiers (Courant et Pro) forment la pile de cartes avec la vue **Patrimoine** (clé interne `"Tous"`). Les autres comptes sont des livrets affichés dans « Épargne ».

## 6. Design

- Références dans `docs/design-reference/` :
  - `design-system/` : tokens et règles (palette, typographie, contraste) ;
  - `canvas-ecrans/` : **28 écrans et composants cibles** en HTML. Ouvre-les comme des spécifications : le balisage dans `<x-dc>` est du HTML/CSS standard avec styles en ligne, le script `support.js` du canevas est absent ;
  - `maquettes/` : l'Accueil « Option C Minimal » (disposition la plus récente validée par Téo) et les styles de cartes de 10 banques ;
  - `recherche/` : recherche de design initiale, taxonomie.
- Écrans cibles pour la saisie : `Montant`, `Details`, `CategoryPicker-Depenses`, `CategoryPicker-Revenus`, `SubcategoryPicker-Shopping`, `EditModal`.
- Le canevas peut avoir pris du retard sur l'app livrée (l'Accueil a évolué ensuite). En cas de conflit, la maquette `Accueil Option C` fait foi pour l'Accueil.
- Règles complètes dans `CLAUDE.md`.

## 7. Décisions de Téo (ne pas rouvrir sans raison)

- Saisie manuelle, pas de connexion bancaire. Pas de cours en temps réel.
- Pas de pièces jointes sur les transactions.
- Au démarrage, le compte affiché devant reste celui qui était actif avant.
- Pas de lancement public : Stripe reste en mode test, pas d'App Store pour l'instant.
- Revenus en ambre, jamais en vert. Pas d'emoji dans l'interface.

## 8. Contournements et leçons chèrement acquises

**Bande noire iOS.** Avec `black-translucent`, WebKit en mode standalone calcule mal la hauteur et laisse une bande noire en bas. Il a fallu plus de huit essais (hauteurs `dvh`, hauteur mesurée en JS, `-webkit-fill-available`, changement du style de barre d'état, padding de la barre d'onglets). La combinaison qui marche est décrite dans `CLAUDE.md`. Les essais ratés partageaient un défaut : aucun n'était vérifié visuellement avant d'être annoncé. Le correctif final est venu d'une recherche sur le bug WebKit. Ne retente pas ce qui a échoué sans raison nouvelle.

**localStorage et iOS.** Une PWA installée peut perdre son `localStorage`. La visite guidée se relançait à chaque connexion pour cette raison ; elle dépend maintenant de `user_plans.onboarding_seen`. Clés restantes en `localStorage` : `expenses-theme`, `expenses-default-account`, `expenses-default-payment`, `expenses-show-account-filter`, `expenses-group-budget-by-account`, `expenses-core-account-ids`, `finelio-haptics`, `finelio-dismissed-recurring`, `finelio-goal-celebrated-<id>`.

**Haptiques.** `navigator.vibrate` n'existe pas sur Safari iOS. `lib/haptics.js` utilise un `<input type="checkbox" switch>` caché basculé par un clic sur son `label` (iOS 17.4+). Non officiel, non testé sur appareil.

**Connexion de Quentin (ami).** Cause non confirmée. Hypothèses : email non confirmé (Téo a confirmé son compte à la main), mot de passe saisi avec une faute à l'inscription (pas de champ de confirmation à l'inscription), ou **Site URL** de Supabase pointant vers un ancien domaine. Le flux « mot de passe oublié » a été ajouté ensuite.

## 9. État connu : dette technique

1. `pages/index.js` : 1219 lignes, 50 `useState`, logique, écrans et feuilles mélangés. Premier candidat au découpage (hooks de données, un fichier par onglet).
2. 437 blocs `style={{ }}` en ligne. Pas de composants de base cohérents pour boutons, champs, feuilles. Tokens hérités en double (65 usages de `--elev-*`).
3. **Deux interfaces de saisie** : `AddTransactionWizard` (ajout) et `TransactionModal` (édition, ancien formulaire). Incohérentes entre elles et avec les maquettes.
4. Aucun test automatisé durable, aucune configuration ESLint, aucune CI. Les contrôles faits jusqu'ici (build, lint externe, tests jsdom ponctuels) n'ont pas été conservés dans le dépôt.
5. `GET /api/transactions` renvoie tout l'historique sans pagination, rechargé toutes les 2 minutes quand l'app est visible et au retour au premier plan. Le coût croît avec les données.
6. Préférences utiles stockées en `localStorage` (compte par défaut, comptes principaux, thème) alors que Safari peut les effacer.
7. Pas de gestion hors ligne. Erreurs affichées en simple bandeau de texte. Accessibilité non auditée (zones tactiles, étiquettes, focus).
8. Résidus : colonne `emoji` inutilisée, préfixes `expenses-` et `finelio-` mélangés, `PATCH /api/meta` hérité de l'époque Notion, `README.md` qui est un journal de modifications de 390 lignes à restructurer.
9. `--green` vaut de l'ambre (nom trompeur).

## 10. Ce qui n'a jamais été vérifié

- **Aucun rendu visuel n'a été vu par l'assistant précédent.** Les contrôles faits : build, analyse statique, tests jsdom de la logique. Les feuilles d'ajout, animations, cartes de banques, plafonds, écrans de chargement n'ont pas été inspectés visuellement.
- Haptiques iOS : non testés sur appareil.
- Flux de mot de passe oublié : testé avec un faux client, pas de bout en bout avec Supabase.
- Exécution des migrations récentes : `017` (plafonds) et la partie 3 de `supabase/ops/diagnostic-et-rattrapage-profils.sql` (verrouillage de `seed_category_taxonomy`, appelable publiquement avec la clé anon) : statut inconnu.
- Réglage Supabase « Confirm email » : Téo voulait le désactiver, statut inconnu.
- Mise à jour du webhook Stripe vers le nouveau domaine : statut inconnu.

## 11. Chantier demandé

Téo veut une app au rendu **professionnel**, fluide, **sans bug visible**, au code propre. Priorités explicites : l'interface, les animations entre les états, la navigation, et surtout les fenêtres de saisie de transaction.

Ordre recommandé :

- **P0, fondations (apparence inchangée)** : configuration ESLint et Prettier ; mode démo avec données fictives pour développer sans toucher la production ; Playwright (WebKit, profil iPhone) avec script de captures sombre et clair ; primitives d'interface unifiées (bouton, champ, feuille, ligne, puce) ; migration des tokens hérités ; découpage de `pages/index.js`.
- **P1, saisie de transaction** : refonte de l'assistant d'ajout et de l'édition à partir des maquettes `Montant`, `Details`, `CategoryPicker-*`, `SubcategoryPicker-*`, `EditModal`. Unifier ajout et édition. Transitions entre étapes, clavier iOS (visual viewport), pavé de montant, retour visuel et haptique à l'enregistrement.
- **P2, navigation et mouvement** : transitions entre onglets et écrans empilés, ouverture et fermeture des feuilles (fond, glissé pour fermer), entrée et sortie des lignes de liste, geste de retour. Durées cohérentes via les tokens, `prefers-reduced-motion` respecté.
- **P3, qualité** : tests unitaires de `lib/`, parcours de bout en bout, bordures d'erreur, passage accessibilité, pagination ou fenêtrage de `GET /api/transactions`, suppression du code mort.
- **P4, documentation** : restructurer le README, garder `CLAUDE.md` à jour.

Critères d'acceptation de chaque lot : build sans erreur ; captures sombre et clair à 390×844, 375×667 et 430×932 ; aucune erreur console ; parcours testés par script ; aucun invariant de `CLAUDE.md` violé ; checklist iPhone remise à Téo.

Une refonte de cette ampleur peut introduire des régressions. Ne promets pas « zéro bug » : promets des tests, des captures et une liste explicite de ce qui reste non vérifié.

## 12. Environnement de travail recommandé

1. **Ne développe pas contre la base de production.** Deux options : un mode démo avec données fictives (à garder strictement hors production, sans toucher au chemin d'authentification serveur), ou un second projet Supabase gratuit si le quota le permet, initialisé avec `schema.sql` puis les migrations.
2. **Branche dédiée** (par exemple `refonte-ui`). Un push sur une branche autre que `main` crée un déploiement de prévisualisation Vercel que Téo ouvre sur son iPhone sans toucher à la production. Vérifie d'abord les variables d'environnement de l'environnement Preview. À ma connaissance, les tâches planifiées ne tournent que sur la production. Pour les liens email (mot de passe oublié), l'adresse de prévisualisation doit figurer dans les URL de redirection autorisées de Supabase.
3. **Captures** : Playwright avec WebKit (`npx playwright install webkit`, profil d'appareil iPhone). WebKit sous Playwright ne reproduit pas les particularités d'une PWA installée (zones de sécurité, barre d'état translucide, cache des balises meta). Ces points se valident uniquement sur l'iPhone de Téo.
4. **SQL** : fichier idempotent, en français, avec en-tête et note de retour arrière, que Téo exécute. Jamais d'écriture sur la production par un outil.

### Checklist iPhone à remettre à Téo après chaque lot

1. Supprimer l'icône de l'écran d'accueil, redéployer, la rajouter.
2. Sombre puis clair : barre d'état floutée en haut, aucune bande en bas, barre d'onglets à sa place.
3. Ajouter une dépense du début à la fin, clavier ouvert, puis modifier, supprimer et annuler.
4. Changer de compte dans la pile, changer de période, ouvrir et fermer chaque feuille.
5. Retour par geste, rotation inutile, aucun scroll horizontal parasite.
6. Capture d'écran de tout ce qui paraît bizarre.

## 13. Glossaire

- **Gain** : type interne d'un revenu. **Dépense**, **Virement** : les deux autres types.
- **Patrimoine** : vue cumulée de tous les comptes (clé interne `"Tous"`).
- **Famille / sous-catégorie** : les 11 familles de premier niveau et leurs enfants.
- **Palier** : Amateur, Confirmé, Investisseur.
- **Plafond** : limite mensuelle de dépenses sur une famille.
- **Raccourci** : Raccourci iOS de saisie rapide.
