import { parseDate, toLocalISODate, getRangeStart } from "./format";

// ---------------------------------------------------------------------------------------------
// Fonctions pures (aucun accès réseau ni DOM) : faciles à tester, utilisées côté interface.
// ---------------------------------------------------------------------------------------------

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Clé de regroupement d'un titre : "iCloud 200 Go", "iCloud 50 Go" et "iCloud" partagent la même
// clé (premier mot significatif, sans chiffres ni accents ni ponctuation), pour qu'un changement
// de forfait ou de libellé ne casse pas la détection d'une même récurrence.
export function recurringKey(title) {
  const base = stripAccents(String(title || "").toLowerCase())
    .replace(/\(.*?\)/g, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  const first = base.split(" ")[0];
  return first.length >= 3 ? first : base;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// Deux clés "presque identiques" (une faute de frappe : "premier" / "premiere") sont fusionnées,
// seulement au-delà de 5 lettres pour ne pas confondre des mots courts réellement différents.
function sameKey(a, b) {
  if (a === b) return true;
  // Une faute de frappe change la longueur d'une lettre au plus : inutile de calculer la distance
  // entre des mots de longueurs très différentes (garde le calcul rapide avec un long historique).
  return a.length >= 5 && b.length >= 5 && Math.abs(a.length - b.length) <= 1 && levenshtein(a, b) <= 1;
}

function median(nums) {
  const s = [...nums].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mode(values) {
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = null;
  let bestN = 0;
  counts.forEach((n, v) => { if (n > bestN) { best = v; bestN = n; } });
  return best;
}

const monthIndex = (isoDate) => parseInt(isoDate.slice(0, 4), 10) * 12 + (parseInt(isoDate.slice(5, 7), 10) - 1);

// Repère les dépenses qui reviennent chaque mois à peu près au même montant et qui ne sont pas
// déjà suivies comme abonnement. Volontairement prudent (mieux vaut rater une récurrence que
// suggérer des dépenses variables comme des courses) :
//  - au moins 3 mois distincts, avec très majoritairement des mois consécutifs ;
//  - encore actif (dernière occurrence ce mois-ci ou le mois dernier) ;
//  - pas plus d'une occurrence par mois en moyenne (sinon c'est un achat fréquent, pas un abonnement) ;
//  - les 3 derniers montants stables (à ±25 % près) — le montant suggéré est le tarif actuel.
export function detectRecurring(transactions, { subscriptions = [], dismissed = [], today = new Date() } = {}) {
  const candidates = transactions.filter((t) => t.type === "Dépense" && t.category && t.compte && recurringKey(t.title));

  // Regroupement par clé, avec fusion des clés quasi identiques.
  const clusters = [];
  const sorted = [...candidates].sort((a, b) => {
    const ka = recurringKey(a.title), kb = recurringKey(b.title);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  sorted.forEach((t) => {
    const key = recurringKey(t.title);
    // Triées par clé : les transactions de même clé se suivent, donc le dernier groupe suffit dans
    // l'immense majorité des cas, sans parcourir tous les groupes à chaque transaction.
    const last = clusters[clusters.length - 1];
    const cluster = last && last.key === key ? last : clusters.find((c) => sameKey(c.key, key));
    if (cluster) cluster.txs.push(t);
    else clusters.push({ key, txs: [t] });
  });

  const currentIdx = today.getFullYear() * 12 + today.getMonth();
  const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const existingKeys = subscriptions.map((s) => recurringKey(s.title)).filter(Boolean);
  const dismissedSet = new Set(dismissed);

  const out = [];
  clusters.forEach(({ key, txs }) => {
    if (dismissedSet.has(key)) return;
    if (existingKeys.some((k) => sameKey(k, key))) return;

    const byDate = [...txs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const months = [...new Set(byDate.map((t) => monthIndex(t.date)))].sort((a, b) => a - b);
    if (months.length < 3) return;
    if (byDate.length > months.length * 1.3) return; // plusieurs achats par mois : pas un abonnement

    const gaps = months.slice(1).map((m, i) => m - months[i]);
    if (gaps.filter((g) => g === 1).length / gaps.length < 0.66) return; // pas assez régulier
    if (months[months.length - 1] < currentIdx - 1) return; // arrêté depuis plus d'un mois

    const recent = byDate.slice(-3);
    const recentAmounts = recent.map((t) => t.amount);
    const amount = median(recentAmounts);
    if (!(amount > 0)) return;
    if ((Math.max(...recentAmounts) - Math.min(...recentAmounts)) / amount > 0.25) return; // montants trop variables

    const last = byDate[byDate.length - 1];
    const days = recent.map((t) => parseInt(t.date.slice(8, 10), 10));
    out.push({
      key,
      title: last.title,
      amount: Math.round(amount * 100) / 100,
      billingDay: Math.min(28, Math.round(median(days))),
      category: mode(byDate.map((t) => t.category)),
      compte: mode(byDate.map((t) => t.compte)),
      payment: mode(byDate.map((t) => t.payment).filter(Boolean)) || "Carte bancaire",
      occurrences: byDate.length,
      lastDate: last.date,
      // Une dépense correspondante existe déjà ce mois-ci : la création de l'abonnement ne doit pas
      // en générer une seconde (sinon doublon) — voir skipCurrentMonth dans lib/subscriptions.js.
      hasThisMonth: byDate.some((t) => t.date.startsWith(currentYm)),
    });
  });

  return out.sort((a, b) => b.amount - a.amount);
}

// --- Plafonds de budget ------------------------------------------------------------------------

// Renvoie une fonction nom de catégorie -> nom de sa famille (elle-même si elle n'a pas de parent).
export function familyResolver(categories) {
  const byName = new Map(categories.map((c) => [c.name, c]));
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (name) => {
    const c = byName.get(name);
    if (!c) return name;
    const parent = c.parent_id ? byId.get(c.parent_id) : null;
    return parent ? parent.name : name;
  };
}

// Dépenses du mois calendaire de refDate, regroupées par famille, sur tous les comptes (un plafond
// "Alimentation" concerne l'ensemble de ce que tu dépenses en alimentation, quel que soit le compte).
export function monthSpendByFamily(transactions, categories, refDate = new Date()) {
  const resolve = familyResolver(categories);
  const ym = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}`;
  const totals = {};
  transactions.forEach((t) => {
    if (t.type !== "Dépense" || !t.date.startsWith(ym)) return;
    const parts = t.splits?.length ? t.splits : [{ category: t.category, amount: t.amount }];
    parts.forEach((p) => {
      const fam = resolve(p.category);
      totals[fam] = (totals[fam] || 0) + p.amount;
    });
  });
  return totals;
}

export function budgetStatus(spent, limit) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const state = pct >= 100 ? "over" : pct >= 80 ? "warning" : "ok";
  return { pct, state, remaining: limit - spent };
}

// Seuil franchi entre deux états de dépense ("warning" = 80 %, "over" = 100 %) — sert à n'alerter
// qu'au moment précis où on bascule, jamais à chaque ajout suivant.
export function crossedThreshold(before, after, limit) {
  if (!(limit > 0)) return null;
  if (before < limit && after >= limit) return "over";
  if (before < limit * 0.8 && after >= limit * 0.8 && after < limit) return "warning";
  return null;
}

// --- Comparaison avec la période précédente ---------------------------------------------------

// Fenêtre de même durée juste avant la période courante. Les périodes de l'app sont des fenêtres
// glissantes qui se terminent à la dernière transaction (pas des mois calendaires) : on compare donc
// à la fenêtre équivalente qui précède, jamais à un mois entier, ce qui fausserait la comparaison.
export function previousWindow(period, latestDate) {
  if (!latestDate) return null;
  const start = getRangeStart(period, parseDate(latestDate));
  if (!start) return null; // "Depuis toujours" : rien à comparer
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = getRangeStart(period, prevEnd);
  return { start: toLocalISODate(prevStart), end: toLocalISODate(prevEnd) };
}

export const COMPARE_LABEL = {
  "1 semaine": "vs semaine précédente",
  "1 mois": "vs mois précédent",
  "3 mois": "vs 3 mois précédents",
  "6 mois": "vs 6 mois précédents",
  "12 mois": "vs 12 mois précédents",
};

// Variation en % entre deux montants, ou null si la période précédente est vide (division par zéro
// ou pourcentage absurde : mieux vaut ne rien afficher).
export function percentChange(current, previous) {
  if (!(previous > 0)) return null;
  return ((current - previous) / previous) * 100;
}
