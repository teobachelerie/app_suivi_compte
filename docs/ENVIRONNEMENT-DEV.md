# Environnement de développement (second projet Supabase)

Décision de Téo (17 octobre 2026) : le développement et les déploiements de prévisualisation Vercel utilisent un **second projet Supabase**, jamais la production. Les données y sont fictives.

## Ce que tu fais (une seule fois, environ 15 minutes)

1. **Créer le projet.** supabase.com > New project. Nom : `finelio-dev`. Région : la même que la production. Plan gratuit. Note le mot de passe de la base dans ton gestionnaire de mots de passe, pas ailleurs.
2. **Initialiser la base.** SQL Editor > New query. Colle **tout** le contenu de `supabase/dev/init-base-dev.sql` (520 lignes), puis Run. Succès attendu : « Success. No rows returned ». Une erreur : copie-moi le message, ne relance pas à moitié. Ce fichier est réservé à une base vierge ; ne le colle jamais dans le projet de production.
3. **Faciliter les comptes de test.** Authentication > Providers > Email : désactive « Confirm email » **dans ce projet de développement seulement**. Cela évite d'avoir à confirmer des adresses fictives.
4. **Récupérer les clés.** Project Settings > API : l'URL du projet, la clé `anon`, la clé `service_role`.
5. **Les poser dans Vercel, pour Preview uniquement.** Vercel > projet `finelio` > Settings > Environment Variables. Pour chacune des variables ci-dessous, décoche **Production** et **Development**, laisse cochée **Preview** (au besoin limite-la à la branche `refonte-ui`) :
   - `SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_URL` : l'URL du projet de développement
   - `SUPABASE_SERVICE_ROLE_KEY` : clé `service_role` du projet de développement
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé `anon` du projet de développement
   - `CRON_SECRET` : une chaîne aléatoire quelconque
   - Stripe, facultatif : tes clés **test** (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_CONFIRME`, `STRIPE_PRICE_INVESTISSEUR`). Le webhook n'est pas nécessaire pour l'interface.
   Vérifie que les variables de Production n'ont pas bougé : leurs valeurs restent celles de la production.
6. **Redirections d'authentification.** Dans le projet de développement : Authentication > URL Configuration. Site URL : l'adresse de prévisualisation Vercel de la branche (je te la donne après le premier push). Ajoute `https://*-finelio*.vercel.app/**` aux Redirect URLs.
7. **En local (facultatif).** Copie `.env.local.example` en `.env.local` et remplis-le avec les clés du projet de développement. `.env.local` est ignoré par git. Ne colle aucune clé dans le chat.

## Comment je sais que ça marche

- Après le premier push de `refonte-ui`, Vercel crée une prévisualisation. Tu t'y inscris avec une adresse fictive. Tu dois voir l'écran d'accueil avec un « Compte courant » vide.
- Dans le SQL Editor du projet de développement : `select count(*) from categories;` renvoie 71 (11 familles et 60 sous-catégories pour ce nouvel utilisateur).
- Dans la production : aucun nouvel utilisateur, aucune ligne ajoutée.

## Retour arrière

Supprimer le projet `finelio-dev` dans Supabase et les variables Preview dans Vercel. La production n'est pas touchée.

## Notes

- `HANDOFF.md` mentionne `supabase/ops/diagnostic-et-rattrapage-profils.sql`, absent du dépôt. Le statut de la partie 3 (verrouillage de `seed_category_taxonomy`) reste inconnu.
- Les captures de vérification (`npm run capture`) n'utilisent pas Supabase : elles simulent l'API dans le navigateur.
