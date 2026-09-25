-- Nettoyage taxonomie v2 (Finelio) — remplace la taxonomie précédente (12 familles avec
-- "Abonnements" + fallback "Famille · Autre") par celle-ci (11 familles, la famille elle-même sert
-- de choix "général", pas de sous-catégorie "Autre" séparée). Idempotent : sûr à relancer.

-- === 0. Réensemencement de la fonction de seeding avec la nouvelle taxonomie ===
create or replace function seed_category_taxonomy(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  taxonomy jsonb := '[{"label": "Alimentation", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg", "subcategories": [{"label": "Courses", "tier": "amateur", "icon": "Shopping cart/Color/shopping_cart_color.svg"}, {"label": "Restaurants", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg"}, {"label": "Fast-food / Livraison", "tier": "amateur", "icon": "Pizza/Color/pizza_color.svg"}, {"label": "Boulangerie", "tier": "confirme", "icon": "Bread/Color/bread_color.svg"}, {"label": "Café", "tier": "confirme", "icon": "Hot beverage/Color/hot_beverage_color.svg"}]}, {"label": "Logement", "tier": "amateur", "icon": "House/Color/house_color.svg", "subcategories": [{"label": "Loyer / Crédit immobilier", "tier": "amateur", "icon": "House with garden/Color/house_with_garden_color.svg"}, {"label": "Charges (eau, élec, gaz)", "tier": "amateur", "icon": "Electric plug/Color/electric_plug_color.svg"}, {"label": "Internet / Téléphone", "tier": "amateur", "icon": "Globe with meridians/Color/globe_with_meridians_color.svg"}, {"label": "Assurance habitation", "tier": "confirme", "icon": "Shield/Color/shield_color.svg"}, {"label": "Entretien / Bricolage", "tier": "confirme", "icon": "Hammer and wrench/Color/hammer_and_wrench_color.svg"}, {"label": "Mobilier / Décoration", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg"}]}, {"label": "Transport", "tier": "amateur", "icon": "Automobile/Color/automobile_color.svg", "subcategories": [{"label": "Essence / Carburant", "tier": "amateur", "icon": "Fuel pump/Color/fuel_pump_color.svg"}, {"label": "Transports en commun", "tier": "amateur", "icon": "Bus/Color/bus_color.svg"}, {"label": "Assurance auto / moto", "tier": "amateur", "icon": "Shield/Color/shield_color.svg"}, {"label": "Entretien véhicule", "tier": "confirme", "icon": "Wrench/Color/wrench_color.svg"}, {"label": "Parking / Péage", "tier": "confirme", "icon": "Automobile/Color/automobile_color.svg"}, {"label": "Vélo / Trottinette", "tier": "confirme", "icon": "Bicycle/Color/bicycle_color.svg"}]}, {"label": "Santé", "tier": "amateur", "icon": "Hospital/Color/hospital_color.svg", "subcategories": [{"label": "Pharmacie", "tier": "amateur", "icon": "Pill/Color/pill_color.svg"}, {"label": "Médecin / Consultations", "tier": "amateur", "icon": "Stethoscope/Color/stethoscope_color.svg"}, {"label": "Mutuelle / Assurance santé", "tier": "confirme", "icon": "Shield/Color/shield_color.svg"}, {"label": "Sport / Salle de sport", "tier": "amateur", "icon": "Person lifting weights/Default/Color/person_lifting_weights_color_default.svg"}, {"label": "Bien-être (spa, méditation)", "tier": "confirme", "icon": "Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg"}]}, {"label": "Shopping", "tier": "amateur", "icon": "Shopping bags/Color/shopping_bags_color.svg", "subcategories": [{"label": "Vêtements", "tier": "amateur", "icon": "T-shirt/Color/t-shirt_color.svg"}, {"label": "Électronique / High-tech", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Beauté / Cosmétique", "tier": "amateur", "icon": "Lipstick/Color/lipstick_color.svg"}, {"label": "Cadeaux", "tier": "amateur", "icon": "Wrapped gift/Color/wrapped_gift_color.svg"}, {"label": "Maison / Équipement", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg"}]}, {"label": "Loisirs", "tier": "amateur", "icon": "Video game/Color/video_game_color.svg", "subcategories": [{"label": "Abonnements streaming", "tier": "amateur", "icon": "Clapper board/Color/clapper_board_color.svg"}, {"label": "Sorties / Bars", "tier": "amateur", "icon": "Cocktail glass/Color/cocktail_glass_color.svg"}, {"label": "Cinéma / Concerts", "tier": "confirme", "icon": "Ticket/Color/ticket_color.svg"}, {"label": "Jeux vidéo", "tier": "confirme", "icon": "Video game/Color/video_game_color.svg"}, {"label": "Livres / Presse", "tier": "confirme", "icon": "Open book/Color/open_book_color.svg"}, {"label": "Hobbies", "tier": "confirme", "icon": "Artist palette/Color/artist_palette_color.svg"}]}, {"label": "Voyages", "tier": "amateur", "icon": "Airplane/Color/airplane_color.svg", "subcategories": [{"label": "Billets (avion, train)", "tier": "amateur", "icon": "Airplane departure/Color/airplane_departure_color.svg"}, {"label": "Hébergement", "tier": "amateur", "icon": "Bed/Color/bed_color.svg"}, {"label": "Location de véhicule", "tier": "confirme", "icon": "Automobile/Color/automobile_color.svg"}, {"label": "Activités sur place", "tier": "confirme", "icon": "Beach with umbrella/Color/beach_with_umbrella_color.svg"}]}, {"label": "Travail / Pro", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg", "subcategories": [{"label": "Matériel professionnel", "tier": "confirme", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Logiciels / Cloud", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg"}, {"label": "Formation / Cours", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg"}, {"label": "Déplacements pro", "tier": "confirme", "icon": "Airplane departure/Color/airplane_departure_color.svg"}, {"label": "Repas pro", "tier": "confirme", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg"}]}, {"label": "Finances / Admin", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg", "subcategories": [{"label": "Impôts", "tier": "amateur", "icon": "Receipt/Color/receipt_color.svg"}, {"label": "Frais bancaires", "tier": "confirme", "icon": "Credit card/Color/credit_card_color.svg"}, {"label": "Assurances (autres)", "tier": "confirme", "icon": "Shield/Color/shield_color.svg"}, {"label": "Épargne", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg"}, {"label": "Investissement", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg"}, {"label": "Remboursement de prêt", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg"}, {"label": "Dons / Charité", "tier": "confirme", "icon": "Heart hands/Default/Color/heart_hands_color_default.svg"}]}, {"label": "Famille", "tier": "amateur", "icon": "People hugging/Color/people_hugging_color.svg", "subcategories": [{"label": "Garde d''enfants", "tier": "confirme", "icon": "Baby/Default/Color/baby_color_default.svg"}, {"label": "Scolarité", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg"}, {"label": "Enfants / Jouets", "tier": "confirme", "icon": "Teddy bear/Color/teddy_bear_color.svg"}, {"label": "Animaux de compagnie", "tier": "confirme", "icon": "Dog/Color/dog_color.svg"}]}, {"label": "Revenus", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg", "subcategories": [{"label": "Salaire", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg"}, {"label": "Freelance / Indépendant", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg"}, {"label": "Remboursements", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg"}, {"label": "Cadeaux reçus", "tier": "confirme", "icon": "Wrapped gift/Color/wrapped_gift_color.svg"}, {"label": "Ventes (seconde main)", "tier": "confirme", "icon": "Shopping bags/Color/shopping_bags_color.svg"}, {"label": "Dividendes / Intérêts", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg"}, {"label": "Aides / Bourses", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg"}]}]'::jsonb;
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

-- Ré-applique la taxonomie pour ce compte (le garde-fou "déjà ensemencé" de la migration 013 ne
-- doit pas bloquer cette v2 : on force le passage pour cet utilisateur précis).
select seed_category_taxonomy('7cc685f6-6e1e-44fb-ac8b-5487157848a1');

-- === 1. Rattache "Épargne" (déjà existante, collision avec la sous-catégorie) sous Finances / Admin ===
update categories set
  parent_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Finances / Admin' and parent_id is null),
  icon = 'Money with wings/Color/money_with_wings_color.svg',
  tier = 'amateur'
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Épargne' and parent_id is null;

-- === 2. Migration des transactions "Client" -> Freelance / Indépendant, "Employeur" -> Salaire ===
update transactions set category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Freelance / Indépendant')
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Client');

update transactions set category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Salaire')
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Employeur');

delete from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name in ('Client', 'Employeur');

-- === 3. Suppression des catégories obsolètes (doublons), avec ré-affectation défensive au cas où
--        des transactions leur seraient encore rattachées ===
update transactions set category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Voyages' and parent_id is null)
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Voyage');

update transactions set category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Alimentation' and parent_id is null)
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Nourriture & Boissons');

delete from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name in ('Voyage', 'Nourriture & Boissons');

-- "Virement automatique" : le type de transaction "Virement" existe déjà, cette catégorie
-- technique est redondante — les virements n'ont plus besoin d'une catégorie du tout.
update transactions set category_id = null
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and category_id = (select id from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Virement automatique');

delete from categories where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Virement automatique';

-- === 4. Couleur d'Épargne (le hachage automatique tombait sur un rouge/saumon, en conflit avec
--        la convention "rouge = dépense" utilisée partout ailleurs) ===
update categories set color = '#38D9A9'
where user_id = '7cc685f6-6e1e-44fb-ac8b-5487157848a1' and name = 'Épargne';

-- === 5. Non traité ici, volontairement : "Abonnement" et "Services" ===
-- Reclassement manuel demandé explicitement (nature trop variable pour une règle fiable) — ces
-- deux catégories et leurs transactions restent intactes, à reclasser transaction par transaction.
