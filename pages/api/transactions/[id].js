import { updateTransaction, deleteTransaction } from "../../../lib/notion";

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    if (req.method === "PATCH") {
      const tx = await updateTransaction(id, req.body);
      return res.status(200).json(tx);
    }
    if (req.method === "DELETE") {
      await deleteTransaction(id);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", ["PATCH", "DELETE"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
