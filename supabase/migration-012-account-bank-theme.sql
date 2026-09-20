-- Identifiant de banque associé à un compte (ex. "societe-generale"), pour teinter visuellement ce
-- compte avec les couleurs d'accent de cette banque. Valeur libre (pas de contrainte de liste figée
-- côté base — la liste des banques proposées vit côté app, dans lib/constants.js, pour rester
-- facile à faire évoluer sans nouvelle migration).
alter table accounts add column if not exists bank_id text;
