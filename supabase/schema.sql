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
-- - user_id est présent sur les trois tables mais nullable et non exploité pour l'instant
--   (l'app reste mono-utilisateur, comme avec Notion). Le jour où une vraie authentification
--   est ajoutée, il suffira de remplir cette colonne et d'ajouter des policies RLS dessus —
--   pas besoin de recréer les tables.
-- - RLS est activé sur les trois tables SANS policy définie. Concrètement : la clé "service
--   role" (utilisée uniquement côté serveur, jamais exposée au navigateur) continue d'avoir
--   accès à tout, comme aujourd'hui. Mais si un jour une clé "anon" est exposée côté client
--   (ex. une future app mobile qui parle à Supabase directement), rien ne fuit par défaut.

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  archived boolean not null default false,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  archived boolean not null default false,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
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
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions (date desc);
create index if not exists transactions_category_id_idx on transactions (category_id);
create index if not exists transactions_account_id_idx on transactions (account_id);

alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;

-- Données de démarrage : reprend exactement les catégories/comptes/paiements de l'app actuelle.
-- Adapte ou complète cette liste si tu as déjà ajouté d'autres catégories/comptes/livrets
-- dans l'app avant la bascule.
insert into categories (name) values
  ('Nourriture & Boissons'), ('Shopping'), ('Voyage'), ('Services'),
  ('Loisirs'), ('Santé'), ('Transport')
on conflict (name) do nothing;

insert into accounts (name) values
  ('Compte courant'), ('Compte pro')
on conflict (name) do nothing;
