# Expenses App

Suivi de dépenses multi-utilisateur (email + mot de passe), connecté à une base Supabase (Postgres).

## 1. Créer le projet Supabase (si pas déjà fait)

1. Va sur https://supabase.com/dashboard → "New project"
2. Choisis un nom, un mot de passe de base de données (à conserver de côté), une région proche (ex. `eu-west-3` Paris ou `eu-central-1` Frankfurt)
3. Une fois le projet créé, va dans "SQL Editor" → "New query"
4. Colle le contenu du fichier `supabase/schema.sql` de ce dépôt, puis exécute-le ("Run")
   → ça crée les tables `categories`, `accounts`, `transactions` (vides — chaque nouvel utilisateur part de zéro) et active la sécurité par utilisateur (RLS)

### Si tu as un projet Supabase déjà en place (créé avant l'authentification)

Exécute en plus `supabase/migration-002-multi-user.sql` — **en 3 étapes séparées, dans l'ordre indiqué dans le fichier** (étape 1 tout de suite, étape 2 après avoir créé ton propre compte dans l'app, étape 3 à la fin). Ce fichier corrige aussi un point important : l'ancien schéma interdisait à deux utilisateurs d'avoir chacun une catégorie du même nom — sans cette migration, l'inscription d'un deuxième utilisateur échouerait.

## 2. Activer l'authentification par email

Dans le dashboard Supabase → "Authentication" → "Providers" : le fournisseur "Email" est actif par défaut, rien à faire. Un point à décider :
- Par défaut, Supabase exige une confirmation par email avant la première connexion, via son service d'envoi limité (quelques emails par heure). Pour un petit groupe de test, tu peux désactiver ça : "Authentication" → "Providers" → "Email" → décoche "Confirm email". Sans ça, tes potes risquent de ne jamais recevoir l'email de confirmation.

## 3. Récupérer les clés d'API

Dans le dashboard Supabase → "Project Settings" → "API" :
- `Project URL` → sert à la fois pour `SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_URL`
- `service_role` (dans "Project API keys") → c'est `SUPABASE_SERVICE_ROLE_KEY`. Accès complet, sans restriction — utilisée UNIQUEMENT côté serveur (`lib/supabase.js`, appelé depuis `pages/api/*`). Ne doit jamais apparaître dans du code exécuté côté navigateur.
- `anon` `public` (dans "Project API keys") → c'est `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Celle-ci est faite pour être publique, elle ne donne accès qu'à ce que les policies RLS autorisent explicitement.

## 4. Tester en local (optionnel)

```
npm install
cp .env.local.example .env.local
```
Remplis `.env.local` avec les 4 valeurs, puis :
```
npm run dev
```
Ouvre http://localhost:3000

## 5. Déployer sur Vercel

1. Crée un dépôt GitHub et pousse ce dossier dedans :
```
git init
git add .
git commit -m "Multi-utilisateur"
git branch -M main
git remote add origin https://github.com/TON_USER/expenses-app.git
git push -u origin main
```
2. Va sur https://vercel.com → ton projet → Settings → Environments → variables d'environnement
3. Ajoute les 4 variables : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Déploie. Vercel te donne une URL du type `expenses-app.vercel.app`

## Structure du projet

- `pages/index.js` — vérifie la session (écran de connexion si absente), puis délègue à `ExpensesApp` : orchestration (état, appels API), délègue l'affichage aux composants ci-dessous
- `components/AuthScreen.jsx` — écran de connexion / inscription
- `components/ui/` — briques visuelles réutilisables (cartes, listes, boutons, sélecteurs, panneaux)
- `components/TransactionModal.jsx`, `components/ReglagesScreen.jsx` — écrans spécifiques
- `lib/format.js` — fonctions pures de dates/montants/graphiques (aucune dépendance React)
- `lib/constants.js` — constantes partagées (catégories→icônes, périodes, etc.)
- `lib/supabaseClient.js` — client Supabase côté navigateur (clé anon), utilisé uniquement pour l'authentification
- `lib/api.js` — client fetch qui attache automatiquement le jeton de session à chaque appel à `pages/api/*`
- `lib/supabase.js` — accès à la base Supabase (clé service_role), utilisé uniquement par `pages/api/*` ; chaque fonction exige et filtre par `userId`
- `supabase/schema.sql` — schéma de référence pour une nouvelle installation
- `supabase/migration-002-multi-user.sql` — migration pour une base déjà existante (voir ci-dessus)

- `pages/api/api-keys/` — création/liste/révocation des clés d'API (Raccourcis iOS)
- `supabase/migration-003-api-keys.sql` — table des clés d'API, à exécuter en plus du schéma principal
- `supabase/migration-004-onboarding-seed.sql` — trigger Postgres : crée automatiquement "Compte courant" + les 7 catégories de départ à l'inscription
- `components/Onboarding.jsx` — tutoriel affiché une fois à la première connexion (mémorisé en local, par utilisateur)

## Objectifs, tags, fractionnement, règles de catégorisation, Progression, assistant IA

Gros chantier de fonctionnalités (issu d'une veille concurrentielle — voir le rapport fourni séparément) :

- **Objectifs d'épargne** (onglet Aperçu → carte "Objectifs") : montant cible, date cible, compte lié. L'app calcule le versement mensuel nécessaire, recalculé à chaque ouverture à partir du solde réel du compte — jamais stocké en dur.
- **Progression** (onglet Aperçu → carte "Progression") : taux d'épargne du mois, tendance sur 12 mois, records personnels (meilleur taux d'épargne, mois le plus économe, plus longue série de trésorerie positive), heatmap des dépenses (26 dernières semaines), répartition des revenus du mois en barre segmentée.
- **Tags** sur les transactions (en plus des catégories), cherchables depuis la barre de recherche d'Activité.
- **Fractionnement d'une transaction** en plusieurs catégories (bouton "Fractionner" dans le formulaire). Le montant/compte/date restent le total ; seules les statistiques par catégorie tiennent compte de la répartition.
- **Règles de catégorisation automatique** (Réglages → nouvelle section) : un mot-clé dans le titre pré-remplit la catégorie dans le formulaire (n'affecte jamais les Raccourcis iOS, qui envoient déjà une catégorie).
- **Export CSV/JSON** (Réglages → Export) : toutes les transactions, indépendamment de l'app.
- **Icône d'écran d'accueil** : une vraie icône (`public/apple-touch-icon.png`) remplace la capture d'écran automatique d'iOS quand l'app est ajoutée à l'écran d'accueil.

**Nouvelle migration à exécuter** : `supabase/migration-006-power-features.sql` (tables `goals` et `category_rules`, colonnes `tags`/`splits` sur `transactions`).

## Sécurité

- **Next.js 14.2.35** (corrige une faille critique de la version 14.2.5 — la plupart des CVE concernées touchent l'Image Optimization API, le Middleware et les Server Actions, aucun n'étant utilisé par cette app en Pages Router).
- Résolution des noms de catégorie/compte (`resolveId`) **insensible à la casse** : un écart de casse (cache local obsolète, renommage) ne fait plus échouer une transaction.
- Comparaison du `CRON_SECRET` à **temps constant** (protection contre les attaques par mesure de temps).
- Chaque route `/api/*` vérifie l'authentification en premier ; la sécurité multi-utilisateur repose sur un filtrage explicite par `user_id` dans chaque requête (RLS activé en filet de sécurité, mais la clé service_role l'ignore).

## Abonnements récurrents

Une carte en haut de l'onglet Budgets ouvre la gestion des abonnements (Netflix, salle de sport…) : montant, catégorie, compte, moyen de paiement, jour du mois de prélèvement (1 à 28).

Chaque jour à 6h UTC (~7h ou 8h à Paris selon l'heure d'été), une tâche planifiée Vercel (`vercel.json` → `crons`) appelle `/api/cron/subscriptions`, qui crée automatiquement une transaction pour chaque abonnement actif dont c'est le jour de prélèvement. Un abonnement désactivé (bascule dans son écran) n'en génère plus, sans supprimer l'historique déjà créé.

**Variable d'environnement supplémentaire à ajouter sur Vercel** : `CRON_SECRET` — une chaîne aléatoire de ton choix (ex. générée avec `openssl rand -hex 32` dans un terminal), qui empêche n'importe qui de déclencher la génération de transactions à la main en devinant l'URL.

⚠️ À vérifier une fois déployé : le plan gratuit Vercel a historiquement limité le nombre et la fréquence des tâches planifiées. Une seule tâche quotidienne comme ici devrait passer, mais confirme dans ton dashboard Vercel (Settings → Cron Jobs) que la tâche apparaît bien active et s'exécute.

## Suppression de compte

Réglages → Compte → "Zone de danger" → "Supprimer mon compte", avec confirmation explicite avant l'action. Annule immédiatement l'abonnement Stripe actif s'il y en a un, puis supprime le compte Supabase Auth — toutes les données (transactions, comptes, catégories, objectifs, abonnements suivis, palier) sont supprimées avec, automatiquement, chaque table étant déjà déclarée en suppression en cascade. Irréversible. Permet aussi de recréer un compte avec la même adresse email juste après.

## Correctifs onboarding + PEA Jeune dans le simulateur

- **Halo blanc dans la bulle de la visite guidée** : corrigé. L'ombre utilisée venait du même langage néomorphique que le reste de l'app, pensé pour un fond clair — sur le voile sombre de la visite, cette ombre devenait un vrai halo visible. Remplacée par l'ombre de recouvrement des fiches (celle des feuilles modales), adaptée à un fond sombre.
- **Le tuto se relançait après un paiement pris pendant l'inscription** : corrigé. La visite n'était marquée comme vue qu'en cas de choix du palier gratuit ; elle l'est maintenant aussi juste avant le départ vers Stripe.
- **Formulations avec tirets longs** ("—") repérées dans les textes visibles (visite guidée, questionnaire, simulateur, Réglages) et reformulées en phrases plus simples et directes.
- **Simulateur PEA** : ajout d'un mode "PEA Jeune vers PEA classique" (interrupteur dans une nouvelle section). Renseigne ton âge actuel, l'âge de passage au PEA classique (18 à 25 ans), et les deux plafonds (20 000 € / 150 000 € par défaut, modifiables). Les versements s'arrêtent automatiquement une fois le plafond du PEA Jeune atteint, la valeur continue de fructifier sur les intérêts déjà acquis, puis les versements reprennent au plafond classique une fois l'âge de transition atteint.

## Taux d'épargne

Nouvelle carte dans Budgets, juste avant "Total dépensé" : (virements vers un livret ÷ revenus de la période) × 100. N'utilise que les virements dont le compte cible est un livret — jamais compté comme dépense ou revenu ailleurs, respecte le même compte/la même période que le reste de l'onglet Budgets. Affiche "—" si aucun revenu sur la période (pas de division par zéro).

## Nouvelle taxonomie de catégories + import de données

**Ce qui change** : 12 familles de catégories (dont "Abonnements", ajoutée à ta demande), 74 sous-catégories, chacune avec une icône et un palier. Purement additif : tes catégories actuelles (Abonnement, Client, Loisirs, Nourriture & Boissons, Santé, Services, Shopping, Transport, Virement automatique, Épargne) restent intactes, utilisables, non restreintes par palier — la nouvelle taxonomie s'ajoute à côté. Les futurs comptes ne reçoivent plus que la nouvelle taxonomie.

**Résolution des paliers** (le document source était ambigu) : "confirme" dans le document → Amateur ici, "investisseur" dans le document → Confirmé ici, sauf Investissement et Dividendes/Intérêts qui restent exclusivement Investisseur. Ton propre compte étant Investisseur, tu vois tout, sans exception.

**Sélecteur de catégorie** : seules les sous-catégories (et "Autre") sont sélectionnables pour une transaction — les 12 familles elles-mêmes ne sont que des regroupements, pas des choix directs.

**Import de données (nouveau)** : Réglages → Export → section "Importer", fichier JSON au même format que l'export. Validation stricte de tout le fichier avant d'écrire quoi que ce soit — si une seule ligne a une catégorie ou un compte introuvable, rien n'est importé, avec le détail exact des lignes à corriger.

**Fichier livré séparément** : `nouvelle-taxonomie-categories.md` — la liste complète des noms exacts à utiliser dans ton fichier d'export avant de le réimporter.

**Deux limites connues, à savoir avant de tester** :
1. Les icônes Fluent Emoji ne sont pas encore affichées dans les listes de transactions (elles sont stockées et servies, mais le rendu visuel dans l'app utilise encore l'ancien système d'icônes) — un vrai chantier à part si tu le veux.
2. Réglages → Catégories va afficher beaucoup plus de lignes d'un coup (~96 avec tes catégories historiques) — fonctionnel mais pas encore organisé par famille dans cet écran de gestion.

**⚠️ Ordre de déploiement strict, comme pour le système de paliers** :
1. Exécute `supabase/migration-013-category-taxonomy.sql` **en premier**. Cette migration touche tous les comptes existants (le tien et ceux de tes amis) — elle est purement additive (rien n'est supprimé ni modifié), mais elle prend un peu de temps vu le nombre de lignes créées.
2. Vérifie dans Supabase (Table Editor → categories) que ton compte a bien de nouvelles lignes avec un `tier` renseigné.
3. Remplace le dossier local, push, Redeploy + vérification du commit.

## Rebranding : Finelio

Nom, icône (favicon, icône iOS, icônes PWA 192/512) et manifest PWA mis à jour depuis les nouveaux logos. Le logo carré sert de source pour toutes les icônes (les plateformes appliquent elles-mêmes l'arrondi) ; le logo App Store 1024 est conservé à part (`appstore-icon-1024-reserve-future.png`, à la racine), pas branché au web, pour une future soumission native. L'abonnement interne à l'app (visible dans tes abonnements récurrents) est renommé "Finelio" ; la recherche reconnaît encore l'ancien nom "Cap Finances" une fois, pour basculer automatiquement sans dupliquer la ligne.

**Sur l'URL** : je ne peux pas la changer moi-même (pas d'accès à ton compte Vercel), mais tu peux renommer le projet toi-même dans Vercel → Settings → General → Project Name, ce qui change gratuitement le sous-domaine (`finelio.vercel.app` si disponible). Pour un vrai nom de domaine à toi, il faudrait l'acheter puis le relier dans Vercel → Settings → Domains — dis-moi si tu veux qu'on regarde ça.

## Nouvelle sélection de catégorie dans l'assistant d'ajout

Refaite en feuille du bas, avec le comportement exact demandé : Dépenses/Revenus toujours visibles en haut, retaper sur Dépenses revient toujours à la grille des familles, taper sur Revenus bascule directement sur ses sous-catégories (une seule famille de revenus, pas d'étape intermédiaire), taper une famille (ex. Loisirs) montre ses sous-catégories avec la famille elle-même sélectionnable en premier choix. Les étapes montant et détails, que tu avais validées, n'ont pas changé.

## Nouvel assistant d'ajout de transaction (façon app de référence)

Le bouton "+" ouvre maintenant un parcours en 3 étapes plutôt qu'un formulaire unique : type (Dépense/Gain/Virement) → catégorie (grille d'icônes, groupée par famille) → montant (clavier calculatrice avec +, −, ×, ÷) → titre et détails (compte, moyen de paiement, date, tags, une nouvelle Remarque libre). Modifier une transaction existante garde l'ancien formulaire à un seul écran, inchangé — cette refonte ne concerne que la création.

**Nouveau champ** : `notes` sur les transactions (migration `014-transaction-notes.sql`, purement additive).

**Volontairement laissé de côté, à traiter séparément si tu veux** : les pièces jointes (demande un vrai système de stockage de fichiers, absent de l'app aujourd'hui) et les onglets "Défaut / À venir / Abonnement" de l'app de référence (nos abonnements sont déjà un système séparé et plus complet).

## Arborescence dans Budgets et Réglages → Catégories, et vrai pourcentage

**Le "100 %" sur Transport était un vrai bug** : le calcul comparait chaque catégorie à la plus grosse, pas au total réel des dépenses — la catégorie la plus dépensée affichait donc toujours 100 % par construction. Corrigé : le pourcentage reflète maintenant la vraie part du total.

**Budgets** : la liste ne montre plus que les familles (Transport, Loisirs, etc.), chacune avec son total agrégé (famille + toutes ses sous-catégories) et son vrai %. Toucher une famille déplie ses sous-catégories ayant plus de 0 € sur la période. Le camembert suit la même logique (tranches par famille, pas par sous-catégorie).

**Réglages → Catégories** : même principe — seules les familles sont visibles au départ, toucher l'une d'elles déplie ses sous-catégories, chacune restant modifiable (nom, couleur, suppression) exactement comme avant.

**Nuance à connaître** : si une famille a à la fois des dépenses directement taguées sur elle-même (sans sous-catégorie précisée) et des dépenses sur ses sous-catégories, le total affiché en haut inclut les deux, mais seules les sous-catégories apparaissent une fois dépliée — la somme du détail peut donc être légèrement inférieure au total affiché. Dis-moi si tu veux que j'ajoute une ligne "Divers" pour réconcilier ça visuellement.

## Correctif : visite guidée + questionnaire qui se relançaient à chaque connexion

L'état "déjà vu" n'était stocké qu'en localStorage, côté navigateur — fragile sur PWA iOS (Safari peut effacer ce stockage entre deux sessions, ce qui correspond exactement au symptôme). Déplacé côté serveur (`user_plans.onboarding_seen`), qui devient la source de vérité ; le localStorage ne sert plus que d'optimisation pour éviter un flash au premier rendu, et se réconcilie automatiquement avec le serveur au chargement. Migration `015-onboarding-server-side.sql`, additive.

## ⚠️ Renommage du projet Vercel en finelio.vercel.app : une action à faire toi-même dans Stripe

Le webhook Stripe (Développeurs → Webhooks) pointe encore vers l'ancienne URL `app-suivi-compte-eight.vercel.app/api/billing/webhook`. Si Vercel a bien libéré cette ancienne adresse au profit de la nouvelle, ce webhook ne reçoit plus rien — les mises à jour d'abonnement (paiement, annulation) cesseraient silencieusement de fonctionner. Va dans Stripe → Développeurs → Webhooks, modifie l'URL de l'endpoint existant en `https://finelio.vercel.app/api/billing/webhook` (ou supprime-le et recrée-le). Je ne peux pas le faire moi-même, je n'ai pas accès à ton compte Stripe.

## Correctif : icônes manquantes sur les catégories historiques adoptées

Transport, Santé, Shopping et Loisirs (tes catégories réutilisées comme parent lors de la migration de taxonomie) n'avaient jamais reçu d'icône. Script `corriger-icones-categories-historiques.sql` livré séparément — simple mise à jour, aucun risque.

## Chevauchement du sélecteur Dépense/Gain + repère de compte perdu

- **Le sélecteur Dépense/Gain chevauchait le montant** sur les périodes à gros total (3 mois, 6 mois...) : il était positionné en survol au-dessus du contenu au lieu d'être dans le flux normal. Remis dans le flux, sur sa propre ligne — la collision n'est plus possible, quelle que soit la largeur du montant.
- **Le compte sélectionné n'était visible nulle part une fois entré dans Dépenses, Revenus ou Activité** : ces écrans respectaient déjà le compte choisi sur Accueil (le calcul était juste), mais rien ne l'affichait. Ajout du nom du compte en sous-titre partout, et de la couleur de banque (bande en haut de la carte) sur Dépenses/Revenus, comme sur Accueil.

## Virement invisible dans l'historique du compte cible

Un virement n'apparaissait que dans l'historique de son compte source — le compte cible voyait son solde augmenter sans aucune ligne pour l'expliquer. Corrigé sur l'écran Activité, l'Accueil et le détail d'un livret : un virement apparaît maintenant des deux côtés (dépense/sortie côté source, arrivée neutre côté cible), sans jamais compter comme dépense ou revenu dans les totaux.

**Nettoyage manuel à faire de ton côté** : si tu avais des anciennes paires "Dépense + Gain" créées à la main pour simuler un virement avant que cette fonctionnalité existe, converti une des deux lignes en vrai Virement, il faut supprimer l'autre ligne (le doublon), sinon le montant compte deux fois.

## Correctifs écran Dépenses/Revenus (graphique mensuel)

- **Texte "Dépense" qui dépassait de son bouton** : corrigé (le bouton n'avait aucun rembourrage interne et une largeur trop étroite).
- **Sélection d'un mois par appui-maintien, qui bloquait le défilement** : remplacée par un simple appui. Toucher un mois l'affiche en dessous ; le retoucher désélectionne. Le défilement fonctionne à nouveau normalement sur cet écran.
- **Tri de la liste du mois sélectionné** : un sélecteur "Chronologie / Montant" apparaît une fois un mois choisi — chronologie (comportement de base, plus récent en premier) ou montant décroissant (le plus gros d'abord).

## Réorganisation du backend (rapidité)

L'ancien `lib/supabase.js` (un seul fichier de 550+ lignes regroupant tout : transactions, abonnements, objectifs, paliers, clés API...) est découpé en fichiers ciblés par fonctionnalité : `lib/db.js` (socle commun : client Supabase, authentification), `lib/apiKeys.js`, `lib/transactions.js`, `lib/billing.js`, `lib/account.js`, `lib/meta.js`, `lib/subscriptions.js`, `lib/goals.js`, `lib/categoryRules.js`. Chaque route API n'importe plus que ce dont elle a réellement besoin.

**Effet concret** : avant, `/api/meta` (utilisée par le Raccourci iOS) embarquait tout le code de l'app à chaque appel, même la partie transactions ou abonnements qu'elle n'utilise jamais. Vérifié après coup sur le code compilé : elle n'embarque plus que le strict nécessaire. Réduit le temps de démarrage à froid du serveur gratuit, sans le supprimer entièrement (ça reste un serveur gratuit).

**Aucun changement de comportement** : mêmes fonctions, mêmes noms, même logique — seul l'endroit où elles vivent dans le code a changé. Aucune migration, aucune variable d'environnement.

## Raccourci iOS dynamique : méthode simplifiée

`GET /api/meta` renvoie maintenant, en plus des objets complets, `categoryNames`, `accountNames` et `paymentNames` — des chaînes de texte simples, noms séparés par des virgules. Pensé spécifiquement pour le Raccourci iOS : plus fiable d'y découper du texte par virgule que d'extraire une clé sur chaque élément d'une liste d'objets JSON dans l'éditeur Raccourcis (source de confusion constatée en pratique). Limite connue et acceptée : un nom de catégorie ou de compte contenant lui-même une virgule casserait le découpage — aucun de tes noms actuels n'en a.

## Onboarding repensé : visite guidée réelle + questionnaire de palier

L'ancien tutoriel en diapositives (captures d'écran factices) est remplacé par une vraie visite guidée : l'écran se grise, un seul vrai bouton reste visible en surbrillance à chaque étape (le "+", Réglages, Raccourci iOS, Comptes, Catégories, Budgets, Patrimoine), avec une bulle qui explique et un bouton "Suivant" — la visite navigue elle-même dans l'app au fil des étapes. "Passer tout" saute directement au questionnaire.

À la fin : un questionnaire de 5 questions calcule un score sur 10 et recommande un palier (0-3 → Amateur, 4-7 → Confirmé, 8-10 → Investisseur), avec le choix final identique à avant (redirection Stripe si palier payant).

**Écran Abonnement (Réglages) refait en vrai tableau comparatif** : les 3 paliers côte à côte avec coche/croix par fonctionnalité, calculé directement à partir de `TIER_LIMITS` (une seule source de vérité, plus de prix ou de limites dupliqués entre fichiers).

**Correctif thème banque** : la couleur choisie pour un livret (pas seulement un compte principal) s'affiche maintenant sur son icône dans la liste Épargne — ça n'avait aucun effet visuel avant.

## Thème visuel par banque (couleurs uniquement, pas de logos)

Réglages → Comptes → petite pastille colorée à côté de chaque compte (avant le crayon) → choisis une banque parmi 10 préréglages français (Société Générale, Trade Republic, Boursorama, BNP Paribas, Crédit Agricole, La Banque Postale, LCL, Caisse d'Épargne, Revolut, N26). Une fois assignée, sa couleur teinte le sélecteur de compte en haut d'Accueil (segment actif) et une fine bande en haut de la carte de solde, quand ce compte est sélectionné.

**Volontairement limité aux couleurs, pas de logos** — voir la discussion sur les risques de marque : un logo de banque dans une app tierce non affiliée est un vrai risque juridique, une couleur d'accent approximative ne l'est pas. Les couleurs viennent de ma connaissance générale des identités de marque (pas vérifiées en direct) — à ajuster toi-même si une teinte te semble à côté de la plaque.

**Nouvelle migration à exécuter** : `supabase/migration-012-account-bank-theme.sql` (colonne `bank_id` sur `accounts`).

## Correctifs abonnements + Simulateur PEA

- **Interrupteur actif/inactif d'un abonnement** : ne déclenche plus l'ouverture de la fiche par erreur.
- **Génération immédiate à la création** : si tu crées un abonnement avec un jour de prélèvement déjà passé ce mois-ci (ou tombant aujourd'hui), la dépense correspondante est créée tout de suite, sans attendre le mois prochain — avant, il fallait attendre la tâche planifiée du lendemain, qui ne matchait alors plus le bon jour.
- **Simulateur PEA** (Accueil → carte "Simulateur PEA") : apport initial, versement mensuel, rente mensuelle retirée (facultative), rendement annuel (8 % par défaut), inflation (3 % par défaut), durée en années — tout modifiable. Graphique en aires empilées (versements en noir, intérêts en vert), valeur finale, % de plus-value, valeur ajustée de l'inflation. Purement client, aucune donnée sauvegardée, aucune migration nécessaire.

## Paliers d'abonnement — étape 3 : abonnement auto-suivi, état visible, choix à l'onboarding

Trois ajouts sur le système de paliers :

1. **L'abonnement à Cap Finances lui-même apparaît automatiquement comme une dépense récurrente** dans le suivi des abonnements de l'app (même écran que Netflix etc.), sur le compte le plus ancien de l'utilisateur — le compte "par défaut" n'existant que côté navigateur (localStorage), invisible depuis le serveur, ce compte le plus ancien est le meilleur repère disponible (c'est "Compte courant" pour la quasi-totalité des utilisateurs). Mis à jour automatiquement si le palier change, désactivé (pas supprimé) à l'annulation.
2. **Réglages → Abonnement affiche maintenant la date de renouvellement**, ou la date d'annulation effective si tu as déjà annulé (Stripe garde l'accès actif jusqu'à la fin de la période déjà payée — les deux cas sont maintenant distingués correctement).
3. **L'onboarding (tutoriel de démarrage) se termine par un choix de palier**, avec redirection vers le paiement Stripe si Confirmé/Investisseur est choisi.

**Nouvelle migration à exécuter** : `supabase/migration-011-cancel-at-period-end.sql`.

## Paliers d'abonnement — étape 2 : paiement Stripe (mode test)

Le vrai checkout, en mode test Stripe (aucun argent réel, cartes de test uniquement). Trois nouvelles routes : `/api/billing/checkout` (démarre un paiement), `/api/billing/webhook` (Stripe informe l'app qu'un paiement a réussi/été annulé), `/api/billing/portal` (le client gère/annule lui-même son abonnement).

**Quatre nouvelles variables d'environnement Vercel**, à ajouter dans cet ordre précis — le webhook a besoin d'une chose que seul un premier déploiement peut donner :

1. `STRIPE_SECRET_KEY` = ta clé secrète de test (`sk_test_...`)
2. `STRIPE_PRICE_CONFIRME` = `price_1UHdO0GhfzTnnxCCosB1NIs6`
3. `STRIPE_PRICE_INVESTISSEUR` = `price_1UHdOcGhfzTnnxCCECK451YA`
4. `STRIPE_WEBHOOK_SECRET` — **pas encore disponible à ce stade**, voir étape suivante.

**Étapes, dans l'ordre** :
1. Ajoute les 3 premières variables ci-dessus sur Vercel.
2. Déploie ce code (dossier remplacé, push, Redeploy + vérification du commit comme d'habitude).
3. Une fois en ligne, va sur Stripe (toujours en mode test) → Développeurs → Webhooks → "Ajouter un endpoint". URL : `https://finelio.vercel.app/api/billing/webhook`. Événements à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Stripe affiche alors un "Secret de signature" (`whsec_...`) — copie-le, ajoute-le comme 4ème variable `STRIPE_WEBHOOK_SECRET` sur Vercel.
5. Redeploy une deuxième fois (obligatoire pour que cette dernière variable soit prise en compte).

**Test de bout en bout, avec une fausse carte Stripe** : Réglages → Abonnement → "Passer à Confirmé" → sur la page Stripe qui s'ouvre, utilise le numéro de carte de test `4242 4242 4242 4242`, une date future quelconque, un CVC quelconque (ex. 123) → valide. Tu dois revenir sur l'app et voir ton palier passé à "Confirmé" dans Réglages. Vérifie aussi côté Supabase (table `user_plans`) que la ligne s'est bien mise à jour.

**Rappel de sécurité** : ceci reste entièrement en mode test — sans risque, aucun vrai paiement possible tant que les clés commencent par `sk_test_`/`price_` de test.

## Paliers d'abonnement (Amateur / Confirmé / Investisseur) — étape 1 : base technique

Première étape d'un chantier plus large (voir plus bas pour l'étape 2, le paiement Stripe). Pour l'instant : une table `user_plans` stocke le palier de chaque utilisateur, avec des limites appliquées sur les comptes, les objectifs, les couleurs de catégorie, les règles de catégorisation automatique, et l'export.

**Garantie de non-régression, à vérifier après déploiement** : la migration place automatiquement **tous les comptes déjà existants** (le tien, ceux de tes amis) sur le palier `investisseur` (aucune limite) — personne n'est censé perdre le moindre accès. Seuls les comptes créés après cette migration démarrent sur `amateur`.

**⚠️ Ordre de déploiement obligatoire, dans cet ordre précis et pas dans un autre** :
1. Exécute `supabase/migration-010-billing-tiers.sql` dans Supabase **en premier**, avant de déployer le nouveau code.
2. Vérifie dans Supabase (Table Editor → `user_plans`) que ton compte et ceux de tes amis ont bien `tier = 'investisseur'`.
3. Seulement après cette vérification : remplace le dossier local, push, Redeploy + vérification du commit comme d'habitude.

Si le nouveau code est déployé **avant** la migration, chaque tentative d'ajouter un compte ou un objectif échouera (la table `user_plans` n'existera pas encore) — d'où l'ordre strict ci-dessus.

Limites actuelles par palier (modifiables dans `TIER_LIMITS`, `lib/supabase.js`) :

| | Amateur | Confirmé | Investisseur |
|---|---|---|---|
| Comptes | 1 | 5 | Illimités |
| Objectifs | 1 | 3 | Illimités |
| Export | 3 derniers mois | Illimité | Illimité |
| Couleurs de catégorie | ❌ | ✅ | ✅ |
| Règles de catégorisation auto | ❌ | ✅ | ✅ |

**Pas encore construit (étape 2, à venir)** : le paiement réel via Stripe (checkout, changement de palier, annulation). Réglages → Abonnement affiche pour l'instant le palier actuel en lecture seule.

## Virement entre comptes

Un troisième type de transaction, "Virement" (en plus de Dépense/Gain), pour déplacer de l'argent entre deux de tes comptes (ex. Compte courant → Livret A) sans que ça compte comme dépense ou revenu — le patrimoine total n'en est jamais affecté, seuls les soldes des deux comptes concernés bougent. Catégorie "Virement automatique" auto-créée au premier virement (visible et modifiable comme une catégorie normale ensuite). Titre facultatif : par défaut "Compte source → Compte cible" si laissé vide.

**Nouvelle migration à exécuter** : `supabase/migration-009-virement-interne.sql` (colonne `to_account_id`, mise à jour de la contrainte sur `type`).

**À faire une fois en ligne** : supprime toi-même, comme prévu, les anciennes dépenses/revenus "Virement" que tu avais créés manuellement pour compenser ce manque — elles ne sont plus nécessaires.

## Accueil (anciennement Aperçu)

L'onglet a été renommé "Accueil". Le bloc "Progression" (records, tendances) a été retiré — jugé pas assez clair/utile — et le bloc "Objectifs" prend maintenant toute la largeur à sa place.

## Camembert et couleurs de catégorie

L'onglet Budgets affiche désormais un camembert (catégories ou comptes, selon le sélecteur) au lieu d'une liste de cartes, avec une légende colorée en dessous (nom, pourcentage, montant). Chaque catégorie peut avoir une couleur personnalisée, assignée depuis Réglages → Catégories (pastille de couleur cliquable à côté de chaque nom, sélecteur natif iOS). Sans couleur choisie, chaque catégorie reçoit automatiquement une couleur stable de la palette par défaut (toujours la même pour un nom donné). Les comptes suivent la même logique de couleur automatique, sans personnalisation manuelle.

**Nouvelle migration à exécuter** : `supabase/migration-008-category-colors.sql` (colonne `color` sur `categories`).

## Emoji par transaction

Chaque dépense/revenu peut avoir un emoji personnalisé (ex. 🍕) qui remplace l'icône de catégorie dans les listes. Champ facultatif dans le formulaire web, et dans le Raccourci iOS entre le choix de la catégorie et celui du compte (voir plus bas). Sans emoji, l'icône de catégorie habituelle s'affiche comme avant.

**Nouvelle migration à exécuter** : `supabase/migration-007-emoji.sql` (colonne `emoji` sur `transactions`).

## Raccourcis iOS

Réglages → "Raccourcis iOS" propose deux boutons d'installation directe (liens de partage iCloud, ouvrent l'app Raccourcis en un tap) — plus besoin d'envoyer un lien manuellement à chaque nouvelle personne.

1. La personne touche "Installer Ajouter une dépense" / "Ajouter un revenu" dans l'app → Raccourcis s'ouvre → "Ajouter le raccourci"
2. Elle génère sa clé plus bas dans le même écran, la copie
3. Elle ouvre le raccourci installé (app Raccourcis), touche le tout premier bloc (un bloc "Texte" contenant un texte factice) et colle sa clé à la place

Si les raccourcis sont un jour modifiés et republiés (nouveau lien iCloud), mets à jour `SHORTCUT_URL_DEPENSE` / `SHORTCUT_URL_REVENU` dans `lib/constants.js` — ce sont de simples liens publics, sans rien de secret dedans (le bloc Texte du raccourci partagé contient un texte factice, jamais une vraie clé).

## Notes

- Le moyen de paiement (Carte bancaire / Virement / Liquide) est fixe, pas éditable dans les réglages.
- Renommer une catégorie ou un compte dans les réglages met à jour son nom partout, y compris sur les transactions déjà enregistrées (clé étrangère, pas une copie de texte).
- Supprimer une catégorie ou un compte dans les réglages ne supprime pas la ligne correspondante ni les transactions qui l'utilisaient déjà — elle est archivée (`archived = true` dans Supabase), donc elle disparaît des choix futurs mais reste affichée normalement sur l'historique.
- Chaque utilisateur ne voit que ses propres catégories, comptes et transactions — imposé à la fois par le filtrage explicite dans `lib/supabase.js` et par les policies RLS de Supabase (double sécurité).
- N'importe qui avec le lien de l'app peut créer un compte (pas de liste blanche d'emails). À revoir avant une diffusion plus large que quelques amis.
- Un nouvel utilisateur démarre avec zéro catégorie et zéro compte : il doit en créer au moins un dans Réglages avant de pouvoir ajouter une transaction. Pas d'écran d'accueil qui l'explique pour l'instant — à prévoir si ça prête à confusion en pratique.
- Une clé d'API donne accès en lecture/écriture à toutes les transactions de la personne qui l'a créée (pas de droits restreints). Elle n'est stockée qu'en empreinte (hash), jamais en clair, mais si l'appareil sur lequel elle est collée (le Raccourci iOS) est compromis, la clé l'est aussi — d'où la possibilité de la révoquer à tout moment sans toucher au mot de passe du compte.
- Le tutoriel ne s'affiche qu'une fois par utilisateur, mémorisé dans le navigateur (localStorage) — pas dans Supabase. Il réapparaîtra donc si la personne change de navigateur/appareil ou vide ses données de site. Pas de bouton pour le revoir manuellement pour l'instant.
