# Faire de Cap Finances une app de finances perso de haut niveau : veille concurrentielle & feuille de route

> **Note sur les sources :** les outils de recherche web en direct n'étaient pas disponibles pour cette tâche, donc ce rapport s'appuie sur une connaissance générale établie du marché des apps de finances personnelles (la plus fiable jusqu'à mi-2025). Les affirmations sensibles au temps (2025-2026) sont signalées et regroupées dans la section **Réserves** ; à traiter comme "à vérifier avant d'agir", pas comme un fait acquis. L'analyse stratégique et les recommandations de fonctionnalités ne dépendent pas des points non vérifiés.

## En bref
- **Le marché s'est scindé en deux camps, et Cap Finances doit clairement miser sur celui qui est sous-exploité :** les apps "coaching / plafonds de budget" (YNAB, Rocket Money, Cleo) contre les apps "tableau de bord / visibilité" (Copilot, Monarch, Finary, Empower). La philosophie de Téo — pas de plafonds, une image honnête — colle exactement au deuxième camp : le bon coup, c'est de devenir le meilleur *tableau de bord quantifié pour l'argent*, pas une nouvelle app qui culpabilise sur le budget.
- **Le plus gros avantage défendable de Cap Finances aujourd'hui, c'est la saisie manuelle/via Raccourcis** — parce que la plainte la plus fréquente, sur quasiment toutes les apps commerciales basées sur l'agrégation bancaire (Mint, Monarch, YNAB, Copilot), c'est une synchronisation bancaire peu fiable. Miser sur une saisie rapide et sans friction plus des analyses poussées contourne à la fois le pire point noir du secteur *et* son plus gros poids réglementaire/financier (les licences Open Banking).
- **Les fonctionnalités à plus fort impact à construire ensuite** (réalistes pour un développeur solo en Next.js/Supabase) : une couche d'analyse taux d'épargne + évolution du patrimoine, une visualisation des flux de trésorerie façon diagramme de Sankey, une "heatmap" des dépenses façon GitHub avec un système de records personnels/séries (la traduction Strava / sim-racing), un export CSV/JSON, des tags et le fractionnement de transactions, et une assistance de catégorisation par IA. Repousser la vraie agrégation bancaire et le lancement sur l'App Store jusqu'à ce que cette avance analytique existe — avec un vrai blocage non technique à noter : **le contrat développeur Apple exige la majorité légale, donc un lancement natif attendra réalistement les 18 ans de Téo, ou passera par une société.**

## Constats clés

1. **La fermeture de Mint (début 2024) a rebattu les cartes du marché US** et créé le vide que Monarch, Copilot, Simplifi et Rocket Money se disputent encore. La leçon pour Cap Finances : beaucoup d'utilisateurs sont des rescapés d'apps arrêtées ou dégradées, donc **la pérennité, la propriété des données et l'export sont désormais des fonctionnalités concurrentielles**, pas des détails.
2. **"Pas de plafonds de budget" est un vrai positionnement produit, différenciant** — c'est le modèle "voir clairement" de Copilot/Monarch/Empower plutôt que le modèle "donner un rôle à chaque euro" de YNAB. Cap Finances devrait assumer cette philosophie explicitement comme positionnement.
3. **La fiabilité de la synchronisation bancaire est le talon d'Achille universel du secteur.** Toutes les apps basées sur l'agrégation souffrent de connexions qui lâchent, de transactions dupliquées/mal catégorisées, de soldes obsolètes. Le modèle manuel + Raccourcis de Cap Finances transforme un manque perçu en avantage de fiabilité — mais il faut le renforcer avec de l'automatisation qui réduit la friction de saisie (modèles, règles récurrentes, valeurs par défaut intelligentes), pas se précipiter sur l'Open Banking.
4. **La "personnalité performance" est sous-exploitée.** Presque aucune app de finances grand public ne traite l'argent comme Strava traite la course à pied — avec records personnels, écarts de tendance, segments et séries, dans une logique d'*accomplissement* plutôt que de restriction. C'est le créneau le plus clairement disponible vu le profil de Téo.
5. **Un lancement iOS natif a des blocages spécifiques, non liés au code :** la règle 4.2 d'Apple (fonctionnalité minimale / anti-"wrapper web"), l'exigence de majorité légale pour le compte développeur, et un contrôle renforcé pour la catégorie finance. Le Digital Markets Act européen et une Progressive Web App offrent des voies de diffusion intermédiaires moins contraignantes.

## Détails

### 1. Paysage concurrentiel (2025-2026)

**Apps internationales / US**

- **YNAB (You Need A Budget).** Philosophie : budget base zéro / enveloppes — "donner un rôle à chaque dollar", les Quatre Règles, allouer l'argent *avant* de dépenser. La fidélité des utilisateurs avancés vient de la *méthode* (un vrai système de changement de comportement) et d'une communauté engagée, pas du polish logiciel. Abonnement annuel premium, et les hausses de prix passées ont suscité des critiques. **Pertinence : c'est exactement le paradigme que Téo rejette — la référence de ce qu'il ne faut PAS construire, puisque tout son modèle repose sur des plafonds de dépense par catégorie.**
- **Copilot Money.** Philosophie : un tracker magnifiquement designé, natif de l'écosystème Apple (iOS + macOS), qui mise sur "tout voir clairement" avec une catégorisation automatique solide et un design soigné. La fidélité vient de l'esthétique, du ressenti natif et de la qualité de catégorisation ; régulièrement mis en avant par Apple, et a poussé la catégorisation/les insights assistés par IA. Historiquement lié à un fournisseur de données bancaires US. **Pertinence : le cousin spirituel le plus proche de l'esprit "image honnête" de Cap Finances, et la barre UX à viser.**
- **Monarch Money.** Philosophie : le successeur flexible et collaboratif de Mint — fort sur le patrimoine, les objectifs, et les *finances de foyer partagées* (plusieurs comptes pour les couples/partenaires). A beaucoup profité de la migration post-Mint et a levé des fonds sur cette dynamique *(montant/valorisation/date exacts à vérifier)*. La fidélité vient de la flexibilité, de la collaboration, et du statut de "foyer sûr sur le long terme". **Pertinence : valide le patrimoine + la collaboration comme fonctionnalités phares ; son modèle couples/partage est une piste directe pour le partage entre amis déjà présent dans Cap Finances.**
- **Rocket Money (anciennement Truebill ; propriété de Rocket Companies).** Philosophie : détection d'abonnements + annulation et négociation de factures — trouve les charges récurrentes et annule/négocie à ta place, freemium avec palier premium. **Pertinence : la gestion des abonnements est désormais un standard ; Cap Finances génère déjà automatiquement les abonnements récurrents, donc son opportunité est l'*analyse* (dérive des coûts dans le temps) plutôt que l'annulation-as-a-service.**
- **Simplifi by Quicken.** Philosophie : un "plan de dépenses" épuré qui projette l'argent restant après factures et objectifs ; souvent recommandé comme successeur de Mint. Sur abonnement.
- **Empower Personal Dashboard (anciennement Personal Capital).** Philosophie : suivi gratuit du patrimoine et des investissements/portefeuille, monétisé via une offre de gestion de patrimoine ; excellent pour l'agrégation d'investissements. **Pertinence : le modèle à étudier pour étendre la vue "patrimoine" vers les actifs/investissements, pas seulement la trésorerie.**
- **Cleo AI.** Philosophie : un chatbot à la personnalité Gen-Z (mode ludique/"clash"), incitations gamifiées, monétisation par avance de trésorerie. **Pertinence : un contre-exemple à retenir — sa gamification convient à son public mais paraîtrait gadget/condescendante pour un utilisateur orienté optimisation ; instructif sur le ton à éviter.**
- **Actual Budget.** Philosophie : open-source, **local-first**, auto-hébergeable, budget par enveloppes façon YNAB mais dont on garde la propriété. **Pertinence : la référence clé pour l'architecture local-first/vie privée et la propriété des données — son modèle de budget repose sur des plafonds, mais sa *posture d'architecture* colle parfaitement à un esprit indé et respectueux de la vie privée.**

**Apps françaises / européennes**

- **Bankin'.** L'app d'agrégation la plus connue en France ; son bras infrastructure/API s'appelle **Bridge** ("Bridge by Bankin'"), qui vend de l'agrégation Open Banking et de l'initiation de paiement aux entreprises. **Pertinence : Bridge est à la fois un fournisseur d'agrégation candidat pour le futur et le moteur B2B d'un concurrent.**
- **Linxo.** App d'agrégation française rachetée par le **Crédit Agricole** ; son bras B2B est **Linxo Connect** (agrégation DSP2 + initiation de paiement). Le statut de l'app grand public est en mouvement sous la houlette du Crédit Agricole *(statut actuel à vérifier)*.
- **Lydia → Sumeria.** Lydia, l'app de paiement entre particuliers dominante en France, a transformé ses ambitions de banque complète en une néobanque rebaptisée **Sumeria**, avec une offre de super-app bancaire et des taux d'épargne compétitifs, tandis que la fonction de paiement P2P Lydia continue *(déploiement exact à vérifier)*. **Pertinence : illustre le virage du marché français des outils mono-fonction vers les super-apps.**
- **Finary.** Plateforme française de suivi de patrimoine / d'agrégation qui suit comptes bancaires, actions, crypto, immobilier et plus, avec une communauté forte et une activité d'investissement. **C'est le comparable français le plus directement pertinent pour la vue "patrimoine" de Cap Finances** — essentiellement un tableau de bord patrimonial premium et quantifié pour investisseurs orientés optimisation, très proche de la personnalité de Téo.
- **Max (Crédit Agricole)** et **Pilote budget (BNP Paribas)** : outils d'agrégation/budget adossés aux banques — exemples d'acteurs historiques qui intègrent le budget dans leur app bancaire.
- **Grisbi :** logiciel de comptabilité personnelle français historique, open-source, sur ordinateur — une référence héritage du local-first.
- **Younited (Younited Credit) :** principalement du crédit à la consommation, largement hors périmètre pour le suivi de dépenses.
- **Repères UK/EU à noter :** Emma et Snoop (agrégation + suivi d'abonnements), Plum et Moneybox (épargne/investissement automatique). Le service britannique bien noté Money Dashboard a fermé — un autre exemple du risque d'arrêt de service et de l'intérêt de l'export.

### 2. Tendances émergentes (2025-2026)

- **Catégorisation par IA et insights "pose une question à ton argent".** La frontière actuelle : requêtes en langage naturel ("combien ai-je dépensé en carburant ce trimestre ?"), catégorisation automatique qui apprend des corrections de l'utilisateur, détection d'anomalies ("cette charge est inhabituelle"), et prévision de trésorerie. Plusieurs acteurs historiques ont déployé des couches d'insights IA *(noms de fonctionnalités/dates exacts à vérifier)*.
- **La gestion des abonnements est devenue un standard**, initiée par Truebill/Rocket Money et largement copiée depuis ; la différenciation se déplace de "j'annule pour toi" vers "je te montre la dérive des coûts dans le temps".
- **Le suivi du patrimoine est devenu grand public** (Monarch, Empower, Finary), incluant de plus en plus des actifs illiquides (immobilier, véhicules, crypto).
- **Finances collaboratives / partagées :** couples (Monarch), plus le partage de frais entre colocataires et groupes d'amis (façon Splitwise) intégré aux trackers.
- **Gamification & formation d'habitudes :** séries (façon Duolingo), objectifs, mécaniques de progression — puissant mais facile à surdoser ; les utilisateurs avertis rejettent les incitations qui sonnent manipulatrices.
- **Maturation de l'Open Banking (DSP2/PSD2) en Europe**, avec une DSP3 + un règlement sur les services de paiement et un cadre "Financial Data Access" (FIDA) proposé qui avance dans le processus législatif européen pour étendre "l'open finance" au-delà des comptes de paiement *(statut le plus récent à vérifier)*.
- **Innovation en visualisation :** diagrammes de Sankey revenus→dépenses (un favori récurrent dans les communautés finances perso et FIRE), heatmaps calendaires, comparaisons de tendances/cohortes.
- **Architecture local-first / privacy-first** (Actual Budget ; positionnement vie privée de Copilot) en réaction aux modèles économiques fondés sur l'exploitation des données et aux fermetures comme celle de Mint.

### 3. Fonctionnalités adaptées à une personnalité performance / optimisation

C'est le cœur stratégique. La traduction des mécaniques Strava / sim-racing / compétitives en matière d'argent :

- **Une métrique "étoile polaire" : le taux d'épargne** — (revenus − dépenses) / revenus, suivi dans le temps. C'est le chiffre le plus motivant pour un profil orienté optimisation ou proche du mouvement FIRE, et l'antithèse d'un plafond de budget : il récompense un résultat plutôt qu'il n'impose une limite.
- **Analyses de tendance et d'écart :** comparaisons mois par mois et année par année, moyennes glissantes, "écart par rapport à ta référence" dans l'esprit des écarts de temps au tour en sim-racing (plus rapide/plus lent que ton record).
- **Records personnels & séries, comme des accomplissements, pas des restrictions :** "mois le plus économe en carburant", "mois au taux d'épargne le plus élevé", "N mois consécutifs de trésorerie positive", "plus longue série de saisie quotidienne". Le cadrage "record personnel" façon Strava, jamais le cadrage "plafond" façon YNAB.
- **Heatmap des dépenses façon GitHub :** une grille calendaire montrant l'intensité des dépenses par jour — immédiatement lisible et gratifiante pour quelqu'un qui se suit lui-même.
- **Diagramme Sankey / flux de trésorerie :** les sources de revenus qui se répartissent vers les catégories et les comptes — exactement le type de visualisation que recherchent activement les utilisateurs avancés.
- **Métrique d'autonomie / taux de combustion (« runway »/« burn rate ») :** nombre de mois de dépenses actuellement couverts par l'épargne — un score de "forme financière" quantifié.
- **Segmentation avancée :** des tags superposés aux catégories, un filtrage multi-dimensions (compte × catégorie × tag × période), et des vues enregistrées.
- **Propriété des données :** export CSV/JSON dès maintenant, et à terme une API personnelle/des webhooks — à la fois une posture éthique et un rempart contre la peur du "l'app a fermé".
- **Automatisation pour réduire la friction de saisie :** étendre le flux Raccourcis avec des modèles, des saisies récurrentes en un geste, des règles de catégorisation automatique par marchand, et des valeurs par défaut intelligentes. Réduire la charge cognitive est en soi une fonctionnalité pour ce profil.

### 4. Fonctionnalités à éviter (plaintes des utilisateurs avancés)

- **Notifications culpabilisantes / agressives sur le budget** — le moyen le plus rapide de perdre un autodidacte orienté optimisation ; garder les notifications informatives et optionnelles.
- **Dépendance excessive à une synchronisation bancaire capricieuse** — la plainte la plus fréquente du secteur ; le modèle manuel/Raccourcis de Cap Finances est un avantage, pas un manque à combler précipitamment.
- **Fonctionnalités essentielles verrouillées derrière un abonnement / changements de règles unilatéraux** — la fermeture de Mint et les hausses de prix de YNAB sont des mises en garde ; le suivi de base et l'export doivent rester utilisables.
- **Tableaux de bord trop simplifiés qui masquent le détail** — l'exact opposé de ce que veut cet utilisateur ; ne jamais sacrifier la possibilité de creuser au profit d'un résumé "épuré".
- **Personnalisation des catégories faible / pas de fractionnement de transaction** — une plainte récurrente ; prendre en charge catégories personnalisées, sous-catégories, fractionnements et tags.
- **Gamification gadget et personnages trop mignons** (le ton Cleo) — sonnera condescendant pour ce public.
- **Verrouillage tout-cloud avec une gestion opaque des données** — les utilisateurs soucieux de leur vie privée valorisent de plus en plus les designs local-first et faciles à exporter.

### 5. Considérations techniques/produit pour un futur lancement sur l'App Store

- **Règle 4.2 (Fonctionnalité minimale).** Apple rejette les apps qui sont essentiellement des sites web reconditionnés / de simples enveloppes web-view. Un lancement natif doit apporter une vraie valeur native (UI native, comportement hors-ligne, notifications, Raccourcis/Widgets, verrouillage biométrique Face ID, etc.) — cohérent avec le plan de reconstruire l'UI nativement plutôt que d'expédier une WebView de l'app Next.js. *(Confirmer le texte/numéro exact de la règle actuelle avant soumission.)*
- **Services de connexion (la règle portait historiquement sur "Sign in with Apple").** Si l'app propose des connexions tierces/sociales, elle doit aussi proposer un équivalent respectueux de la vie privée comme "Se connecter avec Apple" ; une configuration en email/mot de passe pur ou Apple uniquement peut satisfaire l'exigence. La règle s'est élargie avec le temps — vérifier le libellé actuel.
- **Contrôle renforcé pour la catégorie finance et la vie privée (règle 5.1.1 et apparentées).** Les apps financières font l'objet d'un examen renforcé sur la collecte de données, la sécurité, et parfois une exigence que le développeur soit une entité légale. Une app de saisie manuelle qui ne touche jamais à de vrais identifiants bancaires ni ne déplace d'argent fait face à une contrainte *bien plus légère* qu'une app intégrant l'Open Banking — une raison de plus de repousser l'agrégation.
- **Blocage lié à la majorité légale du compte développeur.** L'Apple Developer Program exige que le titulaire du compte ait la capacité légale de contracter (18 ans en France). À 17 ans, Téo ne peut pas s'inscrire personnellement avant ses 18 ans, sauf à passer par une entité légale (ce qui nécessite un numéro D-U-N-S). C'est un point de blocage concret pour tout calendrier de lancement natif. *(Vérifier auprès des conditions d'inscription actuelles d'Apple pour la France.)*
- **Voies intermédiaires UE / DMA.** Sous le Digital Markets Act européen, iOS dans l'UE autorise désormais la distribution alternative et la distribution web, et une **Progressive Web App (PWA)** est un moyen d'offrir dès aujourd'hui à des amis une expérience installable, quasi-native, sans passer par la revue App Store — la stratégie pragmatique à court terme.
- **Fournisseurs d'agrégation Open Banking (pour une future fonctionnalité "relier de vrais comptes" en France/UE) :**
  - **Powens** (anciennement Budget Insight) — agrégateur français établi, orienté entreprises.
  - **Bridge** (par Bankin') — français ; agrégation + initiation de paiement.
  - **Tink** (propriété de Visa) — paneuropéen.
  - **GoCardless Bank Account Data** (anciennement Nordigen) — historiquement connu pour un palier gratuit, l'option la plus accessible aux développeurs indépendants *(conditions/éligibilité actuelles à vérifier)*.
  - **Linxo Connect**, **Salt Edge**, **TrueLayer**, **Yapily**, **Klarna Kosma** — autres agrégateurs DSP2.
  - **Contrainte légale clé :** l'agrégation de comptes sous DSP2 nécessite un agrément AISP (fournisseur de services d'information sur les comptes) ; un développeur solo y accède en *s'appuyant sur un fournisseur agréé* (en tant que client/agent), pas en devenant lui-même agréé. Cela ajoute du coût, de la conformité et de la maintenance continue — un argument fort pour repousser cette étape.

## Recommandations (classées par faisabilité pour un développeur solo en Next.js/Supabase)

**Étape 1 — Rempart analytique (à construire maintenant ; front-end pur + requêtes Supabase, aucune nouvelle infrastructure) :**
1. **Tableau de bord du taux d'épargne** comme métrique phare, avec tendances mois par mois et année par année. Ça opérationnalise la philosophie "pas de plafonds, image honnête" et colle le mieux au profil.
2. **Analyses de tendance/écart & records personnels :** moyennes glissantes, écarts "par rapport à ta référence" (cadrage sim-racing), et détection automatique de records (meilleur mois de taux d'épargne, mois le moins dépensier, plus longue série de saisie).
3. **Deux visualisations :** une heatmap des dépenses façon GitHub et un diagramme Sankey des flux de trésorerie (revenus → catégories → comptes). Les deux sont réalisables avec les bibliothèques de graphiques JS déjà disponibles.
4. **Export CSV/JSON** — effort faible, forte valeur de confiance, et réponse directe à la peur "et si ça fermait comme Mint".

**Étape 2 — Modèle de données & friction de saisie (à construire ensuite ; effort modéré) :**
5. **Tags + fractionnement de transactions + vues de filtres enregistrées** — comble les plus gros manques du modèle de données pour les utilisateurs avancés.
6. **Règles de catégorisation automatique par marchand** et **modèles de Raccourcis / saisies récurrentes en un geste** — de l'automatisation qui réduit la friction manuelle sans avoir besoin de synchronisation bancaire.
7. **Analyse de la dérive du coût des abonnements** — s'appuyer sur la fonctionnalité d'abonnements récurrents déjà existante pour montrer le poids mensuel total des abonnements et son évolution dans le temps.

**Étape 3 — Approfondissement optionnel (à construire si motivé) :**
8. **Couche d'assistance IA :** requêtes en langage naturel et catégorisation automatique apprenante (un appel à une API LLM sur les données Supabase de l'utilisateur — faisable en solo, mais à encadrer par une vraie gestion de la vie privée).
9. **Vue collaborative** pour les amis qui utilisent déjà l'app (suivi partagé/foyer, fractionnements façon Splitwise) — validé par le succès de Monarch, mais plus lourd à bien construire.
10. **Suivi des investissements/actifs dans "patrimoine"** (façon Finary) — étendre le patrimoine aux actifs illiquides/qui prennent de la valeur (véhicule, actions, crypto).

**Étape 4 — Diffusion & liaison bancaire (à repousser) :**
11. Déployer une **PWA** dès maintenant pour une installation quasi-native sans aucune revue App Store — la bonne voie de diffusion intermédiaire, en particulier dans l'UE sous le DMA.
12. Traiter une **vraie app iOS native et une vraie intégration Open Banking** comme des projets post-18 ans / post-création d'entreprise, en testant l'agrégation avec **GoCardless Bank Account Data** (palier gratuit, si les conditions tiennent toujours) le moment venu.

**Signaux qui devraient faire bouger ces priorités :**
- Si la demande n°1 des amis devient *relier de vrais comptes* (plutôt que la saisie manuelle) → faire remonter l'Open Banking en priorité.
- Si la saisie quotidienne active diminue → prioriser l'automatisation anti-friction plutôt que de nouvelles analyses.
- Si Téo atteint 18 ans ou crée une société → les blocages du lancement natif disparaissent et l'Étape 4 devient viable.
- Si un concurrent (Finary en particulier) sort une offre gratuite convaincante de tableau de bord quantifié → accélérer la différenciation analytique de l'Étape 1 pour garder l'avance sur le créneau "personnalité performance".

## Réserves
- **La vérification web en direct n'était pas possible pour cette tâche ; les connaissances sont les plus fiables jusqu'à mi-2025.** À confirmer indépendamment avant de tenir pour acquis : le dernier tour de financement/valorisation/date de Monarch ; les fonctionnalités IA et d'expansion de plateforme les plus récentes de Copilot (et un éventuel lancement Android) ; le prix actuel exact de YNAB ; le statut de l'app grand public Linxo sous Crédit Agricole ; l'état du déploiement Lydia/Sumeria ; les fonctionnalités IA nommées précises des acteurs historiques ; et le statut législatif de la DSP3 / du règlement sur les services de paiement / de FIDA.
- **Les règles d'Apple sont périodiquement renumérotées et reformulées** (la règle "Sign in with Apple", par exemple, s'est élargie en une exigence générale de "services de connexion"). Confirmer le numéro et le texte exacts des règles actuelles dans les App Review Guidelines en vigueur avant toute soumission.
- **Les tarifs et conditions des paliers gratuits des fournisseurs Open Banking changent fréquemment.** Vérifier les conditions actuelles directement auprès de chaque fournisseur — en particulier le palier gratuit de GoCardless/Nordigen et l'éligibilité d'un développeur solo/indépendant.
- **La règle de majorité légale du compte développeur** est une contrainte Apple bien établie sur laquelle il vaut la peine de planifier, mais vérifier les conditions d'inscription actuelles exactes pour la France (inscription individuelle vs. organisation, exigence de numéro D-U-N-S).
- **Ceci est un conseil stratégique, pas un conseil juridique.** Tout ce qui touche à de vraies données bancaires, à l'initiation de paiement, ou au stockage des données financières d'autrui (une fois partagé au-delà de quelques amis) peut déclencher des obligations RGPD et DSP2 — obtenir un avis qualifié avant de faire monter en charge les fonctionnalités collaboratives ou d'agrégation.
