import { getSchema, updateSelectOptions } from "../../lib/notion";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const schema = await getSchema();
      return res.status(200).json(schema);
    }
    if (req.method === "PATCH") {
      const { property, options } = req.body;
      await updateSelectOptions(property, options);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", ["GET", "PATCH"]);
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
