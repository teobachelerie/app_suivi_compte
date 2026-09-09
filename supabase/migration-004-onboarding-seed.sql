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
