# Design System "Soft Ledger" (Cap Finances) — extraction exacte

Source : `styles/globals.css`, valeurs copiées telles quelles depuis le code, pas reformulées.

## 0. Comment le mode clair/sombre est géré

- Attribut HTML `data-theme="dark"` sur `<html>` (`document.documentElement.setAttribute("data-theme", "dark")`). Absence de l'attribut = mode clair (pas de `data-theme="light"` explicite, c'est l'état par défaut de `:root`).
- **Pas** basé sur la préférence système (`prefers-color-scheme`) — bascule manuelle uniquement, choisie par l'utilisateur.
- Persisté dans `localStorage`, clé `expenses-theme`, valeurs `"dark"` ou absente/`"light"`.
- Appliqué avant le premier rendu via un script inline dans `<head>` (`pages/_document.js`) pour éviter un flash de mauvais thème au chargement :
  ```js
  try{var t=localStorage.getItem("expenses-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");}catch(e){}
  ```
- Toutes les couleurs sont des variables CSS redéfinies dans un bloc `[data-theme="dark"] { --surface-base: ...; }` qui écrase les valeurs de `:root`. Aucune classe Tailwind `dark:`, aucun contexte React — uniquement des custom properties CSS.

## 1. Couleurs

### Neutres bruts (identiques dans les deux thèmes, servent de base)
```css
--white: #FFFFFF;
--off-white: #F2F2F7;
--grey-1: #E8E8ED;
--grey-2: #D8D8DE;
--grey-3: #C7C7CC;
--grey-4: #8E8E93;
--grey-5: #48484A;
--black: #000000;
```

### Mode clair (`:root`, valeurs par défaut)
| Rôle | Variable | Valeur |
|---|---|---|
| Fond principal | `--surface-base` | `#F2F2F7` (= `--off-white`) |
| Fond des cartes/surfaces | `--surface-raised` | `#F2F2F7` (identique au fond — le relief vient uniquement de l'ombre, pas d'une couleur différente) |
| Surface "active/sélectionnée" | `--surface-highlight` | `#FFFFFF` |
| Fond des éléments "enfoncés" | `--surface-inset` | `#F2F2F7` |
| Voile derrière une modale | `--surface-scrim` | `rgba(0, 0, 0, 0.18)` |
| Fond zone danger/erreur | `--surface-danger` | `#FFEBEA` |
| Texte principal | `--text-primary` | `#000000` |
| Texte secondaire | `--text-secondary` | `#48484A` (= `--grey-5`) |
| Texte tertiaire/atténué | `--text-tertiary` | `#8E8E93` (= `--grey-4`) |
| Texte inversé (sur fond sombre/accent) | `--text-inverse` | `#FFFFFF` |
| Texte dépense | `--text-expense` | `#FF3B30` |
| Texte revenu | `--text-income` | `#34C759` |
| Icône principale | `--icon-primary` | `#000000` |
| Icône secondaire | `--icon-secondary` | `#8E8E93` |
| Séparateur fin | `--separator` | `rgba(0, 0, 0, 0.06)` |
| Ligne de contour | `--hairline` | `rgba(0, 0, 0, 0.10)` |
| **Accent (fond de bouton primaire)** | `--accent-bg` | `#000000` (noir) |
| **Accent (texte sur bouton primaire)** | `--accent-text` | `#FFFFFF` |
| Rouge sémantique | `--red` | `#FF3B30` |
| Vert sémantique | `--green` | `#34C759` |

### Mode sombre (`[data-theme="dark"]`, écrase les valeurs ci-dessus)
| Rôle | Variable | Valeur |
|---|---|---|
| Fond principal | `--surface-base` | `#1C1C1E` |
| Fond des cartes/surfaces | `--surface-raised` | `#1C1C1E` |
| Surface "active/sélectionnée" | `--surface-highlight` | `#2C2C2E` |
| Fond des éléments "enfoncés" | `--surface-inset` | `#1C1C1E` |
| Voile derrière une modale | `--surface-scrim` | `rgba(0, 0, 0, 0.55)` |
| Fond zone danger/erreur | `--surface-danger` | `rgba(255, 69, 58, 0.15)` |
| Texte principal | `--text-primary` | `#FFFFFF` |
| Texte secondaire | `--text-secondary` | `#C7C7CC` |
| Texte tertiaire/atténué | `--text-tertiary` | `#8E8E93` |
| Texte inversé | `--text-inverse` | `#0A0A0A` |
| Texte dépense | `--text-expense` | `#FF453A` |
| Texte revenu | `--text-income` | `#32D74B` |
| Icône principale | `--icon-primary` | `#FFFFFF` |
| Icône secondaire | `--icon-secondary` | `#8E8E93` |
| Séparateur fin | `--separator` | `rgba(255, 255, 255, 0.08)` |
| Ligne de contour | `--hairline` | `rgba(255, 255, 255, 0.12)` |
| **Accent (fond de bouton primaire)** | `--accent-bg` | `#FFFFFF` (blanc — s'inverse par rapport au clair) |
| **Accent (texte sur bouton primaire)** | `--accent-text` | `#0A0A0A` |
| Rouge sémantique | `--red` | `#FF453A` |
| Vert sémantique | `--green` | `#32D74B` |

### Sources lumineuses néomorphiques (le cœur de l'effet — voir section 2)
| Variable | Clair | Sombre |
|---|---|---|
| `--light-source` | `rgba(255, 255, 255, 0.90)` | `rgba(255, 255, 255, 0.045)` |
| `--light-source-strong` | `rgba(255, 255, 255, 1)` | `rgba(255, 255, 255, 0.07)` |
| `--dark-source` | `rgba(0, 0, 0, 0.10)` | `rgba(0, 0, 0, 0.55)` |
| `--dark-source-strong` | `rgba(0, 0, 0, 0.16)` | `rgba(0, 0, 0, 0.7)` |

## 2. Recette exacte du néomorphisme

Principe : la surface (`--surface-raised`/`--surface-inset`) a **la même couleur** que le fond — l'effet de relief vient **uniquement** de deux ombres portées superposées : une claire en haut-gauche, une foncée en bas-droite (relief qui "sort") ou l'inverse en `inset` (relief qui "rentre").

### Élévations (`box-shadow` complet, copier-coller direct)
```css
--elev-flat: none;

/* EN RELIEF (sort de la surface) */
--elev-raised-sm: 3px 3px 8px var(--dark-source), -3px -3px 8px var(--light-source);
--elev-raised:    6px 6px 14px var(--dark-source), -5px -5px 12px var(--light-source);
--elev-raised-lg: 10px 10px 22px var(--dark-source-strong), -8px -8px 18px var(--light-source-strong);

/* ENFONCÉ / ACTIF (rentre dans la surface — état "pressé" ou "sélectionné creusé") */
--elev-inset-sm: inset 2px 2px 5px var(--dark-source), inset -2px -2px 5px var(--light-source);
--elev-inset:    inset 4px 4px 10px var(--dark-source), inset -3px -3px 8px var(--light-source);
--elev-press:    inset 3px 3px 7px var(--dark-source), inset -2px -2px 6px var(--light-source);

/* Ombre de feuille modale (bas d'écran), pas neumorphique — un vrai drop-shadow classique */
--elev-overlay: 0 -2px 24px rgba(0, 0, 0, 0.10), 0 -12px 48px rgba(0, 0, 0, 0.06);
```

**Usage type** :
- Une carte "posée" sur le fond → `background: var(--surface-raised); box-shadow: var(--elev-raised-sm);`
- Un bouton/segment "actif" ou "sélectionné" dans un sélecteur → `background: var(--surface-highlight); box-shadow: var(--elev-raised-sm);` (il "sort" pour signaler qu'il est choisi)
- Une piste de fond (ex. conteneur d'un sélecteur, d'une barre de navigation) → `background: var(--surface-inset); box-shadow: var(--elev-inset);` (elle est "creusée")
- Un input de formulaire → `background: var(--surface-inset); box-shadow: var(--elev-inset-sm);`

### Border-radius standard
```css
--radius-xs: 10px;      /* petits badges */
--radius-sm: 12px;      /* icônes, petites pastilles */
--radius-md: 14px;
--radius-control: 16px; /* champs de formulaire, boutons standards */
--radius-lg: 20px;      /* cartes, feuilles de sélection (TopSheet) */
--radius-card: 24px;
--radius-xl: 28px;      /* grande feuille modale (bottom sheet) */
--radius-round: 999px;  /* pilules, boutons ronds, barre de navigation */
```

## 3. Typographie

**Police** : système natif Apple en priorité, avec repli sur Inter (chargée depuis Google Fonts) :
```css
--font-core: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif;
--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
--font-numeric: var(--font-display);
```
Import Google Fonts (utilisé seulement si SF Pro indisponible, ex. hors iOS) :
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
```

**Graisses**
```css
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

**Échelle de tailles**
```css
--size-balance: 56px;   /* le très grand chiffre de solde */
--size-display: 40px;   /* gros montants secondaires */
--size-title-1: 28px;   /* titre d'écran ("Réglages", date du jour) */
--size-title-2: 22px;
--size-title-3: 20px;
--size-headline: 17px;
--size-body: 17px;      /* texte courant */
--size-callout: 16px;
--size-subhead: 15px;   /* labels de champs, boutons */
--size-footnote: 13px;  /* texte secondaire, sous-titres de liste */
--size-caption: 12px;   /* labels de section MAJUSCULES */
```

**Interlignage et tracking (letter-spacing)**
```css
--leading-tight: 1.06; --leading-snug: 1.22; --leading-normal: 1.4; --leading-relaxed: 1.5;
--tracking-balance: -0.03em; --tracking-display: -0.026em; --tracking-title: -0.02em;
--tracking-body: -0.01em; --tracking-caption: 0em;
```

**Styles composés prêts à l'emploi** (raccourci CSS `font` shorthand : `graisse taille/interligne police`)
```css
--text-balance-font:   var(--weight-semibold) var(--size-balance)/var(--leading-tight) var(--font-numeric);
--text-display-font:   var(--weight-semibold) var(--size-display)/var(--leading-tight) var(--font-display);
--text-title-font:     var(--weight-semibold) var(--size-title-2)/var(--leading-snug) var(--font-display);
--text-headline-font:  var(--weight-semibold) var(--size-headline)/var(--leading-normal) var(--font-core);
--text-body-font:      var(--weight-regular) var(--size-body)/var(--leading-relaxed) var(--font-core);
--text-caption-font:   var(--weight-medium) var(--size-caption)/var(--leading-normal) var(--font-core);
```
Les nombres (montants) utilisent en plus `font-variant-numeric: tabular-nums;` (classe `.ds-tabular`) pour un alignement en colonnes des chiffres.

## 4. Espacements

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;

--gutter-screen: 20px;  /* marge horizontale de l'écran */
--gap-list: 12px;       /* espace entre lignes de liste */
--gap-section: 32px;    /* espace entre grandes sections */
--hit-min: 44px;        /* zone tactile minimale (norme Apple) */
```

## 5. Animations / transitions

```css
--duration-micro: 150ms;  /* survol/pression instantanée */
--duration-base: 200ms;   /* transitions standard (couleur, fond, ombre) */
--duration-slow: 250ms;   /* apparitions de feuilles modales */

--ease-standard: cubic-bezier(0.33, 0, 0.15, 1);  /* la courbe par défaut, quasi partout */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);         /* courbe "rebond doux", utilisée pour l'entrée des feuilles modales */

--press-scale: 0.985;  /* échelle appliquée au tap (léger enfoncement) */

--transition-tactile: box-shadow var(--duration-micro) var(--ease-standard),
                       transform var(--duration-micro) var(--ease-standard);
```

**Animations nommées notables** (définies en `@keyframes` directement dans les composants, pas dans le fichier de tokens) :
- **Apparition d'une feuille du bas (bottom sheet)** :
  ```css
  @keyframes sheetIn { from { opacity: 0; transform: scale(0.85) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  /* appliqué avec : animation: sheetIn 0.28s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; */
  ```
- **Apparition d'une feuille du haut (sélecteurs, filtres)** :
  ```css
  @keyframes topSheetIn { from { opacity: 0; transform: scale(0.92) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  /* appliqué avec : animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; */
  ```
  (Note : ces deux animations utilisent une courbe légèrement différente de `--ease-out`, `cubic-bezier(0.32, 0.72, 0, 1)`, propre à l'effet d'entrée des modales — à retenir comme une troisième courbe si tu veux être fidèle à 100 %.)
- **Barre de navigation (segment actif qui s'étire pour révéler son libellé)** : transition sur `max-width`, `opacity`, `padding` et `background`, avec `var(--duration-base) var(--ease-standard)` pour le fond/padding et `var(--duration-micro) var(--ease-standard)` pour l'apparition du texte.
- **Élément pressé (listes, lignes cliquables)** : `opacity: 0.55` pendant l'appui (`onPointerDown`/`onPointerUp`), transition `opacity var(--duration-micro) var(--ease-standard)`.

## 6. Autres réglages globaux utiles à répliquer

```css
* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0; width: 100%; height: 100%;
  position: fixed; overflow: hidden; overscroll-behavior: none;
  touch-action: manipulation; -webkit-text-size-adjust: 100%;
}
body {
  background: var(--surface-base); color: var(--text-primary);
  font: var(--text-body-font); letter-spacing: var(--tracking-body);
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  transition: background var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard);
}
/* Le vrai contenu défile dans ce conteneur, pas dans body (empêche tout rebond élastique iOS) */
#__next { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }

::-webkit-scrollbar { display: none; } /* barres de défilement invisibles partout */
```
Unités d'écran utilisées : `dvh` (dynamic viewport height) plutôt que `vh` sur les feuilles modales et écrans plein écran — évite les sauts de mise en page quand le clavier iOS ou la barre Safari apparaît/disparaît.
