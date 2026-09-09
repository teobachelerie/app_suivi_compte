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
