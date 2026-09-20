-- Système de paliers (Amateur / Confirmé / Investisseur). Cette migration ne change AUCUN
-- comportement de l'app tant que le code applicatif ne vient pas lire cette table pour limiter
-- quoi que ce soit — elle est strictement additive et sans risque à exécuter seule.
--
-- SÉCURITÉ CRITIQUE : tous les comptes qui existent DÉJÀ au moment de cette migration (le tien,
-- ceux de tes amis) sont placés sur 'investisseur' (le palier le plus complet, aucune limite),
-- automatiquement, sans aucune action de leur part. Seuls les comptes créés APRÈS cette migration
-- démarreront sur 'amateur' (gratuit, limité), via le même trigger qui provisionne déjà les
-- catégories/comptes de départ à l'inscription.

create table if not exists user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'amateur' check (tier in ('amateur', 'confirme', 'investisseur')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table user_plans enable row level security;

-- Lecture seule pour l'utilisateur concerné (jamais d'écriture directe depuis le client — toujours
-- via le code serveur, qui utilise la clé service_role et ignore donc cette policy de toute façon).
create policy "own plan read" on user_plans for select
  using (auth.uid() = user_id);

-- Rétroactif : tous les comptes déjà existants passent sur 'investisseur', une fois, maintenant.
insert into user_plans (user_id, tier)
select id, 'investisseur' from auth.users
on conflict (user_id) do nothing;

-- Étend le trigger d'inscription déjà existant (seed_default_data) pour provisionner aussi une
-- ligne user_plans à chaque nouveau compte — 'amateur' par défaut (valeur par défaut de la colonne
-- tier ci-dessus), donc seuls les FUTURS comptes démarrent limités.
create or replace function seed_default_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name) values
    (new.id, 'Nourriture & Boissons'),
    (new.id, 'Shopping'),
    (new.id, 'Voyage'),
    (new.id, 'Services'),
    (new.id, 'Loisirs'),
    (new.id, 'Santé'),
    (new.id, 'Transport');

  insert into public.accounts (user_id, name) values
    (new.id, 'Compte courant');

  insert into public.user_plans (user_id) values (new.id);

  return new;
end;
$$;
