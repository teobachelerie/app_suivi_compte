-- Abonnements récurrents (Netflix, salle de sport, logiciels...). Une ligne ici est une RÈGLE
-- ("15€ le 5 de chaque mois"), pas une dépense elle-même — les dépenses réelles sont générées
-- automatiquement dans `transactions` par la tâche planifiée (voir pages/api/cron/subscriptions.js).
--
-- billing_day est limité à 1-28 pour éviter tout traitement spécial des mois plus courts
-- (pas de 30/31 février à gérer).

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  payment_method text not null,
  billing_day int not null check (billing_day between 1 and 28),
  active boolean not null default true,
  last_generated_month text, -- 'YYYY-MM' du dernier mois déjà généré, évite les doublons
  created_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "own subscriptions" on subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Permet de tracer quelle transaction vient de quel abonnement (facultatif, pour affichage).
alter table transactions add column if not exists subscription_id uuid references subscriptions(id) on delete set null;
