# Spec produit V1 (issue de la conversation « Plan App »)

Source : conversation claude.ai « Plan App » du projet Tracking Budget, document produit le 23 septembre 2026 après la veille concurrentielle (Cashew, Moniflow, SyncSpend). L'app s'appelait encore Cap Finances.

**Priorité des sources** : en cas de conflit, `CLAUDE.md` et `docs/HANDOFF.md` (17 octobre) font foi. Décisions prises depuis ce document :
- pas de lancement public, Stripe reste en mode test (HANDOFF §7) ;
- Investisseur fixé à 8,99 € dans Stripe (HANDOFF §3) ;
- pas de pièces jointes sur les transactions ;
- taxonomie livrée et intégrée (11 familles, environ 60 sous-catégories, Fluent Emoji).

Ce document sert de **feuille de route fonctionnelle** : plusieurs fonctionnalités listées ici ne sont pas encore construites (vue calendrier, prêts, journal d'activité, programmé, pavé calculatrice, limites du palier Amateur). Vérifier dans le code avant de considérer un point comme fait.

---

## 1. Positionnement et contraintes fondatrices

- **Catégorie de produit** : tracker de dépenses à **saisie manuelle**, pas d'agrégation bancaire automatique (DSP2/agrément ACPR hors de portée solo, ce n'est pas notre marché). Comparables directs : Cashew, Moniflow, SyncSpend. Pas Bankin'/Linxo/Finary.
- **Plateforme** : PWA (web app installable), pas de version native iOS/Android. **Raison ferme, pas à rediscuter** : publication App Store impossible tant que le développeur est mineur. Toute fonctionnalité qui nécessite du natif est hors scope V1 (voir section 5).
- **Stack** : Supabase (Postgres), Next.js, Vercel.
- **Facturation** : Stripe, limitation par palier réelle en base (pas de bidouille côté front seulement). Comptes existants (dont celui de Téo) en accès complet à vie, jamais bridés par le paywall.

## 2. Monétisation : 3 paliers

| Palier | Prix | Rôle |
|---|---|---|
| **Amateur** | Gratuit | Prise en main, usage basique, doit donner envie de passer payant |
| **Confirmé** | 4,99 €/mois | Usage quotidien complet du suivi |
| **Investisseur** | 7,99 à 8,99 €/mois (8,99 € retenu dans Stripe) | Vision patrimoniale globale |

Cohérent avec Moniflow (4,99 €/mois, palier unique) et sous le seuil des agrégateurs bancaires (9,99 €+). Ne pas monter le prix sans valeur différenciante correspondante.

## 3. Limites du palier Amateur

Modèle Cashew : **1 budget actif à la fois** (recréable chaque période, mais un seul actif) + **catégories de base uniquement** (24 catégories et sous-catégories marquées `tier: "confirme"` dans la taxonomie). Pas de limite sur le nombre de transactions.

## 4. Fonctionnalités par palier

### Amateur (base commune)
- CRUD transactions (dépense, revenu)
- Catégories et sous-catégories de niveau « confirme » (24, avec repli sur la catégorie principale)
- 1 budget actif
- **Vue calendrier** : code couleur par jour, réutilise les transactions existantes, aucune logique métier nouvelle
- **Saisie type calculatrice** : opérateurs ÷ × − + inclus, pas un simple pavé numérique

### Confirmé (4,99 €)
- Budgets illimités
- Catégories étendues (les 34 sous-catégories `tier: "investisseur"` passent en accès Confirmé ; seul le patrimoine reste réservé à Investisseur)
- **Objectifs** : barre de progression, montant et cible, %, icône par objectif
- **Abonnements** : coûts récurrents (mensuel, annuel, total)
- **Programmé** : transactions à venir ou en retard, moyenne mensuelle projetée
- **Journal d'activité** : suppression douce et restauration, rétention proposée 30 jours
- Thème personnalisable : couleur d'accent, clair/sombre/système, réglage « Animations : Toutes/Réduites/Aucune »
- Écran unique « Modifier les données » dans les paramètres (Comptes, Catégories, Intitulés, Budgets, Objectifs, Prêts) plutôt qu'éparpillé

> À trancher pendant le build, non bloquant : garder quelques sous-catégories nichées (ex. « Immobilier », « Dividendes/Intérêts ») réservées à Investisseur pour renforcer la différenciation.

### Investisseur (8,99 €)
- **Prêts** : suivi « une fois » et « long terme », filtres Prêté/Emprunté, recherche
- **Suivi patrimoine complet** : comptes courants et épargne, PEA, investissements (actions, crypto), immobilier et autres actifs
  - **Contrainte actée** : PEA et investissements en **saisie manuelle de la valeur**, pas de cours en temps réel. Prévoir un rappel périodique (« mets à jour la valeur de ton PEA »). Le calcul de plus-value n'est pas automatique.
- Export CSV, import/export Google Sheets avec modèles téléchargeables
- Sauvegarde et restauration

## 5. Hors scope V1

- **Widgets d'écran d'accueil** : nécessitent du natif (WidgetKit), incompatible avec une PWA. Ne pas chercher de contournement.
- **Connexion bancaire automatique** (DSP2) : hors positionnement produit.
- **Cours boursiers ou crypto en temps réel** : saisie manuelle uniquement.

## 6. Taxonomie des catégories (livrée)

11 catégories principales (Alimentation, Logement, Transport, Santé, Shopping, Loisirs, Voyages, Travail/Pro, Finances/Admin, Famille, Revenus), 59 sous-catégories, chacune taguée `tier`. Repli sur la catégorie principale pour une transaction sans sous-catégorie.

Règles d'interface validées par Téo :
- Dans le sélecteur, toucher une catégorie principale affiche ses sous-catégories **et** la catégorie principale elle-même, sous son nom simple (« Shopping », jamais « Shopping (général) » ni « Catégorie principale »). La toucher applique la catégorie sans sous-catégorie.
- Camemberts, activité et budgets : répartition **uniquement par catégorie principale**, jamais par sous-catégorie.

Icônes : Microsoft Fluent Emoji (licence MIT, style Color, SVG). Deux sous-catégories partagent l'icône de leur parent faute d'icône plus spécifique (Restaurants et Repas pro avec l'icône Alimentation) ; à améliorer plus tard si besoin.

## 7. Règles de design

- Ne pas copier le design de Cashew : on reprend la structure fonctionnelle, pas le style.
- Une seule illustration d'état vide, réutilisée sur tous les écrans vides (Transactions, Budgets, Prêts, Abonnements, Programmé, Journal).
- Animations : 200 à 400 ms, une seule transition à la fois, ease-out à l'entrée et ease-in à la sortie. Les animations d'onboarding existantes sont mal calibrées : correction de timing, pas refonte. (Les tokens de mouvement de `CLAUDE.md` priment.)
- Icône et pastille de couleur par catégorie dans les listes de transactions.

## 8. Repères marché (contexte, pas des specs)

Ce type de produit (saisie manuelle, sans connexion bancaire) se vend entre 2 et 5 €/mois ou 20 à 30 €/an. Conversion réaliste installé vers payant sans publicité : 2 à 5 %. Le palier Investisseur n'est défendable que par une vraie vision patrimoniale, pas par « plus de catégories ».
