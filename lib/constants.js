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
