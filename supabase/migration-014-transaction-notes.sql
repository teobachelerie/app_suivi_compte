-- Champ de remarques libres sur une transaction, comme demandé (écran de détail façon app de
-- référence). Facultatif, purement additif.
alter table transactions add column if not exists notes text;
