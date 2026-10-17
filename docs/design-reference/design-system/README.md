# Finelio — Design System

Finelio est un tracker de dépenses à saisie manuelle. Le système démarre en **thème sombre uniquement** — le logo (une marque géométrique en chevrons blancs sur un dégradé chaud noir → rouge → orange → ambre) est le point de départ de toute la direction artistique. Un thème clair viendra dans un second temps ; les tokens sont déjà structurés par thème pour l'accueillir sans tout refaire.

Ceci est un **premier système restreint** : construit uniquement à partir des trois fichiers logo fournis (`icone-F-AppStore-1024.png`, `icone-F-carree-4096.png`, `icone-F-arrondie-4096.png`). Les couleurs ci-dessous sont extraites par échantillonnage réel des pixels du logo, pas estimées à l'œil. Aucun composant d'interface n'existe encore — ils seront ajoutés une fois les écrans actuels de l'app envoyés et audités.

## Fondamentaux

- **Ton** : sombre, affirmé, chaud. À l'opposé des trackers de dépenses pastel/neutres du marché (Cashew, Moniflow) — Finelio assume un langage visuel plus proche des wallets crypto (Rainbow, Phantom) que des apps de gestion budgétaire classiques.
- **Un seul accent de marque à la fois** : `accent-orange` porte l'identité (CTA, boutons primaires). `accent-red` et `accent-amber` sont réservés au sens financier (dépense / revenu), jamais utilisés comme couleur de marque générique.
- **Le noir est un choix, pas un défaut** : `surface-0` est un vrai noir (#000000), pas un gris foncé — cohérent avec le fond du logo.

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `surface-0` | `#000000` | Fond de page principal |
| `surface-1` | `#121212` | Cartes, listes, champs |
| `surface-2` | `#1c1613` | Modales, feuilles, popovers |
| `border` | `#2a2420` | Séparateurs, contours |
| `ink` | `#f6f5f2` | Texte principal |
| `ink-muted` | `#9a938c` | Texte secondaire, dates, labels |
| `accent-red` | `#e53f1a` | Dépenses, montants négatifs |
| `accent-orange` | `#ff802e` | CTA, boutons primaires, marque |
| `accent-amber` | `#ffbb2e` | Revenus, montants positifs |
| `accent-red-deep` | `#63190a` | Fond de dégradés de marque uniquement |

**Règle de contraste non négociable** : les trois accents (`accent-red`, `accent-orange`, `accent-amber`) sont des couleurs claires à moyennes — un texte `ink` posé dessus tombe sous 4,5:1 (mesuré : 3,8:1 sur rouge, 2,3:1 sur orange, 1,55:1 sur ambre). **Tout texte sur un fond accent-* doit utiliser `surface-0`**, jamais `ink`. C'est vérifié et contraignant, pas une suggestion.

**Point de vigilance daltonisme** : `accent-red` (dépense) et `accent-orange` (marque/CTA) appartiennent à la même famille de teinte (rouge-orangé) — ils se distinguent par la clarté (L 0,20 vs 0,37) mais pas par la teinte. Ne jamais s'appuyer sur la seule couleur pour différencier "c'est une dépense" de "ceci est cliquable" : toujours doubler d'une icône, d'un signe (+/-) ou d'un texte.

## Typographie

Famille unique : **Inter** (Google Fonts, chargée par nom — pas de fichier à héberger). Choisie pour sa lisibilité des chiffres tabulaires, critère de premier ordre pour une app financière.

| Style | Taille / interligne | Poids | Usage |
|---|---|---|---|
| `display` | 40 / 46px | 700 | Solde total, montant principal d'un écran |
| `heading-lg` | 28 / 34px | 700 | Titres d'écran |
| `heading-md` | 20 / 26px | 600 | Titres de section, titres de carte |
| `body` | 16 / 24px | 400 | Texte courant |
| `body-sm` | 14 / 20px | 400 | Texte secondaire, descriptions |
| `caption` | 12 / 16px | 500 | Labels, badges, métadonnées |
| `amount` | 17 / 22px | 600 | Montants dans les listes de transactions — toujours ce style, jamais `body`, pour garder les chiffres alignés visuellement dans les listes |

## Espacement et rayons

4 paliers d'espacement (`space-xs` 4px → `space-lg` 24px) et 3 rayons (`radius-sm` 8px → `radius-lg` 24px). Le rayon `radius-lg` (24px) est volontairement généreux — il fait écho aux formes larges et angulaires du logo plutôt qu'à un style "app neutre" à petits rayons.

## Iconographie

Le système de catégories de dépenses utilise déjà le pack **Microsoft Fluent Emoji**, style *Color* (livré séparément dans `cap-finances-categories.zip`, 49 icônes). Ces icônes gardent leurs propres couleurs saturées (elles ne s'adaptent pas aux tokens de ce système) — elles sont posées sur des puces de fond `surface-1` avec un rayon `radius-sm`, jamais directement sur `surface-0`, pour garder un contraste de cadre net.

## Ce qui manque encore

Ce système n'a pas de composants (boutons, cartes de transaction, barre d'onglets, feuilles de saisie) : ils seront construits une fois les écrans actuels de l'app envoyés et audités un par un pour lister les problèmes existants (icônes, catégories tronquées, etc.) avant de les refaire dans cette direction.
