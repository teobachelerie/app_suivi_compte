import { getUserId } from "../../../lib/db";
import { importTransactions } from "../../../lib/transactions";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  const { transactions } = req.body || {};
  if (!Array.isArray(transactions)) return res.status(400).json({ error: "Format invalide : un tableau de transactions est attendu." });
  if (transactions.length === 0) return res.status(400).json({ error: "Le fichier ne contient aucune transaction." });
  if (transactions.length > 2000) return res.status(400).json({ error: "Trop de transactions en une fois (2000 maximum) — importe en plusieurs fois." });

  try {
    const result = await importTransactions(userId, transactions);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
