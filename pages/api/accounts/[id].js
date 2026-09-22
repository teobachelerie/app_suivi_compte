import { getUserId } from "../../../lib/db";
import { updateAccountBank } from "../../../lib/meta";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  const { id } = req.query;
  try {
    if (req.method === "PATCH") {
      const { bankId } = req.body;
      await updateAccountBank(userId, id, bankId);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", ["PATCH"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
