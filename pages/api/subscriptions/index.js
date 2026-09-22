import { getUserId } from "../../../lib/db";
import { listSubscriptions, createSubscription } from "../../../lib/subscriptions";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  try {
    if (req.method === "GET") {
      const subs = await listSubscriptions(userId);
      return res.status(200).json(subs);
    }
    if (req.method === "POST") {
      const created = await createSubscription(userId, req.body);
      return res.status(200).json(created);
    }
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
