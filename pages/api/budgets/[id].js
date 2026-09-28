import { getUserId } from "../../../lib/db";
import { deleteBudget } from "../../../lib/budgets";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  const { id } = req.query;
  try {
    if (req.method === "DELETE") { await deleteBudget(userId, id); return res.status(200).json({ ok: true }); }
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
