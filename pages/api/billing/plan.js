import { getUserId, getUserPlan } from "../../../lib/supabase";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  if (req.method !== "GET") { res.setHeader("Allow", ["GET"]); return res.status(405).end(); }
  try {
    const plan = await getUserPlan(userId);
    return res.status(200).json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
