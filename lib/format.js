import { MONTHS_FR, MONTHS_SHORT_FR } from "./constants";

// Date du jour affichée en haut de l'onglet Aperçu — capitalisée, en français.
export function fmtTodayHeader() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(now);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(now);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return { weekday: cap(weekday), dateLabel: cap(dateLabel) };
}

// Nombre de mois pleins entre aujourd'hui et une date cible (jamais moins de 1, pour éviter une
// division par zéro si la date cible est aujourd'hui ou dépassée).
export function monthsUntil(targetDateStr) {
  const today = new Date();
  const target = parseDate(targetDateStr);
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(1, months);
}

// Versement mensuel nécessaire pour atteindre un objectif — jamais négatif (objectif déjà atteint).
export function requiredMonthly(targetAmount, currentBalance, targetDateStr) {
  const remaining = Math.max(0, targetAmount - currentBalance);
  return remaining / monthsUntil(targetDateStr);
}

export function fmtEUR(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}
export function parseDate(d) { return new Date(d + "T00:00:00"); }
export function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function fmtDateHeader(d) {
  const date = parseDate(d);
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()].toUpperCase()} ${date.getFullYear()}`;
}
export function periodLabel(period, type) {
  const verb = type === "Gain" ? "Reçu" : "Dépensé";
  switch (period) {
    case "1 semaine": return `${verb} cette semaine`;
    case "1 mois": return `${verb} ce mois-ci`;
    case "3 mois": return `${verb} sur 3 mois`;
    case "6 mois": return `${verb} sur 6 mois`;
    case "12 mois": return `${verb} sur 12 mois`;
    default: return `${verb} depuis toujours`;
  }
}
export function getRangeStart(period, latest) {
  const d = new Date(latest);
  if (period === "1 semaine") { d.setDate(d.getDate() - 6); return d; }
  if (period === "1 mois") { d.setDate(d.getDate() - 29); return d; }
  if (period === "3 mois") { d.setMonth(d.getMonth() - 3); d.setDate(d.getDate() + 1); return d; }
  if (period === "6 mois") { d.setMonth(d.getMonth() - 6); return d; }
  if (period === "12 mois") { d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}
export function granularityFor(period) {
  if (period === "1 semaine" || period === "1 mois" || period === "3 mois") return "day";
  if (period === "6 mois" || period === "12 mois") return "month";
  return "year";
}
export function buildChart(transactions, period, latestDate, type) {
  if (!latestDate) return [];
  const latest = parseDate(latestDate);
  const start = getRangeStart(period, latest);
  const gran = granularityFor(period);
  const inRange = transactions.filter((t) => {
    if (t.type !== type) return false;
    if (!start) return true;
    const dt = parseDate(t.date);
    return dt >= start && dt <= latest;
  });
  if (gran === "day") {
    const buckets = {};
    const cursor = new Date(start);
    while (cursor <= latest) { buckets[toLocalISODate(cursor)] = 0; cursor.setDate(cursor.getDate() + 1); }
    inRange.forEach((t) => { if (buckets[t.date] != null) buckets[t.date] += t.amount; });
    return Object.entries(buckets).map(([key, value]) => ({ name: String(parseDate(key).getDate()), value: Math.round(value * 100) / 100, dateKey: key, granularity: "day" }));
  }
  if (gran === "month") {
    const buckets = {};
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(latest.getFullYear(), latest.getMonth(), 1);
    while (cursor <= end) { buckets[`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`] = 0; cursor.setMonth(cursor.getMonth() + 1); }
    inRange.forEach((t) => { const key = t.date.slice(0, 7); if (buckets[key] != null) buckets[key] += t.amount; });
    return Object.entries(buckets).map(([key, value]) => ({ name: MONTHS_SHORT_FR[parseInt(key.slice(5, 7), 10) - 1], value: Math.round(value * 100) / 100, dateKey: key, granularity: "month" }));
  }
  const buckets = {};
  inRange.forEach((t) => { const y = t.date.slice(0, 4); buckets[y] = (buckets[y] || 0) + t.amount; });
  return Object.keys(buckets).sort().map((y) => ({ name: y, value: Math.round(buckets[y] * 100) / 100, dateKey: y, granularity: "year" }));
}
export function tickInterval(length) {
  if (length <= 10) return 0;
  if (length <= 45) return 1;
  return Math.ceil(length / 20);
}
export function buildFlowChart(transactions, period, latestDate) {
  if (!latestDate) return [];
  const latest = parseDate(latestDate);
  const start = getRangeStart(period, latest);
  const gran = granularityFor(period);
  const inRange = transactions.filter((t) => {
    if (!start) return true;
    const dt = parseDate(t.date);
    return dt >= start && dt <= latest;
  });
  const buckets = {};
  const order = [];
  function ensure(key) { if (!(key in buckets)) { buckets[key] = { income: 0, expense: 0 }; order.push(key); } }
  function add(key, t) {
    if (!(key in buckets)) return;
    if (t.type === "Gain") buckets[key].income += t.amount;
    else buckets[key].expense += t.amount;
  }
  if (gran === "day") {
    const cursor = new Date(start);
    while (cursor <= latest) { ensure(toLocalISODate(cursor)); cursor.setDate(cursor.getDate() + 1); }
    inRange.forEach((t) => add(t.date, t));
    return order.map((key) => ({ name: String(parseDate(key).getDate()), income: Math.round(buckets[key].income * 100) / 100, expense: -Math.round(buckets[key].expense * 100) / 100 }));
  }
  if (gran === "month") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(latest.getFullYear(), latest.getMonth(), 1);
    while (cursor <= end) { ensure(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`); cursor.setMonth(cursor.getMonth() + 1); }
    inRange.forEach((t) => add(t.date.slice(0, 7), t));
    return order.map((key) => ({ name: MONTHS_SHORT_FR[parseInt(key.slice(5, 7), 10) - 1], income: Math.round(buckets[key].income * 100) / 100, expense: -Math.round(buckets[key].expense * 100) / 100 }));
  }
  inRange.forEach((t) => { ensure(t.date.slice(0, 4)); add(t.date.slice(0, 4), t); });
  return order.sort().map((y) => ({ name: y, income: Math.round(buckets[y].income * 100) / 100, expense: -Math.round(buckets[y].expense * 100) / 100 }));
}
export function fmtBucketLabel(dateKey, granularity) {
  if (granularity === "day") {
    const d = parseDate(dateKey);
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (granularity === "month") {
    const [y, m] = dateKey.split("-");
    return `${MONTHS_FR[parseInt(m, 10) - 1]} ${y}`;
  }
  return dateKey;
}
export function inPeriod(t, period, latestDate) {
  if (period === "Depuis toujours" || !latestDate) return true;
  const start = getRangeStart(period, parseDate(latestDate));
  const dt = parseDate(t.date);
  return dt >= start && dt <= parseDate(latestDate);
}
