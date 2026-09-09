-- Migration vers le multi-utilisateur, à exécuter sur TA base Supabase déjà en place
-- (celle où tourne déjà l'app avec tes vraies données migrées depuis Notion).
--
-- IMPORTANT : ce fichier contient 3 étapes SÉPARÉES. Ne colle pas tout d'un coup dans le SQL
-- Editor — exécute l'ÉTAPE 1, puis va créer ton compte dans l'app (inscription email + mot de
-- passe), PUIS reviens exécuter l'ÉTAPE 2 (après avoir remplacé le placeholder par ton vrai
-- identifiant), PUIS l'ÉTAPE 3.

-- ============================================================
-- ÉTAPE 1 — à exécuter maintenant, avant de créer ton compte
-- ============================================================
-- Retire l'ancienne contrainte "un seul nom de catégorie/compte pour toute la base" (bloquerait
-- l'inscription d'un deuxième utilisateur) et active les policies de sécurité par utilisateur.

alter table categories drop constraint if exists categories_name_key;
alter table accounts drop constraint if exists accounts_name_key;

drop policy if exists "own categories" on categories;
drop policy if exists "own accounts" on accounts;
drop policy if exists "own transactions" on transactions;

create policy "own categories" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own accounts" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- ÉTAPE 2 — après avoir créé ton compte dans l'app
-- ============================================================
-- 1. Va sur l'app, inscris-toi avec ton email + un mot de passe (onglet "Créer un compte").
-- 2. Dans le dashboard Supabase, menu de gauche > Authentication > Users : trouve ton email,
--    copie la valeur de la colonne "UID" (un identifiant du style
--    a1b2c3d4-e5f6-7890-abcd-ef1234567890).
-- 3. Remplace TON_UUID_ICI ci-dessous par cette valeur (aux 3 endroits), puis exécute ce bloc.
--    Ça rattache toutes tes données existantes (créées avant l'authentification) à ton compte.

update categories set user_id = 'TON_UUID_ICI' where user_id is null;
update accounts set user_id = 'TON_UUID_ICI' where user_id is null;
update transactions set user_id = 'TON_UUID_ICI' where user_id is null;

-- ============================================================
-- ÉTAPE 3 — une fois l'étape 2 exécutée avec succès
-- ============================================================
-- Referme la porte : impose qu'une ligne ait toujours un propriétaire, et que le nom d'une
-- catégorie/d'un compte ne soit unique que pour un même utilisateur (deux utilisateurs peuvent
-- avoir chacun une catégorie "Shopping").

alter table categories alter column user_id set not null;
alter table accounts alter column user_id set not null;
alter table transactions alter column user_id set not null;

alter table categories add constraint categories_user_id_name_key unique (user_id, name);
alter table accounts add constraint accounts_user_id_name_key unique (user_id, name);
