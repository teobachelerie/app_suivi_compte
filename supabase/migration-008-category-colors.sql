-- Couleur personnalisée par catégorie (hex, ex. "#FF6B6B"), utilisée dans le camembert de
-- l'onglet Budgets. Si absente (null), l'app attribue une couleur par défaut de façon stable
-- (toujours la même pour une catégorie donnée) à partir d'une palette prédéfinie.
alter table categories add column if not exists color text;
