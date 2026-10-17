-- ============================================================================
-- BASE DE DÉVELOPPEMENT UNIQUEMENT (second projet Supabase, vide).
-- NE JAMAIS EXÉCUTER SUR LA PRODUCTION : ce script est fait pour une base vierge.
--
-- Il assemble, dans l'ordre, schema.sql puis les migrations 002 à 017, en ne gardant que ce qui
-- convient à une base sans données : de la 002, l'étape 1 et l'étape 3 (l'étape 2, qui rattache
-- des données existantes à un utilisateur, est omise) ; de la 016, la section 0 seule (le reste
-- corrige les données d'un utilisateur précis avec son UUID en dur).
-- Chaque fichier d'origine reste la référence : en cas d'écart, ils font foi.
-- Idempotent dans l'ensemble, mais seule une base vierge est supportée.
--
-- Retour arrière : supprimer le projet Supabase de développement (aucune donnée à conserver).
-- ============================================================================

-- ===== schema.sql =====
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

-- ===== migration-002 (étapes 1 et 3) =====
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

-- ÉTAPE 3 — une fois l'étape 2 exécutée avec succès
-- ============================================================
-- Referme la porte : impose qu'une ligne ait toujours un propriétaire, et que le nom d'une
-- catégorie/d'un compte ne soit unique que pour un même utilisateur (deux utilisateurs peuvent
-- avoir chacun une catégorie "Shopping").

alter table categories alter column user_id set not null;
alter table accounts alter column user_id set not null;
alter table transactions alter column user_id set not null;

-- (les contraintes unique (user_id, name) existent déjà : schema.sql les crée à la définition des tables)

-- ===== migration-003-api-keys =====
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

-- ===== migration-004-onboarding-seed =====
-- Provisionne automatiquement chaque nouveau compte utilisateur avec un compte "Compte courant"
-- et les catégories de départ, dès l'inscription (déclenché par Supabase Auth lui-même, pas par
-- le code de l'app — fonctionne même si la personne ferme l'app juste après s'être inscrite).
--
-- security definer : nécessaire pour que ce trigger, qui s'exécute hors du contexte d'une
-- requête authentifiée (donc sans auth.uid() disponible), puisse quand même insérer dans des
-- tables protégées par RLS. Pattern standard documenté par Supabase pour ce cas d'usage exact.

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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function seed_default_data();

-- ===== migration-005-subscriptions =====
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

-- ===== migration-006-power-features =====
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

-- ===== migration-007-emoji =====
-- Emoji personnalisé par transaction (ex. 🍕), choisi via le clavier emoji natif d'iPhone.
-- Si absent (null), l'app retombe sur l'icône de la catégorie comme avant.
alter table transactions add column if not exists emoji text;

-- ===== migration-008-category-colors =====
-- Couleur personnalisée par catégorie (hex, ex. "#FF6B6B"), utilisée dans le camembert de
-- l'onglet Budgets. Si absente (null), l'app attribue une couleur par défaut de façon stable
-- (toujours la même pour une catégorie donnée) à partir d'une palette prédéfinie.
alter table categories add column if not exists color text;

-- ===== migration-009-virement-interne =====
-- Virement entre deux de tes comptes (ex. Compte courant → Livret A). Neutre pour le
-- patrimoine total : l'argent ne quitte jamais "chez toi", il change juste de compte. Exclu des
-- totaux Dépenses/Revenus (ces calculs filtrent déjà explicitement sur les types 'Dépense'/'Gain').
--
-- `account_id` (déjà existant) sert de compte SOURCE pour un virement ; `to_account_id` est le
-- compte CIBLE, nouveau, utilisé uniquement pour ce type.
alter table transactions add column if not exists to_account_id uuid references accounts(id) on delete set null;

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check check (type in ('Dépense', 'Gain', 'Virement'));

-- ===== migration-010-billing-tiers =====
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

-- ===== migration-011-cancel-at-period-end =====
-- Distingue "va se renouveler" de "va s'arrêter mais reste actif jusqu'à la fin de la période déjà
-- payée" — Stripe garde stripe_subscription_status = 'active' pendant toute cette période même
-- après une annulation, donc ce statut seul ne suffit pas à savoir si le renouvellement est prévu.
alter table user_plans add column if not exists cancel_at_period_end boolean not null default false;

-- ===== migration-012-account-bank-theme =====
-- Identifiant de banque associé à un compte (ex. "societe-generale"), pour teinter visuellement ce
-- compte avec les couleurs d'accent de cette banque. Valeur libre (pas de contrainte de liste figée
-- côté base — la liste des banques proposées vit côté app, dans lib/constants.js, pour rester
-- facile à faire évoluer sans nouvelle migration).
alter table accounts add column if not exists bank_id text;

-- ===== migration-013-category-taxonomy =====
-- Nouvelle taxonomie de catégories : hiérarchique (famille -> sous-catégories), avec palier et
-- icône par nœud. Remplace le système "liste plate librement éditable" pour les NOUVELLES
-- catégories créées à partir de maintenant, sans toucher aux catégories déjà existantes de
-- personne (tier = NULL sur les anciennes lignes = catégorie "historique", toujours visible et
-- utilisable par son propriétaire, jamais restreinte par palier).
--
-- Le palier de chaque nœud a été retranscrit depuis le document source, dont l'étiquetage était
-- ambigu (voir discussion) : "confirme" dans le document = base gratuite ("amateur" ici),
-- "investisseur" dans le document = extension Confirmé ici, sauf Investissement et
-- Dividendes/Intérêts qui restent exclusivement Investisseur.
--
-- Chaque famille a un fallback "{Famille} · Autre" (nom unique par famille, pas juste "Autre").
--
-- Collision avec une catégorie déjà existante (ex. l'utilisateur a déjà "Transport", et la
-- taxonomie a aussi une famille "Transport") : on ne crée PAS de doublon — la catégorie déjà
-- existante est réutilisée comme parent pour les nouvelles sous-catégories de cette famille,
-- et une sous-catégorie déjà existante sous ce nom est simplement laissée telle quelle, sans la
-- retoucher (pour ne jamais changer silencieusement une catégorie déjà utilisée par de vraies
-- transactions).
--
-- Sûr à relancer : un utilisateur qui a déjà au moins une catégorie avec un tier renseigné est
-- considéré comme déjà ensemencé et n'est pas retraité.

alter table categories add column if not exists parent_id uuid references categories(id) on delete cascade;
alter table categories add column if not exists tier text check (tier in ('amateur', 'confirme', 'investisseur'));
alter table categories add column if not exists icon text;
alter table categories add column if not exists is_fallback boolean not null default false;

-- (ancienne définition de seed_category_taxonomy et ensemencement des utilisateurs existants omis : redéfinition par la section 0 de la 016, aucun utilisateur existant)


-- Les futurs comptes reçoivent uniquement la nouvelle taxonomie (plus les anciennes catégories de
-- départ, désormais redondantes avec elle) — mise à jour du trigger d'inscription déjà existant.
create or replace function seed_default_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $trig$
begin
  insert into public.accounts (user_id, name) values
    (new.id, 'Compte courant');

  insert into public.user_plans (user_id) values (new.id);

  perform seed_category_taxonomy(new.id);

  return new;
end;
$trig$;

-- ===== migration-014-transaction-notes =====
-- Champ de remarques libres sur une transaction, comme demandé (écran de détail façon app de
-- référence). Facultatif, purement additif.
alter table transactions add column if not exists notes text;

-- ===== migration-015-onboarding-server-side =====
-- L'état "visite guidée + questionnaire déjà vus" n'était stocké qu'en localStorage, côté
-- navigateur — fragile sur PWA iOS (Safari peut effacer ce stockage entre deux sessions), d'où le
-- fait que le tuto se relançait à chaque reconnexion. Déplacé côté serveur, qui devient la
-- source de vérité ; le localStorage ne sert plus que d'optimisation pour éviter un flash au
-- premier rendu.
alter table user_plans add column if not exists onboarding_seen boolean not null default false;

-- ===== migration-016 (section 0 seule) =====
-- === 0. Réensemencement de la fonction de seeding avec la nouvelle taxonomie ===
create or replace function seed_category_taxonomy(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  taxonomy jsonb := '[{"label": "Alimentation", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg", "subcategories": [{"label": "Courses", "tier": "amateur", "icon": "Shopping cart/Color/shopping_cart_color.svg"}, {"label": "Restaurants", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg"}, {"label": "Fast-food / Livraison", "tier": "amateur", "icon": "Pizza/Color/pizza_color.svg"}, {"label": "Boulangerie", "tier": "confirme", "icon": "Bread/Color/bread_color.svg"}, {"label": "Café", "tier": "confirme", "icon": "Hot beverage/Color/hot_beverage_color.svg"}]}, {"label": "Logement", "tier": "amateur", "icon": "House/Color/house_color.svg", "subcategories": [{"label": "Loyer / Crédit immobilier", "tier": "amateur", "icon": "House with garden/Color/house_with_garden_color.svg"}, {"label": "Charges (eau, élec, gaz)", "tier": "amateur", "icon": "Electric plug/Color/electric_plug_color.svg"}, {"label": "Internet / Téléphone", "tier": "amateur", "icon": "Globe with meridians/Color/globe_with_meridians_color.svg"}, {"label": "Assurance habitation", "tier": "confirme", "icon": "Shield/Color/shield_color.svg"}, {"label": "Entretien / Bricolage", "tier": "confirme", "icon": "Hammer and wrench/Color/hammer_and_wrench_color.svg"}, {"label": "Mobilier / Décoration", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg"}]}, {"label": "Transport", "tier": "amateur", "icon": "Automobile/Color/automobile_color.svg", "subcategories": [{"label": "Essence / Carburant", "tier": "amateur", "icon": "Fuel pump/Color/fuel_pump_color.svg"}, {"label": "Transports en commun", "tier": "amateur", "icon": "Bus/Color/bus_color.svg"}, {"label": "Assurance auto / moto", "tier": "amateur", "icon": "Shield/Color/shield_color.svg"}, {"label": "Entretien véhicule", "tier": "confirme", "icon": "Wrench/Color/wrench_color.svg"}, {"label": "Parking / Péage", "tier": "confirme", "icon": "Automobile/Color/automobile_color.svg"}, {"label": "Vélo / Trottinette", "tier": "confirme", "icon": "Bicycle/Color/bicycle_color.svg"}]}, {"label": "Santé", "tier": "amateur", "icon": "Hospital/Color/hospital_color.svg", "subcategories": [{"label": "Pharmacie", "tier": "amateur", "icon": "Pill/Color/pill_color.svg"}, {"label": "Médecin / Consultations", "tier": "amateur", "icon": "Stethoscope/Color/stethoscope_color.svg"}, {"label": "Mutuelle / Assurance santé", "tier": "confirme", "icon": "Shield/Color/shield_color.svg"}, {"label": "Sport / Salle de sport", "tier": "amateur", "icon": "Person lifting weights/Default/Color/person_lifting_weights_color_default.svg"}, {"label": "Bien-être (spa, méditation)", "tier": "confirme", "icon": "Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg"}]}, {"label": "Shopping", "tier": "amateur", "icon": "Shopping bags/Color/shopping_bags_color.svg", "subcategories": [{"label": "Vêtements", "tier": "amateur", "icon": "T-shirt/Color/t-shirt_color.svg"}, {"label": "Électronique / High-tech", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Beauté / Cosmétique", "tier": "amateur", "icon": "Lipstick/Color/lipstick_color.svg"}, {"label": "Cadeaux", "tier": "amateur", "icon": "Wrapped gift/Color/wrapped_gift_color.svg"}, {"label": "Maison / Équipement", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg"}]}, {"label": "Loisirs", "tier": "amateur", "icon": "Video game/Color/video_game_color.svg", "subcategories": [{"label": "Abonnements streaming", "tier": "amateur", "icon": "Clapper board/Color/clapper_board_color.svg"}, {"label": "Sorties / Bars", "tier": "amateur", "icon": "Cocktail glass/Color/cocktail_glass_color.svg"}, {"label": "Cinéma / Concerts", "tier": "confirme", "icon": "Ticket/Color/ticket_color.svg"}, {"label": "Jeux vidéo", "tier": "confirme", "icon": "Video game/Color/video_game_color.svg"}, {"label": "Livres / Presse", "tier": "confirme", "icon": "Open book/Color/open_book_color.svg"}, {"label": "Hobbies", "tier": "confirme", "icon": "Artist palette/Color/artist_palette_color.svg"}]}, {"label": "Voyages", "tier": "amateur", "icon": "Airplane/Color/airplane_color.svg", "subcategories": [{"label": "Billets (avion, train)", "tier": "amateur", "icon": "Airplane departure/Color/airplane_departure_color.svg"}, {"label": "Hébergement", "tier": "amateur", "icon": "Bed/Color/bed_color.svg"}, {"label": "Location de véhicule", "tier": "confirme", "icon": "Automobile/Color/automobile_color.svg"}, {"label": "Activités sur place", "tier": "confirme", "icon": "Beach with umbrella/Color/beach_with_umbrella_color.svg"}]}, {"label": "Travail / Pro", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg", "subcategories": [{"label": "Matériel professionnel", "tier": "confirme", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Logiciels / Cloud", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Formation / Cours", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg"}, {"label": "Déplacements pro", "tier": "confirme", "icon": "Airplane departure/Color/airplane_departure_color.svg"}, {"label": "Repas pro", "tier": "confirme", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg"}]}, {"label": "Finances / Admin", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg", "subcategories": [{"label": "Impôts", "tier": "amateur", "icon": "Receipt/Color/receipt_color.svg"}, {"label": "Frais bancaires", "tier": "confirme", "icon": "Credit card/Color/credit_card_color.svg"}, {"label": "Assurances (autres)", "tier": "confirme", "icon": "Shield/Color/shield_color.svg"}, {"label": "Épargne", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg"}, {"label": "Investissement", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg"}, {"label": "Remboursement de prêt", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg"}, {"label": "Dons / Charité", "tier": "confirme", "icon": "Heart hands/Default/Color/heart_hands_color_default.svg"}]}, {"label": "Famille", "tier": "amateur", "icon": "People hugging/Color/people_hugging_color.svg", "subcategories": [{"label": "Garde d''enfants", "tier": "confirme", "icon": "Baby/Default/Color/baby_color_default.svg"}, {"label": "Scolarité", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg"}, {"label": "Enfants / Jouets", "tier": "confirme", "icon": "Teddy bear/Color/teddy_bear_color.svg"}, {"label": "Animaux de compagnie", "tier": "confirme", "icon": "Dog/Color/dog_color.svg"}]}, {"label": "Revenus", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg", "subcategories": [{"label": "Salaire", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg"}, {"label": "Freelance / Indépendant", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg"}, {"label": "Remboursements", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg"}, {"label": "Cadeaux reçus", "tier": "confirme", "icon": "Wrapped gift/Color/wrapped_gift_color.svg"}, {"label": "Ventes (seconde main)", "tier": "confirme", "icon": "Shopping bags/Color/shopping_bags_color.svg"}, {"label": "Dividendes / Intérêts", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg"}, {"label": "Aides / Bourses", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg"}]}]'::jsonb;
  cat jsonb;
  sub jsonb;
  new_parent_id uuid;
  existing_id uuid;
begin
  for cat in select * from jsonb_array_elements(taxonomy) loop
    select id into existing_id from categories where user_id = target_user and lower(name) = lower(cat->>'label') limit 1;
    if existing_id is not null then
      new_parent_id := existing_id;
    else
      insert into categories (user_id, name, tier, icon, is_fallback)
      values (target_user, cat->>'label', cat->>'tier', cat->>'icon', false)
      returning id into new_parent_id;
    end if;

    for sub in select * from jsonb_array_elements(cat->'subcategories') loop
      select id into existing_id from categories where user_id = target_user and lower(name) = lower(sub->>'label') limit 1;
      if existing_id is null then
        insert into categories (user_id, name, parent_id, tier, icon, is_fallback)
        values (target_user, sub->>'label', new_parent_id, sub->>'tier', sub->>'icon', false);
      end if;
    end loop;
  end loop;
end;
$func$;

-- ===== migration-017 =====
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
