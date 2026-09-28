-- Plafonds mensuels par catégorie (famille) : "Alimentation : 300 € par mois maximum".
-- Un seul plafond par catégorie et par utilisateur. Purement additif.
-- La dépense du mois n'est jamais stockée : toujours recalculée à partir des transactions.
create table if not exists category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);
alter table category_budgets enable row level security;
drop policy if exists "own category budgets" on category_budgets;
create policy "own category budgets" on category_budgets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
