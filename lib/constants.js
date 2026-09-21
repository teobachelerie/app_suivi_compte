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

// Couleurs d'accent approximatives par banque — teinte de personnalisation, pas reproduction de
// marque (pas de logo). Volontairement limité à la couleur : voir la discussion sur les risques
// de marque avant d'envisager d'ajouter des logos un jour.
export const BANK_PRESETS = [
  { id: "societe-generale", name: "Société Générale", primary: "#E31E24", secondary: "#1A1A1A" },
  { id: "trade-republic", name: "Trade Republic", primary: "#000000", secondary: "#3A3A3C" },
  { id: "boursorama", name: "Boursorama", primary: "#EC008C", secondary: "#1B2A4A" },
  { id: "bnp-paribas", name: "BNP Paribas", primary: "#00915A", secondary: "#00A651" },
  { id: "credit-agricole", name: "Crédit Agricole", primary: "#00A651", secondary: "#004B23" },
  { id: "banque-postale", name: "La Banque Postale", primary: "#FFCC00", secondary: "#003366" },
  { id: "lcl", name: "LCL", primary: "#004B87", secondary: "#B7935B" },
  { id: "caisse-epargne", name: "Caisse d'Épargne", primary: "#E2001A", secondary: "#4A2E83" },
  { id: "revolut", name: "Revolut", primary: "#0666EB", secondary: "#000000" },
  { id: "n26", name: "N26", primary: "#00847A", secondary: "#36455D" },
];

// Limites par palier — la seule source de vérité, utilisée à la fois pour bloquer côté serveur
// (lib/supabase.js) et pour afficher le tableau comparatif côté app (ReglagesScreen). Placé ici
// (pas dans lib/supabase.js, qui crée un client Supabase avec la clé service_role) pour rester
// importable sans risque depuis un composant affiché dans le navigateur.
export const TIER_LIMITS = {
  amateur: { label: "Amateur", price: 0, accounts: 1, goals: 1, exportMonths: 3, customColors: false, autoRules: false },
  confirme: { label: "Confirmé", price: 4.99, accounts: 5, goals: 3, exportMonths: null, customColors: true, autoRules: true },
  investisseur: { label: "Investisseur", price: 8.99, accounts: null, goals: null, exportMonths: null, customColors: true, autoRules: true },
};

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
