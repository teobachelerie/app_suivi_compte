-- Objectifs d'épargne : "mettre X€ de côté sur le compte Y d'ici la date Z". Le versement mensuel
-- nécessaire n'est jamais stocké — toujours recalculé côté client à partir du solde actuel du
-- compte lié, pour rester juste même quand le solde change entre deux visites.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  target_date date not null,
  account_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table goals enable row level security;
create policy "own goals" on goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Règles de catégorisation automatique : si le titre d'une dépense contient ce mot-clé (recherche
-- insensible à la casse, sous-chaîne), l'app pré-remplit la catégorie dans le formulaire.
-- N'affecte jamais les Raccourcis iOS (qui envoient déjà une catégorie explicite).
create table if not exists category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table category_rules enable row level security;
create policy "own category rules" on category_rules for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tags libres sur une transaction (ex. "vacances", "cadeau") — en plus de la catégorie, pas à sa place.
alter table transactions add column if not exists tags text[] not null default '{}';

-- Fractionnement d'une transaction en plusieurs catégories. Le montant/compte/date de la ligne
-- restent le TOTAL — `splits` ne sert qu'à répartir ce total entre catégories pour les besoins des
-- statistiques de budget ; les soldes de comptes n'en ont jamais besoin et restent inchangés.
-- Format : [{"category": "Nourriture & Boissons", "amount": 32.5}, {"category": "Hygiène", "amount": 12}]
alter table transactions add column if not exists splits jsonb;
