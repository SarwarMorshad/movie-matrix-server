const { MongoClient, ServerApiVersion } = require("mongodb");

// Prefer a full connection string in MONGODB_URI. Fall back to the old
// DB_USERNAME / DB_PASSWORD pair so existing deployments keep working.
const uri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.cjj6frc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db(process.env.DB_NAME || "movieMatrixDB");

const collections = {
  movies: db.collection("movies"),
  users: db.collection("users"),
  watchlist: db.collection("watchlist"),
  reviews: db.collection("reviews"),
};

module.exports = { client, db, collections };
