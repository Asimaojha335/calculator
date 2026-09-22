const { MongoClient } = require("mongodb");

let cachedClient = global._mongoClientCalc;

async function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI);
    global._mongoClientCalc = cachedClient;
  }
  if (!cachedClient.topology || !cachedClient.topology.isConnected()) {
    await cachedClient.connect();
  }
  return cachedClient.db("calculator_app");
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = { getDb, setCors };
