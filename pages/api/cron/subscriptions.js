import { generateDueSubscriptionTransactions } from "../../../lib/supabase";

// "Aujourd'hui" au sens du calendrier français, indépendamment du fuseau horaire du serveur
// (les fonctions Vercel tournent en UTC).
function todayInParis() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

export default async function handler(req, res) {
  // Vercel Cron ajoute automatiquement cet en-tête quand CRON_SECRET est défini en variable
  // d'environnement — empêche n'importe qui de déclencher cette route à la main.
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Non autorisé." });
  }
  try {
    const created = await generateDueSubscriptionTransactions(todayInParis());
    return res.status(200).json({ ok: true, created });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
