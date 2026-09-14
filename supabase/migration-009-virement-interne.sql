-- Virement entre deux de tes comptes (ex. Compte courant → Livret A). Neutre pour le
-- patrimoine total : l'argent ne quitte jamais "chez toi", il change juste de compte. Exclu des
-- totaux Dépenses/Revenus (ces calculs filtrent déjà explicitement sur les types 'Dépense'/'Gain').
--
-- `account_id` (déjà existant) sert de compte SOURCE pour un virement ; `to_account_id` est le
-- compte CIBLE, nouveau, utilisé uniquement pour ce type.
alter table transactions add column if not exists to_account_id uuid references accounts(id) on delete set null;

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check check (type in ('Dépense', 'Gain', 'Virement'));
