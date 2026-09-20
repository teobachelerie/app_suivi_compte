import { timingSafeEqual } from "crypto";
import { generateDueSubscriptionTransactions } from "../../../lib/supabase";
import { todayInParis } from "../../../lib/format";

// "Aujourd'hui" au sens du calendrier français, indépendamment du fuseau horaire du serveur
// (les fonctions Vercel tournent en UTC).
// Comparaison à temps constant : une comparaison de chaînes classique (!==) s'arrête au premier
// caractère différent, ce qui peut en théorie renseigner un attaquant sur la longueur du temps
// de réponse selon le nombre de caractères corrects déjà devinés.
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  // Vercel Cron ajoute automatiquement cet en-tête quand CRON_SECRET est défini en variable
  // d'environnement — empêche n'importe qui de déclencher cette route à la main.
  const auth = req.headers.authorization || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || !safeEqual(auth, expected)) {
    return res.status(401).json({ error: "Non autorisé." });
  }
  try {
    const created = await generateDueSubscriptionTransactions(todayInParis());
    return res.status(200).json({ ok: true, created });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
