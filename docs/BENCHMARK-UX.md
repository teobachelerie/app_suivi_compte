# Benchmark UX : concurrents App Store et diagnostic Finelio

Rédigé le 28 octobre 2026. Objectif de Téo : qu'un utilisateur n'ait **jamais à réfléchir** pour savoir quoi faire, en priorité sur l'ajout d'une transaction. L'UI (le style) vient après ; ici on traite la praticité.

## Méthode et limites (à lire avant de s'appuyer sur ce document)

- **Sources concurrentes** : captures App Store officielles de 17 apps (API publique iTunes, magasins FR et US), consultées le 28 octobre 2026. Mobbin, qui donne tous les écrans et flux réels, demande un abonnement payant : non utilisé.
- **Limite** : les captures App Store sont du marketing. Elles montrent 6 à 10 écrans « vitrine » par app, jamais les états d'erreur, les écrans intermédiaires ni les transitions. Les constats sur les flux concurrents sont donc **déduits** de ces écrans, pas observés en usage. Confiance : bonne sur la structure des écrans principaux, faible sur les détails d'interaction.
- **Source Finelio** : captures Playwright (WebKit, 390×844, sombre) du 17 octobre 2026, `tools/visual/out/`. Le flux de saisie n'a pas changé depuis. Ce que WebKit macOS ne reproduit pas (clavier iOS, zones de sécurité, gestes) n'est pas couvert.

## Les apps étudiées

| App | Note (avis) | Modèle | Pertinence pour Finelio |
|---|---|---|---|
| Cashew | 4,9 (86 FR) | Saisie manuelle | **Référence directe** (déjà utilisée en septembre) |
| Dime | 4,8 (319 US) | Saisie manuelle | **Référence saisie rapide** |
| Monefy | 4,7 (316 FR) | Saisie manuelle | Saisie en 2 gestes |
| Money Manager (Realbyte) | 4,7 (1 424 FR) | Saisie manuelle | Vue calendrier, comptes |
| Toshl | 4,6 (313 FR) | Saisie manuelle | — |
| Fortune City | 4,6 (122 FR) | Saisie manuelle, ludique | Suggestions de titres |
| Money Lover | 4,5 (218 FR) | Mixte | Factures, échéances |
| Spendee | 4,6 (648 FR) | Mixte | — |
| Wallet (BudgetBakers) | 4,4 (1 005 FR) | Mixte | — |
| Buddy | 4,7 (4 284 FR) | Mixte | Budgets partagés |
| YNAB | 4,7 (329 FR) | Budget par enveloppes | — |
| Copilot Money | 4,8 (30 731 US) | Agrégation bancaire | **Référence revue de transactions et hiérarchie d'accueil** |
| Monarch | 4,9 (115 887 US) | Agrégation bancaire | **Référence revue « glisser pour valider »** |
| Rocket Money | US | Agrégation | Abonnements |
| Bankin' | 4,7 (92 508 FR) | Agrégation | Leader FR |
| Finary | 4,7 (15 351 FR) | Patrimoine | Référence palier Investisseur |
| MoneyCoach | 4,4 (491 FR) | Mixte | — |

## Ce qui revient chez les meilleurs

### 1. La saisie tient sur un seul écran
Dime (« Simple, Speedy Input »), Monefy (« Tap, tap, done ») et Fortune City montrent tous le même écran : **montant en grand en haut, pavé numérique en bas, et entre les deux des pastilles touchables pour la catégorie, le compte et la date**, préremplies avec des valeurs par défaut. Un bouton pour valider, rien d'autre d'obligatoire. Dépense/Revenu est un sélecteur en haut de ce même écran, pas un écran séparé.

Conséquence : une dépense courante = taper le montant, toucher une catégorie, valider. **Trois gestes, zéro écran intermédiaire.** Les champs rares (notes, tags, fractionnement) sont repliés derrière « Plus d'options ».

### 2. Le montant d'abord
Toutes les apps de saisie rapide ouvrent sur le montant, pas sur la catégorie. Le montant est la seule information toujours connue au moment de la saisie (on vient de payer).

### 3. Des suggestions plutôt que des champs vides
Fortune City propose des titres suggérés en pastilles (« Burger », « Sushi ») selon la catégorie. Cashew et Copilot préremplissent la catégorie selon le titre. Personne ne demande de taper des tags séparés par des virgules.

### 4. L'accueil répond à une seule question
Copilot : « 2 272 $ restants » en tête, puis une courbe, puis les transactions à revoir. Cashew : solde par compte en pastilles, puis « Dépenses mensuelles : 248 € restants sur 450 € » avec une barre, puis la courbe. **Un chiffre principal, une barre de progression, le reste en dessous.**

### 5. La liste des transactions est la colonne vertébrale
Cashew, Money Manager, Monarch : liste groupée par jour, avec onglets de mois en haut (glisser pour changer de mois), icône de catégorie colorée, montant aligné à droite. Money Manager y ajoute une **vue calendrier** (déjà prévue dans `SPEC-PRODUIT-V1.md`).

### 6. Abonnements et échéances visibles avant qu'ils tombent
Copilot, Monarch, Money Lover, Finary : liste « À venir » avec date et montant, badge « En retard ». Finary affiche un calendrier mensuel des prélèvements.

### 7. Réglages : une liste iOS standard, une icône colorée par ligne
Dime et Cashew : réglages en liste groupée, interrupteurs directement dans la ligne pour les options binaires, pas de sous-écran pour un simple oui/non.

## Diagnostic Finelio, écran par écran

### Ajout d'une transaction (priorité absolue)
Parcours actuel : **catégorie → montant → détails → confirmer**, soit 3 écrans et au moins 5 gestes pour la dépense la plus simple.

| Problème | Écran | Gravité |
|---|---|---|
| L'ordre force à choisir la catégorie avant de taper le montant | Catégories | Haute |
| Le formulaire Détails affiche 7 champs d'un coup (titre, compte, moyen de paiement, date, tags, remarques) alors que seul le titre est utile au quotidien | Détails | Haute |
| Compte et Moyen de paiement sont des `<select>` natifs gris avec flèches système, qui jurent avec le reste | Détails | Haute |
| Tags « séparés par une virgule » : saisie libre, sujette aux fautes, sans suggestion | Détails | Moyenne |
| Le virement est caché derrière un lien souligné en bas de la grille de catégories | Catégories | Haute |
| Logement et Famille s'affichaient sans icône sur une capture : artefact de capture (icônes présentes sur les captures du 28 octobre en thème clair) | Catégories | Écarté |
| Le placeholder du titre (« ex. J'ai acheté une bougie ») n'aide pas | Détails | Basse |
| L'erreur « Le montant doit être supérieur à zéro » s'affiche après coup au lieu de griser le bouton | Montant | Basse |

### Édition d'une transaction
**Deuxième interface, différente de l'ajout** : segments Dépense/Gain/Virement, montant en champ texte (« 52.4 » avec un point, pas de pavé), catégorie dans une liste texte sans icônes ni familles. L'utilisateur réapprend tout pour corriger une faute de frappe. Déjà noté comme dette n°3 dans `HANDOFF.md`.

### Accueil
- Bonne base (pile de cartes validée, période, revenus/dépenses).
- Trop d'éléments au même niveau : cartes, sélecteur de période, revenus, dépenses, objectifs, simulateur PEA, épargne. **Aucun chiffre principal** ne répond à « combien il me reste ce mois-ci ».
- La section Épargne passe sous la barre d'onglets : on ne sait pas qu'il faut défiler.

### Activité
- Bonne base : recherche, filtres Tout/Sorties/Entrées, groupement par jour.
- Le changement de période n'est pas accessible ici (il est sur l'Accueil), alors que c'est l'écran où on en a le plus besoin.

### Budgets
- L'onglet mélange quatre choses : abonnements, taux d'épargne, plafonds, répartition. L'utilisateur ne sait pas ce qu'est « un budget » dans Finelio.
- Les plafonds (le vrai budget) sont en troisième position.

### Barre d'onglets
- Seul l'onglet actif a un libellé ; les trois autres sont des icônes seules (liste, camembert, engrenage). La liste et le camembert ne se devinent pas.

### Abonnements
- Bon écran. « Ajouter » orange sur chaque ligne de récurrence détectée : lisible. Manque une vue « à venir » datée.

## Recommandations, par impact

### P0 : nouvelle saisie en un écran (**validée par Téo le 28 octobre 2026, livrée** : `components/TransactionSheet.jsx`)

Proposition :

1. Le bouton « + » ouvre une feuille plein écran **directement sur le montant**, pavé calculatrice visible (on garde ÷ × − +).
2. En haut : sélecteur **Dépense · Revenu · Virement** (le virement sort de son lien caché).
3. Sous le montant, une rangée de **pastilles préremplies** : catégorie (la dernière utilisée, ou « Choisir »), compte (le compte actif de l'accueil), date (« Aujourd'hui »). Toucher une pastille ouvre une petite feuille de choix ; la catégorie garde la grille à icônes et les sous-catégories actuelles.
4. Un champ titre d'une ligne avec des **suggestions en pastilles** tirées de l'historique de la catégorie choisie.
5. « Plus d'options » replié : moyen de paiement, tags (en pastilles à partir des tags existants), remarques, fractionnement.
6. Bouton **Enregistrer** grisé tant que montant = 0 ou catégorie absente : pas de message d'erreur après coup.
7. **Le même écran sert à l'édition**, prérempli. Une seule interface à maintenir (fin de la dette n°3).

Dépense courante : montant → catégorie → Enregistrer. **3 gestes au lieu de 5+ et 3 écrans.**

Contraintes respectées : contrat des Raccourcis iOS intact (aucun changement d'API), `BottomSheet` et `PickerField` existants réutilisés (fin des `<select>` natifs), champs en 16 px, pas d'emoji.

### Livré le 28 octobre 2026 (lot « friction »)
- Graphique Dépenses/Revenus : chaque jour touchable sur toute la hauteur, glisser pour passer d'un jour à l'autre.
- Accueil : transactions récentes juste sous Revenus/Dépenses, puis épargne, puis Objectifs et Simulateur en deux tuiles.
- Activité : période et filtres (catégorie, compte) visibles, bouton « Effacer ».
- Budgets : plafonds en premier, dépenses par catégorie en liste avec icône et barre de part (camembert retiré), abonnements et taux d'épargne en tuiles.
- Réglages : interrupteurs directement sur la page (sous-écrans Apparence et Affichage supprimés).
- « Gain » remplacé par « Revenus » sur l'écran des flux.
- Non fait : chiffre « Reste ce mois-ci » (la carte affiche déjà le net de la période), libellés de la barre d'onglets (réglage iOS fragile, à tester sur iPhone).

### Livré le 29 octobre 2026 (lot « réparage UX »)
- Toutes les listes de choix (Période, valeurs par défaut, règles) s'ouvrent en feuille du bas : fin des fenêtres qui tombaient du haut.
- « Mois… » devient « Autre… » sur le sélecteur de période.
- Tuiles Revenus et Dépenses de l'accueil : chevron, pour montrer qu'elles ouvrent le détail.
- Formulaires Objectif et Abonnement refaits avec les primitives (champs 16 px, sélecteurs au pouce, bouton grisé avec la raison dessous, comme la saisie).
- Champs hérités (connexion, réglages, simulateur PEA) en 16 px : plus de zoom Safari au focus.
- Raccourci iOS : trois étapes numérotées dans l'ordre réel (clé, installation, collage), clé sans nom obligatoire, gros bouton « Copier la clé », compte par défaut jamais vide.
- Saisie : déplier les détails replie le pavé (« Touche pour modifier » sur le montant) ; tags et remarques ne passent plus dessous.
- Cartes de comptes : variation sur pastille sombre, lisible sur la carte Patrimoine en thème clair.
- Plafond : icônes de catégories dans la liste.
- Non fait : libellés de la barre d'onglets (réglage iOS fragile, à tester sur iPhone).

### P1 : clarifier l'accueil et la navigation
- Un chiffre principal en haut de l'accueil pour le compte actif : **« Reste ce mois-ci »** (revenus − dépenses de la période), avec une barre si un plafond global existe.
- Libellés sous **toutes** les icônes de la barre d'onglets (Accueil, Activité, Budgets, Réglages).
- Objectifs, Simulateur PEA et Épargne regroupés et réduits pour que les transactions récentes remontent (demande de Téo du 27 septembre).

### P2 : remettre de l'ordre dans Budgets
- Budgets = plafonds par catégorie, en premier.
- Abonnements déplacés dans leur propre entrée, avec une liste **« À venir »** datée (Copilot, Monarch, Finary).
- Taux d'épargne déplacé vers l'accueil ou l'activité.

### P3 : Activité
- Sélecteur de mois en haut de l'Activité (glisser à gauche/droite pour changer de mois, comme Cashew et Money Manager).
- Vue calendrier (déjà dans `SPEC-PRODUIT-V1.md`).

### Petits correctifs immédiats (sans décision)
- Placeholder du titre : « Courses, Restaurant… ».
- Montant de l'édition au format français (virgule).

## Décisions à prendre par Téo

1. Valides-tu la saisie en un écran (P0), qui remplace le parcours en 3 étapes des maquettes `Montant` / `Details` ?
2. La pastille catégorie doit-elle être préremplie avec la dernière catégorie utilisée, ou rester vide pour obliger à choisir ?
3. Le « Reste ce mois-ci » de l'accueil : calculé par compte actif, ou sur tous les comptes ?
