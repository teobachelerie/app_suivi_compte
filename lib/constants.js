import { ShoppingBag, UtensilsCrossed, Plane, RefreshCw, Gamepad2, Stethoscope, Fuel } from "lucide-react";

export const CATEGORY_ICON = {
  "Nourriture & Boissons": UtensilsCrossed,
  "Shopping": ShoppingBag,
  "Voyage": Plane,
  "Services": RefreshCw,
  "Loisirs": Gamepad2,
  "Santé": Stethoscope,
  "Transport": Fuel,
};

export const DEFAULT_PAYMENTS = ["Carte bancaire", "Virement", "Liquide"];

// Palette de secours pour les catégories sans couleur assignée manuellement — l'attribution est
// stable (toujours la même couleur pour une catégorie donnée) via categoryColor() dans lib/format.js.
export const DEFAULT_CATEGORY_PALETTE = [
  "#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#38D9A9",
  "#4DABF7", "#748FFC", "#9775FA", "#F783AC", "#CED4DA",
];
export const PERIODS = ["1 semaine", "1 mois", "3 mois", "6 mois", "12 mois", "Depuis toujours"];
export const DASHBOARD_LIMIT = 5;

export const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MONTHS_SHORT_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// Noms historiquement en dur pour distinguer "comptes principaux" et "livrets d'épargne".
// Utilisée une seule fois, à la première ouverture après la bascule vers l'id-based
// coreAccountIds, pour retrouver les identifiants correspondants — après quoi la
// classification suit ces identifiants et reste donc correcte même si l'un de ces comptes
// est renommé.
export const LEGACY_CORE_NAMES = ["Compte courant", "Compte pro"];

// Liens de partage iCloud des Raccourcis iOS préconstruits (générés une fois, mis à jour ici
// si les raccourcis sont republiés). Contiennent un texte factice à la place de la clé API —
// chaque personne colle la sienne après installation, voir components/ReglagesScreen.jsx.
export const SHORTCUT_URL_DEPENSE = "https://www.icloud.com/shortcuts/792c119dabcd4a2da50272165fb699fc";
export const SHORTCUT_URL_REVENU = "https://www.icloud.com/shortcuts/efb87ddec3824236b0bfc3308adb8b1f";
