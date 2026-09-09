-- Clés d'API pour l'accès direct (Raccourcis iOS) sans passer par le mot de passe du compte.
-- Le token n'est jamais stocké en clair : seul son empreinte (SHA-256) est en base, comme un
-- mot de passe. Il est affiché en clair une seule fois, au moment de sa création, côté app.

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table api_keys enable row level security;

create policy "own api keys" on api_keys for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
