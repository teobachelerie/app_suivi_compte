-- L'état "visite guidée + questionnaire déjà vus" n'était stocké qu'en localStorage, côté
-- navigateur — fragile sur PWA iOS (Safari peut effacer ce stockage entre deux sessions), d'où le
-- fait que le tuto se relançait à chaque reconnexion. Déplacé côté serveur, qui devient la
-- source de vérité ; le localStorage ne sert plus que d'optimisation pour éviter un flash au
-- premier rendu.
alter table user_plans add column if not exists onboarding_seen boolean not null default false;
