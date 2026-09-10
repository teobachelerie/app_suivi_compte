import { getUserId, listGoals, createGoal } from "../../../lib/supabase";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  try {
    if (req.method === "GET") return res.status(200).json(await listGoals(userId));
    if (req.method === "POST") return res.status(200).json(await createGoal(userId, req.body));
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
