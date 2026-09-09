import { getSchema, updateSelectOptions, getUserId } from "../../lib/supabase";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  try {
    if (req.method === "GET") {
      const schema = await getSchema(userId);
      return res.status(200).json(schema);
    }
    if (req.method === "PATCH") {
      const { property, options } = req.body;
      await updateSelectOptions(userId, property, options);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", ["GET", "PATCH"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
