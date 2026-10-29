-- Migration 018 : un seul nom court par catégorie et une icône propre à chacune.
-- Demande de Téo (29 octobre 2026) : les noms doubles (« Parking / Péage ») créent de la friction.
-- À exécuter à la main dans le SQL Editor de Supabase. Additive et idempotente : sûre à relancer.
--
-- Effets :
--   1. Nouveaux comptes : la taxonomie d'ensemencement utilise les nouveaux noms et icônes.
--   2. Comptes existants (tous les utilisateurs) : chaque catégorie de la taxonomie est renommée et
--      reçoit sa nouvelle icône. Les transactions, plafonds, abonnements et règles pointent vers
--      l'identifiant de la catégorie : ils suivent sans rien changer.
--   3. Si un utilisateur a déjà une catégorie qui porte le nouveau nom, on ne renomme pas (unicité
--      user_id + name) : la requête de contrôle en fin de fichier liste ces cas.
--
-- Attention Raccourcis iOS : un Raccourci qui choisit la catégorie dans la liste renvoyée par
-- /api/meta continue de marcher. Un Raccourci qui envoie un nom écrit en dur (ex. « Parking / Péage »)
-- ne le reconnaîtra plus : il faudra y mettre le nouveau nom.

-- === 1. Taxonomie des nouveaux comptes ===
create or replace function seed_category_taxonomy(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  taxonomy jsonb := '[{"label": "Alimentation", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg", "subcategories": [{"label": "Courses", "tier": "amateur", "icon": "Shopping cart/Color/shopping_cart_color.svg"}, {"label": "Restaurants", "tier": "amateur", "icon": "Fork and knife/Color/fork_and_knife_color.svg"}, {"label": "Fast-food", "tier": "amateur", "icon": "Hamburger/Color/hamburger_color.svg"}, {"label": "Boulangerie", "tier": "confirme", "icon": "Croissant/Color/croissant_color.svg"}, {"label": "Café", "tier": "confirme", "icon": "Hot beverage/Color/hot_beverage_color.svg"}]}, {"label": "Logement", "tier": "amateur", "icon": "House/Color/house_color.svg", "subcategories": [{"label": "Loyer", "tier": "amateur", "icon": "House with garden/Color/house_with_garden_color.svg"}, {"label": "Énergie", "tier": "amateur", "icon": "High voltage/Color/high_voltage_color.svg"}, {"label": "Internet", "tier": "amateur", "icon": "Mobile phone/Color/mobile_phone_color.svg"}, {"label": "Assurance habitation", "tier": "confirme", "icon": "Umbrella/Color/umbrella_color.svg"}, {"label": "Bricolage", "tier": "confirme", "icon": "Hammer and wrench/Color/hammer_and_wrench_color.svg"}, {"label": "Mobilier", "tier": "confirme", "icon": "Chair/Color/chair_color.svg"}]}, {"label": "Transport", "tier": "amateur", "icon": "Automobile/Color/automobile_color.svg", "subcategories": [{"label": "Carburant", "tier": "amateur", "icon": "Fuel pump/Color/fuel_pump_color.svg"}, {"label": "Transports en commun", "tier": "amateur", "icon": "Metro/Color/metro_color.svg"}, {"label": "Assurance véhicule", "tier": "amateur", "icon": "Shield/Color/shield_color.svg"}, {"label": "Entretien véhicule", "tier": "confirme", "icon": "Wrench/Color/wrench_color.svg"}, {"label": "Stationnement", "tier": "confirme", "icon": "P button/Color/p_button_color.svg"}, {"label": "Vélo", "tier": "confirme", "icon": "Bicycle/Color/bicycle_color.svg"}]}, {"label": "Santé", "tier": "amateur", "icon": "Hospital/Color/hospital_color.svg", "subcategories": [{"label": "Pharmacie", "tier": "amateur", "icon": "Pill/Color/pill_color.svg"}, {"label": "Médecin", "tier": "amateur", "icon": "Stethoscope/Color/stethoscope_color.svg"}, {"label": "Mutuelle", "tier": "confirme", "icon": "Medical symbol/Color/medical_symbol_color.svg"}, {"label": "Sport", "tier": "amateur", "icon": "Person lifting weights/Default/Color/person_lifting_weights_color_default.svg"}, {"label": "Bien-être", "tier": "confirme", "icon": "Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg"}]}, {"label": "Shopping", "tier": "amateur", "icon": "Shopping bags/Color/shopping_bags_color.svg", "subcategories": [{"label": "Vêtements", "tier": "amateur", "icon": "T-shirt/Color/t-shirt_color.svg"}, {"label": "High-tech", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Beauté", "tier": "amateur", "icon": "Lipstick/Color/lipstick_color.svg"}, {"label": "Cadeaux", "tier": "amateur", "icon": "Wrapped gift/Color/wrapped_gift_color.svg"}, {"label": "Maison", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg"}]}, {"label": "Loisirs", "tier": "amateur", "icon": "Performing arts/Color/performing_arts_color.svg", "subcategories": [{"label": "Streaming", "tier": "amateur", "icon": "Television/Color/television_color.svg"}, {"label": "Sorties", "tier": "amateur", "icon": "Cocktail glass/Color/cocktail_glass_color.svg"}, {"label": "Spectacles", "tier": "confirme", "icon": "Ticket/Color/ticket_color.svg"}, {"label": "Jeux vidéo", "tier": "confirme", "icon": "Video game/Color/video_game_color.svg"}, {"label": "Lecture", "tier": "confirme", "icon": "Open book/Color/open_book_color.svg"}, {"label": "Hobbies", "tier": "confirme", "icon": "Artist palette/Color/artist_palette_color.svg"}]}, {"label": "Voyages", "tier": "amateur", "icon": "Airplane/Color/airplane_color.svg", "subcategories": [{"label": "Billets", "tier": "amateur", "icon": "Airplane departure/Color/airplane_departure_color.svg"}, {"label": "Hébergement", "tier": "amateur", "icon": "Hotel/Color/hotel_color.svg"}, {"label": "Location", "tier": "confirme", "icon": "Key/Color/key_color.svg"}, {"label": "Activités", "tier": "confirme", "icon": "Beach with umbrella/Color/beach_with_umbrella_color.svg"}]}, {"label": "Travail", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg", "subcategories": [{"label": "Matériel", "tier": "confirme", "icon": "Desktop computer/Color/desktop_computer_color.svg"}, {"label": "Logiciels", "tier": "amateur", "icon": "Gear/Color/gear_color.svg"}, {"label": "Formation", "tier": "confirme", "icon": "Books/Color/books_color.svg"}, {"label": "Déplacements", "tier": "confirme", "icon": "Bullet train/Color/bullet_train_color.svg"}, {"label": "Repas pro", "tier": "confirme", "icon": "Handshake/Color/handshake_color.svg"}]}, {"label": "Finances", "tier": "amateur", "icon": "Bank/Color/bank_color.svg", "subcategories": [{"label": "Impôts", "tier": "amateur", "icon": "Receipt/Color/receipt_color.svg"}, {"label": "Frais bancaires", "tier": "confirme", "icon": "Credit card/Color/credit_card_color.svg"}, {"label": "Assurances", "tier": "confirme", "icon": "Clipboard/Color/clipboard_color.svg"}, {"label": "Épargne", "tier": "amateur", "icon": "Coin/Color/coin_color.svg"}, {"label": "Investissement", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg"}, {"label": "Prêts", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg"}, {"label": "Dons", "tier": "confirme", "icon": "Heart hands/Default/Color/heart_hands_color_default.svg"}]}, {"label": "Famille", "tier": "amateur", "icon": "People hugging/Color/people_hugging_color.svg", "subcategories": [{"label": "Garde d''enfants", "tier": "confirme", "icon": "Baby/Default/Color/baby_color_default.svg"}, {"label": "Scolarité", "tier": "confirme", "icon": "Backpack/Color/backpack_color.svg"}, {"label": "Jouets", "tier": "confirme", "icon": "Teddy bear/Color/teddy_bear_color.svg"}, {"label": "Animaux", "tier": "confirme", "icon": "Dog/Color/dog_color.svg"}]}, {"label": "Revenus", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg", "subcategories": [{"label": "Salaire", "tier": "amateur", "icon": "Euro banknote/Color/euro_banknote_color.svg"}, {"label": "Freelance", "tier": "amateur", "icon": "Technologist/Default/Color/technologist_color_default.svg"}, {"label": "Remboursements", "tier": "amateur", "icon": "Counterclockwise arrows button/Color/counterclockwise_arrows_button_color.svg"}, {"label": "Cadeaux reçus", "tier": "confirme", "icon": "Party popper/Color/party_popper_color.svg"}, {"label": "Ventes", "tier": "confirme", "icon": "Label/Color/label_color.svg"}, {"label": "Placements", "tier": "investisseur", "icon": "Gem stone/Color/gem_stone_color.svg"}, {"label": "Aides", "tier": "confirme", "icon": "Classical building/Color/classical_building_color.svg"}]}]'::jsonb;
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

-- === 2. Renommage et nouvelles icônes pour les comptes existants ===
with mapping(old_name, new_name, new_icon) as (
  values
    ('Alimentation', 'Alimentation', 'Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg'),
    ('Logement', 'Logement', 'House/Color/house_color.svg'),
    ('Transport', 'Transport', 'Automobile/Color/automobile_color.svg'),
    ('Santé', 'Santé', 'Hospital/Color/hospital_color.svg'),
    ('Shopping', 'Shopping', 'Shopping bags/Color/shopping_bags_color.svg'),
    ('Loisirs', 'Loisirs', 'Performing arts/Color/performing_arts_color.svg'),
    ('Voyages', 'Voyages', 'Airplane/Color/airplane_color.svg'),
    ('Travail / Pro', 'Travail', 'Briefcase/Color/briefcase_color.svg'),
    ('Finances / Admin', 'Finances', 'Bank/Color/bank_color.svg'),
    ('Famille', 'Famille', 'People hugging/Color/people_hugging_color.svg'),
    ('Revenus', 'Revenus', 'Money with wings/Color/money_with_wings_color.svg'),
    ('Courses', 'Courses', 'Shopping cart/Color/shopping_cart_color.svg'),
    ('Restaurants', 'Restaurants', 'Fork and knife/Color/fork_and_knife_color.svg'),
    ('Fast-food / Livraison', 'Fast-food', 'Hamburger/Color/hamburger_color.svg'),
    ('Boulangerie', 'Boulangerie', 'Croissant/Color/croissant_color.svg'),
    ('Café', 'Café', 'Hot beverage/Color/hot_beverage_color.svg'),
    ('Loyer / Crédit immobilier', 'Loyer', 'House with garden/Color/house_with_garden_color.svg'),
    ('Charges (eau, élec, gaz)', 'Énergie', 'High voltage/Color/high_voltage_color.svg'),
    ('Internet / Téléphone', 'Internet', 'Mobile phone/Color/mobile_phone_color.svg'),
    ('Assurance habitation', 'Assurance habitation', 'Umbrella/Color/umbrella_color.svg'),
    ('Entretien / Bricolage', 'Bricolage', 'Hammer and wrench/Color/hammer_and_wrench_color.svg'),
    ('Mobilier / Décoration', 'Mobilier', 'Chair/Color/chair_color.svg'),
    ('Essence / Carburant', 'Carburant', 'Fuel pump/Color/fuel_pump_color.svg'),
    ('Transports en commun', 'Transports en commun', 'Metro/Color/metro_color.svg'),
    ('Assurance auto / moto', 'Assurance véhicule', 'Shield/Color/shield_color.svg'),
    ('Entretien véhicule', 'Entretien véhicule', 'Wrench/Color/wrench_color.svg'),
    ('Parking / Péage', 'Stationnement', 'P button/Color/p_button_color.svg'),
    ('Vélo / Trottinette', 'Vélo', 'Bicycle/Color/bicycle_color.svg'),
    ('Pharmacie', 'Pharmacie', 'Pill/Color/pill_color.svg'),
    ('Médecin / Consultations', 'Médecin', 'Stethoscope/Color/stethoscope_color.svg'),
    ('Mutuelle / Assurance santé', 'Mutuelle', 'Medical symbol/Color/medical_symbol_color.svg'),
    ('Sport / Salle de sport', 'Sport', 'Person lifting weights/Default/Color/person_lifting_weights_color_default.svg'),
    ('Bien-être (spa, méditation)', 'Bien-être', 'Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg'),
    ('Vêtements', 'Vêtements', 'T-shirt/Color/t-shirt_color.svg'),
    ('Électronique / High-tech', 'High-tech', 'Laptop/Color/laptop_color.svg'),
    ('Beauté / Cosmétique', 'Beauté', 'Lipstick/Color/lipstick_color.svg'),
    ('Cadeaux', 'Cadeaux', 'Wrapped gift/Color/wrapped_gift_color.svg'),
    ('Maison / Équipement', 'Maison', 'Couch and lamp/Color/couch_and_lamp_color.svg'),
    ('Abonnements streaming', 'Streaming', 'Television/Color/television_color.svg'),
    ('Sorties / Bars', 'Sorties', 'Cocktail glass/Color/cocktail_glass_color.svg'),
    ('Cinéma / Concerts', 'Spectacles', 'Ticket/Color/ticket_color.svg'),
    ('Jeux vidéo', 'Jeux vidéo', 'Video game/Color/video_game_color.svg'),
    ('Livres / Presse', 'Lecture', 'Open book/Color/open_book_color.svg'),
    ('Hobbies', 'Hobbies', 'Artist palette/Color/artist_palette_color.svg'),
    ('Billets (avion, train)', 'Billets', 'Airplane departure/Color/airplane_departure_color.svg'),
    ('Hébergement', 'Hébergement', 'Hotel/Color/hotel_color.svg'),
    ('Location de véhicule', 'Location', 'Key/Color/key_color.svg'),
    ('Activités sur place', 'Activités', 'Beach with umbrella/Color/beach_with_umbrella_color.svg'),
    ('Matériel professionnel', 'Matériel', 'Desktop computer/Color/desktop_computer_color.svg'),
    ('Logiciels / Cloud', 'Logiciels', 'Gear/Color/gear_color.svg'),
    ('Formation / Cours', 'Formation', 'Books/Color/books_color.svg'),
    ('Déplacements pro', 'Déplacements', 'Bullet train/Color/bullet_train_color.svg'),
    ('Repas pro', 'Repas pro', 'Handshake/Color/handshake_color.svg'),
    ('Impôts', 'Impôts', 'Receipt/Color/receipt_color.svg'),
    ('Frais bancaires', 'Frais bancaires', 'Credit card/Color/credit_card_color.svg'),
    ('Assurances (autres)', 'Assurances', 'Clipboard/Color/clipboard_color.svg'),
    ('Épargne', 'Épargne', 'Coin/Color/coin_color.svg'),
    ('Investissement', 'Investissement', 'Chart increasing/Color/chart_increasing_color.svg'),
    ('Remboursement de prêt', 'Prêts', 'Money bag/Color/money_bag_color.svg'),
    ('Dons / Charité', 'Dons', 'Heart hands/Default/Color/heart_hands_color_default.svg'),
    ('Garde d''enfants', 'Garde d''enfants', 'Baby/Default/Color/baby_color_default.svg'),
    ('Scolarité', 'Scolarité', 'Backpack/Color/backpack_color.svg'),
    ('Enfants / Jouets', 'Jouets', 'Teddy bear/Color/teddy_bear_color.svg'),
    ('Animaux de compagnie', 'Animaux', 'Dog/Color/dog_color.svg'),
    ('Salaire', 'Salaire', 'Euro banknote/Color/euro_banknote_color.svg'),
    ('Freelance / Indépendant', 'Freelance', 'Technologist/Default/Color/technologist_color_default.svg'),
    ('Remboursements', 'Remboursements', 'Counterclockwise arrows button/Color/counterclockwise_arrows_button_color.svg'),
    ('Cadeaux reçus', 'Cadeaux reçus', 'Party popper/Color/party_popper_color.svg'),
    ('Ventes (seconde main)', 'Ventes', 'Label/Color/label_color.svg'),
    ('Dividendes / Intérêts', 'Placements', 'Gem stone/Color/gem_stone_color.svg'),
    ('Aides / Bourses', 'Aides', 'Classical building/Color/classical_building_color.svg')
)
update categories c
set name = m.new_name, icon = m.new_icon
from mapping m
where lower(c.name) = lower(m.old_name)
  and not exists (
    select 1 from categories other
    where other.user_id = c.user_id and lower(other.name) = lower(m.new_name) and other.id <> c.id
  );

-- Icône seule pour les catégories déjà au bon nom (relance, ou nom inchangé).
with mapping(old_name, new_name, new_icon) as (
  values
    ('Alimentation', 'Alimentation', 'Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg'),
    ('Logement', 'Logement', 'House/Color/house_color.svg'),
    ('Transport', 'Transport', 'Automobile/Color/automobile_color.svg'),
    ('Santé', 'Santé', 'Hospital/Color/hospital_color.svg'),
    ('Shopping', 'Shopping', 'Shopping bags/Color/shopping_bags_color.svg'),
    ('Loisirs', 'Loisirs', 'Performing arts/Color/performing_arts_color.svg'),
    ('Voyages', 'Voyages', 'Airplane/Color/airplane_color.svg'),
    ('Travail / Pro', 'Travail', 'Briefcase/Color/briefcase_color.svg'),
    ('Finances / Admin', 'Finances', 'Bank/Color/bank_color.svg'),
    ('Famille', 'Famille', 'People hugging/Color/people_hugging_color.svg'),
    ('Revenus', 'Revenus', 'Money with wings/Color/money_with_wings_color.svg'),
    ('Courses', 'Courses', 'Shopping cart/Color/shopping_cart_color.svg'),
    ('Restaurants', 'Restaurants', 'Fork and knife/Color/fork_and_knife_color.svg'),
    ('Fast-food / Livraison', 'Fast-food', 'Hamburger/Color/hamburger_color.svg'),
    ('Boulangerie', 'Boulangerie', 'Croissant/Color/croissant_color.svg'),
    ('Café', 'Café', 'Hot beverage/Color/hot_beverage_color.svg'),
    ('Loyer / Crédit immobilier', 'Loyer', 'House with garden/Color/house_with_garden_color.svg'),
    ('Charges (eau, élec, gaz)', 'Énergie', 'High voltage/Color/high_voltage_color.svg'),
    ('Internet / Téléphone', 'Internet', 'Mobile phone/Color/mobile_phone_color.svg'),
    ('Assurance habitation', 'Assurance habitation', 'Umbrella/Color/umbrella_color.svg'),
    ('Entretien / Bricolage', 'Bricolage', 'Hammer and wrench/Color/hammer_and_wrench_color.svg'),
    ('Mobilier / Décoration', 'Mobilier', 'Chair/Color/chair_color.svg'),
    ('Essence / Carburant', 'Carburant', 'Fuel pump/Color/fuel_pump_color.svg'),
    ('Transports en commun', 'Transports en commun', 'Metro/Color/metro_color.svg'),
    ('Assurance auto / moto', 'Assurance véhicule', 'Shield/Color/shield_color.svg'),
    ('Entretien véhicule', 'Entretien véhicule', 'Wrench/Color/wrench_color.svg'),
    ('Parking / Péage', 'Stationnement', 'P button/Color/p_button_color.svg'),
    ('Vélo / Trottinette', 'Vélo', 'Bicycle/Color/bicycle_color.svg'),
    ('Pharmacie', 'Pharmacie', 'Pill/Color/pill_color.svg'),
    ('Médecin / Consultations', 'Médecin', 'Stethoscope/Color/stethoscope_color.svg'),
    ('Mutuelle / Assurance santé', 'Mutuelle', 'Medical symbol/Color/medical_symbol_color.svg'),
    ('Sport / Salle de sport', 'Sport', 'Person lifting weights/Default/Color/person_lifting_weights_color_default.svg'),
    ('Bien-être (spa, méditation)', 'Bien-être', 'Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg'),
    ('Vêtements', 'Vêtements', 'T-shirt/Color/t-shirt_color.svg'),
    ('Électronique / High-tech', 'High-tech', 'Laptop/Color/laptop_color.svg'),
    ('Beauté / Cosmétique', 'Beauté', 'Lipstick/Color/lipstick_color.svg'),
    ('Cadeaux', 'Cadeaux', 'Wrapped gift/Color/wrapped_gift_color.svg'),
    ('Maison / Équipement', 'Maison', 'Couch and lamp/Color/couch_and_lamp_color.svg'),
    ('Abonnements streaming', 'Streaming', 'Television/Color/television_color.svg'),
    ('Sorties / Bars', 'Sorties', 'Cocktail glass/Color/cocktail_glass_color.svg'),
    ('Cinéma / Concerts', 'Spectacles', 'Ticket/Color/ticket_color.svg'),
    ('Jeux vidéo', 'Jeux vidéo', 'Video game/Color/video_game_color.svg'),
    ('Livres / Presse', 'Lecture', 'Open book/Color/open_book_color.svg'),
    ('Hobbies', 'Hobbies', 'Artist palette/Color/artist_palette_color.svg'),
    ('Billets (avion, train)', 'Billets', 'Airplane departure/Color/airplane_departure_color.svg'),
    ('Hébergement', 'Hébergement', 'Hotel/Color/hotel_color.svg'),
    ('Location de véhicule', 'Location', 'Key/Color/key_color.svg'),
    ('Activités sur place', 'Activités', 'Beach with umbrella/Color/beach_with_umbrella_color.svg'),
    ('Matériel professionnel', 'Matériel', 'Desktop computer/Color/desktop_computer_color.svg'),
    ('Logiciels / Cloud', 'Logiciels', 'Gear/Color/gear_color.svg'),
    ('Formation / Cours', 'Formation', 'Books/Color/books_color.svg'),
    ('Déplacements pro', 'Déplacements', 'Bullet train/Color/bullet_train_color.svg'),
    ('Repas pro', 'Repas pro', 'Handshake/Color/handshake_color.svg'),
    ('Impôts', 'Impôts', 'Receipt/Color/receipt_color.svg'),
    ('Frais bancaires', 'Frais bancaires', 'Credit card/Color/credit_card_color.svg'),
    ('Assurances (autres)', 'Assurances', 'Clipboard/Color/clipboard_color.svg'),
    ('Épargne', 'Épargne', 'Coin/Color/coin_color.svg'),
    ('Investissement', 'Investissement', 'Chart increasing/Color/chart_increasing_color.svg'),
    ('Remboursement de prêt', 'Prêts', 'Money bag/Color/money_bag_color.svg'),
    ('Dons / Charité', 'Dons', 'Heart hands/Default/Color/heart_hands_color_default.svg'),
    ('Garde d''enfants', 'Garde d''enfants', 'Baby/Default/Color/baby_color_default.svg'),
    ('Scolarité', 'Scolarité', 'Backpack/Color/backpack_color.svg'),
    ('Enfants / Jouets', 'Jouets', 'Teddy bear/Color/teddy_bear_color.svg'),
    ('Animaux de compagnie', 'Animaux', 'Dog/Color/dog_color.svg'),
    ('Salaire', 'Salaire', 'Euro banknote/Color/euro_banknote_color.svg'),
    ('Freelance / Indépendant', 'Freelance', 'Technologist/Default/Color/technologist_color_default.svg'),
    ('Remboursements', 'Remboursements', 'Counterclockwise arrows button/Color/counterclockwise_arrows_button_color.svg'),
    ('Cadeaux reçus', 'Cadeaux reçus', 'Party popper/Color/party_popper_color.svg'),
    ('Ventes (seconde main)', 'Ventes', 'Label/Color/label_color.svg'),
    ('Dividendes / Intérêts', 'Placements', 'Gem stone/Color/gem_stone_color.svg'),
    ('Aides / Bourses', 'Aides', 'Classical building/Color/classical_building_color.svg')
)
update categories c
set icon = m.new_icon
from mapping m
where lower(c.name) = lower(m.new_name) and c.icon is distinct from m.new_icon;

-- === 3. Contrôle : catégories restées sous un ancien nom (conflit avec une catégorie existante) ===
with mapping(old_name, new_name, new_icon) as (
  values
    ('Alimentation', 'Alimentation', 'Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg'),
    ('Logement', 'Logement', 'House/Color/house_color.svg'),
    ('Transport', 'Transport', 'Automobile/Color/automobile_color.svg'),
    ('Santé', 'Santé', 'Hospital/Color/hospital_color.svg'),
    ('Shopping', 'Shopping', 'Shopping bags/Color/shopping_bags_color.svg'),
    ('Loisirs', 'Loisirs', 'Performing arts/Color/performing_arts_color.svg'),
    ('Voyages', 'Voyages', 'Airplane/Color/airplane_color.svg'),
    ('Travail / Pro', 'Travail', 'Briefcase/Color/briefcase_color.svg'),
    ('Finances / Admin', 'Finances', 'Bank/Color/bank_color.svg'),
    ('Famille', 'Famille', 'People hugging/Color/people_hugging_color.svg'),
    ('Revenus', 'Revenus', 'Money with wings/Color/money_with_wings_color.svg'),
    ('Courses', 'Courses', 'Shopping cart/Color/shopping_cart_color.svg'),
    ('Restaurants', 'Restaurants', 'Fork and knife/Color/fork_and_knife_color.svg'),
    ('Fast-food / Livraison', 'Fast-food', 'Hamburger/Color/hamburger_color.svg'),
    ('Boulangerie', 'Boulangerie', 'Croissant/Color/croissant_color.svg'),
    ('Café', 'Café', 'Hot beverage/Color/hot_beverage_color.svg'),
    ('Loyer / Crédit immobilier', 'Loyer', 'House with garden/Color/house_with_garden_color.svg'),
    ('Charges (eau, élec, gaz)', 'Énergie', 'High voltage/Color/high_voltage_color.svg'),
    ('Internet / Téléphone', 'Internet', 'Mobile phone/Color/mobile_phone_color.svg'),
    ('Assurance habitation', 'Assurance habitation', 'Umbrella/Color/umbrella_color.svg'),
    ('Entretien / Bricolage', 'Bricolage', 'Hammer and wrench/Color/hammer_and_wrench_color.svg'),
    ('Mobilier / Décoration', 'Mobilier', 'Chair/Color/chair_color.svg'),
    ('Essence / Carburant', 'Carburant', 'Fuel pump/Color/fuel_pump_color.svg'),
    ('Transports en commun', 'Transports en commun', 'Metro/Color/metro_color.svg'),
    ('Assurance auto / moto', 'Assurance véhicule', 'Shield/Color/shield_color.svg'),
    ('Entretien véhicule', 'Entretien véhicule', 'Wrench/Color/wrench_color.svg'),
    ('Parking / Péage', 'Stationnement', 'P button/Color/p_button_color.svg'),
    ('Vélo / Trottinette', 'Vélo', 'Bicycle/Color/bicycle_color.svg'),
    ('Pharmacie', 'Pharmacie', 'Pill/Color/pill_color.svg'),
    ('Médecin / Consultations', 'Médecin', 'Stethoscope/Color/stethoscope_color.svg'),
    ('Mutuelle / Assurance santé', 'Mutuelle', 'Medical symbol/Color/medical_symbol_color.svg'),
    ('Sport / Salle de sport', 'Sport', 'Person lifting weights/Default/Color/person_lifting_weights_color_default.svg'),
    ('Bien-être (spa, méditation)', 'Bien-être', 'Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg'),
    ('Vêtements', 'Vêtements', 'T-shirt/Color/t-shirt_color.svg'),
    ('Électronique / High-tech', 'High-tech', 'Laptop/Color/laptop_color.svg'),
    ('Beauté / Cosmétique', 'Beauté', 'Lipstick/Color/lipstick_color.svg'),
    ('Cadeaux', 'Cadeaux', 'Wrapped gift/Color/wrapped_gift_color.svg'),
    ('Maison / Équipement', 'Maison', 'Couch and lamp/Color/couch_and_lamp_color.svg'),
    ('Abonnements streaming', 'Streaming', 'Television/Color/television_color.svg'),
    ('Sorties / Bars', 'Sorties', 'Cocktail glass/Color/cocktail_glass_color.svg'),
    ('Cinéma / Concerts', 'Spectacles', 'Ticket/Color/ticket_color.svg'),
    ('Jeux vidéo', 'Jeux vidéo', 'Video game/Color/video_game_color.svg'),
    ('Livres / Presse', 'Lecture', 'Open book/Color/open_book_color.svg'),
    ('Hobbies', 'Hobbies', 'Artist palette/Color/artist_palette_color.svg'),
    ('Billets (avion, train)', 'Billets', 'Airplane departure/Color/airplane_departure_color.svg'),
    ('Hébergement', 'Hébergement', 'Hotel/Color/hotel_color.svg'),
    ('Location de véhicule', 'Location', 'Key/Color/key_color.svg'),
    ('Activités sur place', 'Activités', 'Beach with umbrella/Color/beach_with_umbrella_color.svg'),
    ('Matériel professionnel', 'Matériel', 'Desktop computer/Color/desktop_computer_color.svg'),
    ('Logiciels / Cloud', 'Logiciels', 'Gear/Color/gear_color.svg'),
    ('Formation / Cours', 'Formation', 'Books/Color/books_color.svg'),
    ('Déplacements pro', 'Déplacements', 'Bullet train/Color/bullet_train_color.svg'),
    ('Repas pro', 'Repas pro', 'Handshake/Color/handshake_color.svg'),
    ('Impôts', 'Impôts', 'Receipt/Color/receipt_color.svg'),
    ('Frais bancaires', 'Frais bancaires', 'Credit card/Color/credit_card_color.svg'),
    ('Assurances (autres)', 'Assurances', 'Clipboard/Color/clipboard_color.svg'),
    ('Épargne', 'Épargne', 'Coin/Color/coin_color.svg'),
    ('Investissement', 'Investissement', 'Chart increasing/Color/chart_increasing_color.svg'),
    ('Remboursement de prêt', 'Prêts', 'Money bag/Color/money_bag_color.svg'),
    ('Dons / Charité', 'Dons', 'Heart hands/Default/Color/heart_hands_color_default.svg'),
    ('Garde d''enfants', 'Garde d''enfants', 'Baby/Default/Color/baby_color_default.svg'),
    ('Scolarité', 'Scolarité', 'Backpack/Color/backpack_color.svg'),
    ('Enfants / Jouets', 'Jouets', 'Teddy bear/Color/teddy_bear_color.svg'),
    ('Animaux de compagnie', 'Animaux', 'Dog/Color/dog_color.svg'),
    ('Salaire', 'Salaire', 'Euro banknote/Color/euro_banknote_color.svg'),
    ('Freelance / Indépendant', 'Freelance', 'Technologist/Default/Color/technologist_color_default.svg'),
    ('Remboursements', 'Remboursements', 'Counterclockwise arrows button/Color/counterclockwise_arrows_button_color.svg'),
    ('Cadeaux reçus', 'Cadeaux reçus', 'Party popper/Color/party_popper_color.svg'),
    ('Ventes (seconde main)', 'Ventes', 'Label/Color/label_color.svg'),
    ('Dividendes / Intérêts', 'Placements', 'Gem stone/Color/gem_stone_color.svg'),
    ('Aides / Bourses', 'Aides', 'Classical building/Color/classical_building_color.svg')
)
select c.user_id, c.name as ancien_nom, m.new_name as nom_voulu
from categories c join mapping m on lower(c.name) = lower(m.old_name)
where lower(m.old_name) <> lower(m.new_name);
