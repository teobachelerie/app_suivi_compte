-- Migration 019 : le choix des deux comptes principaux (les cartes de l'accueil) est enregistré en base.
-- Jusqu'ici il vivait dans le localStorage de la PWA, que Safari peut effacer sans prévenir : l'accueil
-- retombait alors sur deux comptes choisis par défaut.
-- À exécuter à la main dans le SQL Editor de Supabase. Additive et idempotente : sûre à relancer.
--
-- Effets :
--   1. Nouvelle colonne accounts.is_core (faux par défaut : un compte ajouté est un livret).
--   2. Reprise : pour chaque utilisateur qui n'a encore aucun compte principal, « Compte courant » et
--      « Compte pro » le deviennent. Un utilisateur qui a renommé ces comptes est repris par l'app à sa
--      prochaine ouverture (elle enregistre le choix qu'elle affichait jusque-là).
--
-- Raccourcis iOS : /api/meta renvoie désormais is_core dans chaque objet de « accounts ». Champ ajouté,
-- aucun renommé : les Raccourcis existants ne sont pas touchés.

-- === 1. Colonne ===
alter table accounts add column if not exists is_core boolean not null default false;

-- === 2. Reprise des comptes existants ===
update accounts a
set is_core = true
where a.archived = false
  and a.name in ('Compte courant', 'Compte pro')
  and not exists (
    select 1 from accounts b
    where b.user_id = a.user_id and b.archived = false and b.is_core
  );

-- === Contrôle : nombre de comptes principaux par utilisateur (attendu : 2, parfois 0 si renommés) ===
select user_id, count(*) filter (where is_core) as comptes_principaux, count(*) as comptes
from accounts
where archived = false
group by user_id
order by comptes_principaux;
