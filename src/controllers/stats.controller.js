const { client, collections } = require("../config/db");
const { handle } = require("../utils/http");

const { movies, users, reviews } = collections;

const healthCheck = (req, res) => {
  res.send("🎬 Movie Matrix Server Is Running!");
};

// Touches the database so the free Atlas cluster isn't paused for
// inactivity. Called daily by the Vercel cron in vercel.json.
const keepAlive = async (req, res) => {
  try {
    await client.db("admin").command({ ping: 1 });
    res.send({
      ok: true,
      movieCount: await movies.estimatedDocumentCount(),
      time: new Date().toISOString(),
      // Set by Vercel on Git deploys; shows which commit is live
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    });
  } catch (error) {
    console.error("Keep-alive failed:", error);
    res.status(500).send({ ok: false, error: error.message });
  }
};

const getMoviesCount = handle("Error fetching movie count", async (req, res) => {
  res.send({ totalMovies: await movies.countDocuments() });
});

const getUsersCount = handle("Error fetching user count", async (req, res) => {
  res.send({ totalUsers: await users.countDocuments() });
});

const getReviewsCount = handle("Error fetching review count", async (req, res) => {
  res.send({ totalReviews: await reviews.countDocuments({ moderated: true }) });
});

// Number of movies per genre, most first: [{ genre: "Animation", count: 18 }, ...]
const getGenreCounts = handle("Error fetching genre counts", async (req, res) => {
  const rows = await movies
    .aggregate([
      { $match: { genre: { $type: "string", $ne: "" } } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
  res.send(rows.map((r) => ({ genre: r._id, count: r.count })));
});

// Number of movies per language, most first: [{ language: "English", count: 80 }, ...]
const getLanguageCounts = handle("Error fetching language counts", async (req, res) => {
  const rows = await movies
    .aggregate([
      { $match: { language: { $type: "string", $ne: "" } } },
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
  res.send(rows.map((r) => ({ language: r._id, count: r.count })));
});

module.exports = {
  healthCheck,
  keepAlive,
  getMoviesCount,
  getUsersCount,
  getReviewsCount,
  getGenreCounts,
  getLanguageCounts,
};
