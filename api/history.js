const { getDb, setCors } = require("./_db");

const MAX_HISTORY = 30;

function toClient(doc) {
  return { id: doc._id.toString(), exp: doc.exp, result: doc.result, createdAt: doc.createdAt };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const db = await getDb();
    const entries = db.collection("history");

    if (req.method === "GET") {
      const docs = await entries.find({}).sort({ createdAt: -1 }).limit(MAX_HISTORY).toArray();
      return res.status(200).json({ history: docs.map(toClient) });
    }

    if (req.method === "POST") {
      const { exp, result } = req.body || {};
      const cleanExp = String(exp || "").trim().slice(0, 120);
      const cleanResult = String(result || "").trim().slice(0, 40);
      if (!cleanExp || !cleanResult) return res.status(400).json({ error: "exp and result are required." });
      if (cleanResult === "Error") return res.status(400).json({ error: "Error results are not saved." });

      const doc = { exp: cleanExp, result: cleanResult, createdAt: new Date().toISOString() };
      const insert = await entries.insertOne(doc);

      // keep only the newest MAX_HISTORY entries so the collection doesn't grow forever
      const extra = await entries.find({}).sort({ createdAt: -1 }).skip(MAX_HISTORY).toArray();
      if (extra.length) await entries.deleteMany({ _id: { $in: extra.map((d) => d._id) } });

      return res.status(201).json({ entry: toClient({ ...doc, _id: insert.insertedId }) });
    }

    if (req.method === "DELETE") {
      await entries.deleteMany({});
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong on the server." });
  }
};
