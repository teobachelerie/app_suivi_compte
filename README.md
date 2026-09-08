# Expenses App

Suivi de dépenses connecté à une base Supabase (Postgres).

## 1. Créer le projet Supabase (si pas déjà fait)

1. Va sur https://supabase.com/dashboard → "New project"
2. Choisis un nom, un mot de passe de base de données (à conserver de côté), une région proche (ex. `eu-west-3` Paris ou `eu-central-1` Frankfurt)
3. Une fois le projet créé, va dans "SQL Editor" → "New query"
4. Colle le contenu du fichier `supabase/schema.sql` de ce dépôt, puis exécute-le ("Run")
   → ça crée les tables `categories`, `accounts`, `transactions`, et insère les catégories/comptes de départ

## 2. Récupérer les clés d'API

Dans le dashboard Supabase → "Project Settings" → "API" :
- `Project URL` → c'est `SUPABASE_URL`
- `service_role` (dans "Project API keys", PAS `anon`/`public`) → c'est `SUPABASE_SERVICE_ROLE_KEY`

La clé `service_role` donne un accès complet à la base, sans restriction. Elle n'est utilisée que côté serveur (dans `lib/supabase.js`, appelé uniquement depuis `pages/api/*`) — elle ne doit jamais apparaître dans du code exécuté côté navigateur.

## 3. Tester en local (optionnel)

```
npm install
cp .env.local.example .env.local
```
Remplis `.env.local` avec ton URL et ta clé service_role, puis :
```
npm run dev
```
Ouvre http://localhost:3000

## 4. Déployer sur Vercel

1. Crée un dépôt GitHub et pousse ce dossier dedans :
```
git init
git add .
git commit -m "Bascule vers Supabase"
git branch -M main
git remote add origin https://github.com/TON_USER/expenses-app.git
git push -u origin main
```
2. Va sur https://vercel.com → "Add New" → "Project" → importe ton dépôt GitHub
3. Avant de cliquer "Deploy", ouvre "Environment Variables" et ajoute :
   - `SUPABASE_URL` = l'URL de ton projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = ta clé service_role
4. Clique "Deploy". Vercel te donne une URL du type `expenses-app.vercel.app`

## Structure du projet

- `pages/index.js` — orchestration (état, appels API), délègue l'affichage aux composants ci-dessous
- `components/ui/` — briques visuelles réutilisables (cartes, listes, boutons, sélecteurs, panneaux)
- `components/TransactionModal.jsx`, `components/ReglagesScreen.jsx` — écrans spécifiques
- `lib/format.js` — fonctions pures de dates/montants/graphiques (aucune dépendance React)
- `lib/constants.js` — constantes partagées (catégories→icônes, périodes, etc.)
- `lib/api.js` — petit client fetch pour appeler `pages/api/*`
- `lib/supabase.js` — accès à la base Supabase, utilisé uniquement par `pages/api/*`
- `supabase/schema.sql` — schéma SQL à exécuter une fois dans le SQL Editor Supabase

## Notes

- Le moyen de paiement (Carte bancaire / Virement / Liquide) est fixe, pas éditable dans les réglages.
- Renommer une catégorie ou un compte dans les réglages met à jour son nom partout, y compris sur les transactions déjà enregistrées (clé étrangère, pas une copie de texte).
- Supprimer une catégorie ou un compte dans les réglages ne supprime pas la ligne correspondante ni les transactions qui l'utilisaient déjà — elle est archivée (`archived = true` dans Supabase), donc elle disparaît des choix futurs mais reste affichée normalement sur l'historique.
- La base reste mono-utilisateur pour l'instant (comme avec Notion) : la colonne `user_id` existe dans le schéma mais n'est pas encore exploitée, pour préparer une authentification future sans avoir à recréer les tables.
