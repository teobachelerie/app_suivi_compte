// Données FICTIVES pour les captures. Aucune donnée réelle de Téo ni de ses amis.
import fs from "node:fs";

export const TODAY = "2026-10-16"; // date figée dans le navigateur (vendredi)
export const USER = { id: "00000000-0000-4000-8000-000000000001", email: "demo@example.test" };

export function loadTaxonomy(repo) {
  const sql = fs.readFileSync(`${repo}/supabase/migration-016-taxonomie-v2.sql`, "utf8");
  const m = sql.match(/taxonomy jsonb := '(\[.*\])'::jsonb;/);
  return JSON.parse(m[1].replace(/''/g, "'"));
}

export function buildMeta(repo) {
  const tax = loadTaxonomy(repo);
  const categories = [];
  let n = 1;
  for (const fam of tax) {
    const famId = `cat-${n++}`;
    categories.push({ id: famId, name: fam.label, color: null, parent_id: null, tier: fam.tier, icon: fam.icon, is_fallback: false });
    for (const sub of fam.subcategories) {
      categories.push({ id: `cat-${n++}`, name: sub.label, color: null, parent_id: famId, tier: sub.tier, icon: sub.icon, is_fallback: false });
    }
  }
  const accounts = [
    { id: "acc-1", name: "Compte courant", bank_id: "societe-generale" },
    { id: "acc-2", name: "Compte pro", bank_id: "boursorama" },
    { id: "acc-3", name: "Livret A", bank_id: "caisse-epargne" },
    { id: "acc-4", name: "PEA", bank_id: "trade-republic" },
  ];
  const payments = ["Carte bancaire", "Virement", "Liquide"];
  return {
    categories, accounts, payments,
    categoryNames: categories.map((c) => c.name).join(","),
    categoryFamilies: categories.filter((c) => !c.parent_id).map((c) => c.name).join(","),
    categorySubcategoriesByFamily: "{}",
    accountNames: accounts.map((a) => a.name).join(","),
    paymentNames: payments.join(","),
  };
}

let seq = 1;
function tx(date, title, amount, category, compte, extra = {}) {
  return {
    id: `tx-${seq++}`, title, amount, date, category, type: extra.type || "Dépense", compte,
    compteDestination: extra.to || null, payment: extra.payment || "Carte bancaire",
    tags: extra.tags || [], splits: extra.splits || null, emoji: null, notes: extra.notes || null,
  };
}

export function buildTransactions() {
  seq = 1;
  const t = [];
  const months = [["2026-07", 31], ["2026-08", 31], ["2026-09", 30], ["2026-10", 16]];
  for (const [ym, last] of months) {
    const d = (day) => `${ym}-${String(Math.min(day, last)).padStart(2, "0")}`;
    if (ym !== "2026-10") t.push(tx(d(28), "Salaire", 2150, "Salaire", "Compte courant", { type: "Gain", payment: "Virement" }));
    t.push(tx(d(3), "Loyer", 720, "Loyer / Crédit immobilier", "Compte courant", { payment: "Virement" }));
    t.push(tx(d(5), "Box internet", 29.99, "Internet / Téléphone", "Compte courant", { payment: "Virement" }));
    t.push(tx(d(7), "Netflix", 13.49, "Abonnements streaming", "Compte courant"));
    t.push(tx(d(8), "Spotify", 10.99, "Abonnements streaming", "Compte courant"));
    t.push(tx(d(2), "Courses du week-end", 64.2, "Courses", "Compte courant", { tags: ["maison"] }));
    t.push(tx(d(9), "Courses", 41.75, "Courses", "Compte courant"));
    t.push(tx(d(14), "Courses", 78.1, "Courses", "Compte courant"));
    t.push(tx(d(4), "Pizzeria", 23.5, "Restaurants", "Compte courant", { tags: ["amis"] }));
    t.push(tx(d(12), "Boulangerie", 4.8, "Boulangerie", "Compte courant", { payment: "Liquide" }));
    t.push(tx(d(6), "Pass transports", 86.4, "Transports en commun", "Compte courant"));
    t.push(tx(d(11), "Plein d'essence", 58.3, "Essence / Carburant", "Compte courant"));
    t.push(tx(d(10), "Pharmacie", 12.9, "Pharmacie", "Compte courant"));
    t.push(tx(d(1), "Salle de sport", 29.9, "Sport / Salle de sport", "Compte courant"));
    t.push(tx(d(13), "T-shirt", 24.99, "Vêtements", "Compte courant"));
    t.push(tx(d(15), "Cinéma", 11.5, "Cinéma / Concerts", "Compte courant", { tags: ["sortie"] }));
    t.push(tx(d(20), "Mission montage vidéo", 450, "Freelance / Indépendant", "Compte pro", { type: "Gain", payment: "Virement" }));
    t.push(tx(d(21), "Abonnement logiciel de montage", 24, "Logiciels / Cloud", "Compte pro"));
    t.push(tx(d(29), "Virement épargne", 200, null, "Compte courant", { type: "Virement", to: "Livret A", payment: "Virement" }));
    t.push(tx(d(30), "Virement PEA", 150, null, "Compte courant", { type: "Virement", to: "PEA", payment: "Virement" }));
  }
  t.push(tx("2026-10-09", "Courses + produits ménagers", 52.4, "Courses", "Compte courant", {
    splits: [{ category: "Courses", amount: 38.4 }, { category: "Maison / Équipement", amount: 14 }],
  }));
  t.push(tx("2026-10-14", "Billet de train", 48, "Billets (avion, train)", "Compte courant", { notes: "Aller-retour week-end" }));
  t.push(tx("2026-10-15", "Mission montage vidéo", 600, "Freelance / Indépendant", "Compte pro", { type: "Gain", payment: "Virement" }));
  return t.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const SUBSCRIPTIONS = [
  { id: "sub-1", title: "Netflix", amount: 13.49, category: "Abonnements streaming", compte: "Compte courant", payment: "Carte bancaire", billingDay: 7, active: true },
  { id: "sub-2", title: "Spotify", amount: 10.99, category: "Abonnements streaming", compte: "Compte courant", payment: "Carte bancaire", billingDay: 8, active: true },
  { id: "sub-3", title: "Salle de sport", amount: 29.9, category: "Sport / Salle de sport", compte: "Compte courant", payment: "Carte bancaire", billingDay: 1, active: false },
];
export const GOALS = [
  { id: "goal-1", title: "Voyage au Japon", targetAmount: 3500, targetDate: "2027-06-01", compte: "Livret A" },
  { id: "goal-2", title: "Fonds d'urgence", targetAmount: 5000, targetDate: "2027-12-31", compte: "Livret A" },
];
export const BUDGETS = [
  { id: "bud-1", category: "Alimentation", monthlyLimit: 250 },
  { id: "bud-2", category: "Loisirs", monthlyLimit: 60 },
  { id: "bud-3", category: "Transport", monthlyLimit: 150 },
];
export const RULES = [{ id: "rule-1", keyword: "netflix", category: "Abonnements streaming" }];
export const PLAN = {
  tier: "investisseur",
  limits: { label: "Investisseur", price: 8.99, accounts: null, goals: null, exportMonths: null, customColors: true, autoRules: true },
  stripeStatus: null, cancelAtPeriodEnd: false, currentPeriodEnd: null, onboardingSeen: true,
};
export const API_KEYS = [{ id: "key-1", label: "iPhone", last_used_at: "2026-10-12T09:00:00Z", created_at: "2026-09-01T09:00:00Z" }];
