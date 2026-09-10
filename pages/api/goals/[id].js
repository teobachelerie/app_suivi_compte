import { getUserId, updateGoal, deleteGoal } from "../../../lib/supabase";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  const { id } = req.query;
  try {
    if (req.method === "PATCH") return res.status(200).json(await updateGoal(userId, id, req.body));
    if (req.method === "DELETE") { await deleteGoal(userId, id); return res.status(200).json({ ok: true }); }
    res.setHeader("Allow", ["PATCH", "DELETE"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
