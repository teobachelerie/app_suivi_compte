-- Nouvelle taxonomie de catégories : hiérarchique (famille -> sous-catégories), avec palier et
-- icône par nœud. Remplace le système "liste plate librement éditable" pour les NOUVELLES
-- catégories créées à partir de maintenant, sans toucher aux catégories déjà existantes de
-- personne (tier = NULL sur les anciennes lignes = catégorie "historique", toujours visible et
-- utilisable par son propriétaire, jamais restreinte par palier).
--
-- Le palier de chaque nœud a été retranscrit depuis le document source, dont l'étiquetage était
-- ambigu (voir discussion) : "confirme" dans le document = base gratuite ("amateur" ici),
-- "investisseur" dans le document = extension Confirmé ici, sauf Investissement et
-- Dividendes/Intérêts qui restent exclusivement Investisseur.

alter table categories add column if not exists parent_id uuid references categories(id) on delete cascade;
alter table categories add column if not exists tier text check (tier in ('amateur', 'confirme', 'investisseur'));
alter table categories add column if not exists icon text;
alter table categories add column if not exists is_fallback boolean not null default false;

-- Ensemence la taxonomie fixe pour UN utilisateur donné. Purement additif : n'insère que les
-- nouvelles lignes, ne touche jamais aux catégories déjà existantes de cet utilisateur.
create or replace function seed_category_taxonomy(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  taxonomy jsonb := '[{"label": "Abonnements", "tier": "amateur", "icon": "Credit card/Color/credit_card_color.svg", "subcategories": [{"label": "Streaming", "tier": "amateur", "icon": "Clapper board/Color/clapper_board_color.svg", "is_fallback": false}, {"label": "Logiciels / Cloud", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg", "is_fallback": false}, {"label": "Salle de sport / Bien-être", "tier": "amateur", "icon": "Person lifting weights/Default/Color/person_lifting_weights_color_default.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Alimentation", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg", "subcategories": [{"label": "Courses", "tier": "amateur", "icon": "Shopping cart/Color/shopping_cart_color.svg", "is_fallback": false}, {"label": "Restaurants", "tier": "amateur", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg", "is_fallback": false}, {"label": "Fast-food / Livraison", "tier": "amateur", "icon": "Pizza/Color/pizza_color.svg", "is_fallback": false}, {"label": "Boulangerie", "tier": "confirme", "icon": "Bread/Color/bread_color.svg", "is_fallback": false}, {"label": "Café", "tier": "confirme", "icon": "Hot beverage/Color/hot_beverage_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Logement", "tier": "amateur", "icon": "House/Color/house_color.svg", "subcategories": [{"label": "Loyer / Crédit immobilier", "tier": "amateur", "icon": "House with garden/Color/house_with_garden_color.svg", "is_fallback": false}, {"label": "Charges (eau, élec, gaz)", "tier": "amateur", "icon": "Electric plug/Color/electric_plug_color.svg", "is_fallback": false}, {"label": "Internet / Téléphone", "tier": "amateur", "icon": "Globe with meridians/Color/globe_with_meridians_color.svg", "is_fallback": false}, {"label": "Assurance habitation", "tier": "confirme", "icon": "Shield/Color/shield_color.svg", "is_fallback": false}, {"label": "Entretien / Bricolage", "tier": "confirme", "icon": "Hammer and wrench/Color/hammer_and_wrench_color.svg", "is_fallback": false}, {"label": "Mobilier / Décoration", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Transport", "tier": "amateur", "icon": "Automobile/Color/automobile_color.svg", "subcategories": [{"label": "Essence / Carburant", "tier": "amateur", "icon": "Fuel pump/Color/fuel_pump_color.svg", "is_fallback": false}, {"label": "Transports en commun", "tier": "amateur", "icon": "Bus/Color/bus_color.svg", "is_fallback": false}, {"label": "Assurance auto / moto", "tier": "amateur", "icon": "Shield/Color/shield_color.svg", "is_fallback": false}, {"label": "Entretien véhicule", "tier": "confirme", "icon": "Wrench/Color/wrench_color.svg", "is_fallback": false}, {"label": "Parking / Péage", "tier": "confirme", "icon": "Automobile/Color/automobile_color.svg", "is_fallback": false}, {"label": "Vélo / Trottinette", "tier": "confirme", "icon": "Bicycle/Color/bicycle_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Santé", "tier": "amateur", "icon": "Hospital/Color/hospital_color.svg", "subcategories": [{"label": "Pharmacie", "tier": "amateur", "icon": "Pill/Color/pill_color.svg", "is_fallback": false}, {"label": "Médecin / Consultations", "tier": "amateur", "icon": "Stethoscope/Color/stethoscope_color.svg", "is_fallback": false}, {"label": "Mutuelle / Assurance santé", "tier": "confirme", "icon": "Shield/Color/shield_color.svg", "is_fallback": false}, {"label": "Sport / Salle de sport", "tier": "amateur", "icon": "Person lifting weights/Default/Color/person_lifting_weights_color_default.svg", "is_fallback": false}, {"label": "Bien-être (spa, méditation)", "tier": "confirme", "icon": "Person in lotus position/Default/Color/person_in_lotus_position_color_default.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Shopping", "tier": "amateur", "icon": "Shopping bags/Color/shopping_bags_color.svg", "subcategories": [{"label": "Vêtements", "tier": "amateur", "icon": "T-shirt/Color/t-shirt_color.svg", "is_fallback": false}, {"label": "Électronique / High-tech", "tier": "amateur", "icon": "Laptop/Color/laptop_color.svg", "is_fallback": false}, {"label": "Beauté / Cosmétique", "tier": "amateur", "icon": "Lipstick/Color/lipstick_color.svg", "is_fallback": false}, {"label": "Cadeaux", "tier": "amateur", "icon": "Wrapped gift/Color/wrapped_gift_color.svg", "is_fallback": false}, {"label": "Maison / Équipement", "tier": "confirme", "icon": "Couch and lamp/Color/couch_and_lamp_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Loisirs", "tier": "amateur", "icon": "Video game/Color/video_game_color.svg", "subcategories": [{"label": "Abonnements streaming", "tier": "amateur", "icon": "Clapper board/Color/clapper_board_color.svg", "is_fallback": false}, {"label": "Sorties / Bars", "tier": "amateur", "icon": "Cocktail glass/Color/cocktail_glass_color.svg", "is_fallback": false}, {"label": "Cinéma / Concerts", "tier": "confirme", "icon": "Ticket/Color/ticket_color.svg", "is_fallback": false}, {"label": "Jeux vidéo", "tier": "confirme", "icon": "Video game/Color/video_game_color.svg", "is_fallback": false}, {"label": "Livres / Presse", "tier": "confirme", "icon": "Open book/Color/open_book_color.svg", "is_fallback": false}, {"label": "Hobbies", "tier": "confirme", "icon": "Artist palette/Color/artist_palette_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Voyages", "tier": "amateur", "icon": "Airplane/Color/airplane_color.svg", "subcategories": [{"label": "Billets (avion, train)", "tier": "amateur", "icon": "Airplane departure/Color/airplane_departure_color.svg", "is_fallback": false}, {"label": "Hébergement", "tier": "amateur", "icon": "Bed/Color/bed_color.svg", "is_fallback": false}, {"label": "Location de véhicule", "tier": "confirme", "icon": "Automobile/Color/automobile_color.svg", "is_fallback": false}, {"label": "Activités sur place", "tier": "confirme", "icon": "Beach with umbrella/Color/beach_with_umbrella_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Travail / Pro", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg", "subcategories": [{"label": "Matériel professionnel", "tier": "confirme", "icon": "Laptop/Color/laptop_color.svg", "is_fallback": false}, {"label": "Formation / Cours", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg", "is_fallback": false}, {"label": "Déplacements pro", "tier": "confirme", "icon": "Airplane departure/Color/airplane_departure_color.svg", "is_fallback": false}, {"label": "Repas pro", "tier": "confirme", "icon": "Fork and knife with plate/Color/fork_and_knife_with_plate_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Finances / Admin", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg", "subcategories": [{"label": "Impôts", "tier": "amateur", "icon": "Receipt/Color/receipt_color.svg", "is_fallback": false}, {"label": "Frais bancaires", "tier": "confirme", "icon": "Credit card/Color/credit_card_color.svg", "is_fallback": false}, {"label": "Assurances (autres)", "tier": "confirme", "icon": "Shield/Color/shield_color.svg", "is_fallback": false}, {"label": "Épargne", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg", "is_fallback": false}, {"label": "Investissement", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg", "is_fallback": false}, {"label": "Remboursement de prêt", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg", "is_fallback": false}, {"label": "Dons / Charité", "tier": "confirme", "icon": "Heart hands/Default/Color/heart_hands_color_default.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Famille", "tier": "amateur", "icon": "People hugging/Color/people_hugging_color.svg", "subcategories": [{"label": "Garde d''enfants", "tier": "confirme", "icon": "Baby/Default/Color/baby_color_default.svg", "is_fallback": false}, {"label": "Scolarité", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg", "is_fallback": false}, {"label": "Enfants / Jouets", "tier": "confirme", "icon": "Teddy bear/Color/teddy_bear_color.svg", "is_fallback": false}, {"label": "Animaux de compagnie", "tier": "confirme", "icon": "Dog/Color/dog_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}, {"label": "Revenus", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg", "subcategories": [{"label": "Salaire", "tier": "amateur", "icon": "Money bag/Color/money_bag_color.svg", "is_fallback": false}, {"label": "Freelance / Indépendant", "tier": "amateur", "icon": "Briefcase/Color/briefcase_color.svg", "is_fallback": false}, {"label": "Remboursements", "tier": "amateur", "icon": "Money with wings/Color/money_with_wings_color.svg", "is_fallback": false}, {"label": "Cadeaux reçus", "tier": "confirme", "icon": "Wrapped gift/Color/wrapped_gift_color.svg", "is_fallback": false}, {"label": "Ventes (seconde main)", "tier": "confirme", "icon": "Shopping bags/Color/shopping_bags_color.svg", "is_fallback": false}, {"label": "Dividendes / Intérêts", "tier": "investisseur", "icon": "Chart increasing/Color/chart_increasing_color.svg", "is_fallback": false}, {"label": "Aides / Bourses", "tier": "confirme", "icon": "Graduation cap/Color/graduation_cap_color.svg", "is_fallback": false}, {"label": "Autre", "tier": "amateur", "icon": null, "is_fallback": true}]}]'::jsonb;
  cat jsonb;
  sub jsonb;
  new_parent_id uuid;
begin
  for cat in select * from jsonb_array_elements(taxonomy) loop
    insert into categories (user_id, name, tier, icon, is_fallback)
    values (target_user, cat->>'label', cat->>'tier', cat->>'icon', false)
    returning id into new_parent_id;

    for sub in select * from jsonb_array_elements(cat->'subcategories') loop
      insert into categories (user_id, name, parent_id, tier, icon, is_fallback)
      values (
        target_user,
        sub->>'label',
        new_parent_id,
        sub->>'tier',
        sub->>'icon',
        coalesce((sub->>'is_fallback')::boolean, false)
      );
    end loop;
  end loop;
end;
$func$;

-- Applique la taxonomie à tous les comptes déjà existants, une seule fois, maintenant.
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform seed_category_taxonomy(u.id);
  end loop;
end $$;

-- Les futurs comptes reçoivent uniquement la nouvelle taxonomie (plus les anciennes catégories de
-- départ, désormais redondantes avec elle) — mise à jour du trigger d'inscription déjà existant.
create or replace function seed_default_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $trig$
begin
  insert into public.accounts (user_id, name) values
    (new.id, 'Compte courant');

  insert into public.user_plans (user_id) values (new.id);

  perform seed_category_taxonomy(new.id);

  return new;
end;
$trig$;
