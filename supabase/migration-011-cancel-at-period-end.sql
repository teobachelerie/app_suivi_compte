-- Distingue "va se renouveler" de "va s'arrêter mais reste actif jusqu'à la fin de la période déjà
-- payée" — Stripe garde stripe_subscription_status = 'active' pendant toute cette période même
-- après une annulation, donc ce statut seul ne suffit pas à savoir si le renouvellement est prévu.
alter table user_plans add column if not exists cancel_at_period_end boolean not null default false;
