import { getUserId } from "../../../lib/db";
import { listBudgets, upsertBudget } from "../../../lib/budgets";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  try {
    if (req.method === "GET") return res.status(200).json(await listBudgets(userId));
    if (req.method === "POST") return res.status(200).json(await upsertBudget(userId, req.body || {}));
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
