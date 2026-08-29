import { queryTransactions, createTransaction } from "../../../lib/notion";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const txs = await queryTransactions();
      return res.status(200).json(txs);
    }
    if (req.method === "POST") {
      const tx = await createTransaction(req.body);
      return res.status(200).json(tx);
    }
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
