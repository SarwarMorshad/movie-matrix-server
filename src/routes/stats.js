const express = require("express");
const { client, collections } = require("../config/db");
const { handle } = require("../utils/http");

const router = express.Router();
const { movies, users, reviews } = collections;

// Health check
router.get("/", (req, res) => {
  res.send("🎬 Movie Matrix Server Is Running!");
});

// Keep-alive: touches the database so the free Atlas cluster isn't paused
// for inactivity. Called daily by the Vercel cron in vercel.json.
router.get("/keep-alive", async (req, res) => {
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
});

router.get(
  "/stats/movies-count",
  handle("Error fetching movie count", async (req, res) => {
    res.send({ totalMovies: await movies.countDocuments() });
  })
);

router.get(
  "/stats/users-count",
  handle("Error fetching user count", async (req, res) => {
    res.send({ totalUsers: await users.countDocuments() });
  })
);

router.get(
  "/stats/reviews-count",
  handle("Error fetching review count", async (req, res) => {
    res.send({ totalReviews: await reviews.countDocuments({ moderated: true }) });
  })
);

module.exports = router;
