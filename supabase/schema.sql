-- Schéma Supabase pour expenses-app
-- À exécuter une fois dans : Supabase Dashboard > SQL Editor > New query
--
-- Choix de conception :
-- - category_id / account_id sont des clés étrangères (pas des noms en texte). Renommer une
--   catégorie ou un compte se répercute donc automatiquement sur toutes les transactions
--   existantes, sans rien recopier — c'est l'équivalent propre de ce que faisait Notion avec
--   les ids d'options de select.
-- - "Supprimer" une catégorie/un compte ne supprime pas la ligne (ça casserait l'affichage
--   des anciennes transactions qui l'utilisaient) : ça pose archived = true. La catégorie/le
--   compte disparaît des choix proposés pour une nouvelle transaction, mais les anciennes
--   transactions continuent d'afficher son nom normalement — exactement le comportement
--   Notion actuel.
-- - user_id identifie le propriétaire de chaque ligne (authentification par email + mot de
--   passe, gérée par Supabase Auth). L'unicité du nom d'une catégorie/d'un compte est PAR
--   utilisateur (unique(user_id, name)), pas globale — sinon deux utilisateurs ne pourraient
--   jamais avoir tous les deux une catégorie "Shopping".
-- - RLS a des policies réelles : un utilisateur authentifié ne peut lire/modifier que ses
--   propres lignes. C'est une deuxième ligne de défense — la première étant que chaque
--   fonction de lib/supabase.js filtre déjà explicitement par user_id — utile si un jour un
--   client (ex. app mobile) parle à Supabase directement avec la clé anon plutôt qu'en passant
--   par nos routes /api/*.

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archived boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archived boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  type text not null check (type in ('Dépense', 'Gain')),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  payment_method text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions (date desc);
create index if not exists transactions_category_id_idx on transactions (category_id);
create index if not exists transactions_account_id_idx on transactions (account_id);
create index if not exists transactions_user_id_idx on transactions (user_id);

alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;

create policy "own categories" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own accounts" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pas de données de démarrage ici : chaque nouvel utilisateur part avec une liste de
-- catégories/comptes vide. L'app lui propose d'en créer dans Réglages dès sa première visite.
