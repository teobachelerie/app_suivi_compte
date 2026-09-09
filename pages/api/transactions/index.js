import { queryTransactions, createTransaction, getUserId } from "../../../lib/supabase";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  try {
    if (req.method === "GET") {
      const txs = await queryTransactions(userId);
      return res.status(200).json(txs);
    }
    if (req.method === "POST") {
      const tx = await createTransaction(userId, req.body);
      return res.status(200).json(tx);
    }
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
