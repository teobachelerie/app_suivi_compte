-- Emoji personnalisé par transaction (ex. 🍕), choisi via le clavier emoji natif d'iPhone.
-- Si absent (null), l'app retombe sur l'icône de la catégorie comme avant.
alter table transactions add column if not exists emoji text;
