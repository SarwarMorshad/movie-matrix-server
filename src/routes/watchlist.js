const express = require("express");
const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");
const { verifyToken, sameUserParam } = require("../middleware/auth");

const router = express.Router();
const { watchlist, movies } = collections;

// Every watchlist route needs a logged-in user, and users can only see or
// change their own list (admins can see anyone's).

// A user's watchlist, as full movie documents
router.get(
  "/watchlist/:email",
  verifyToken,
  sameUserParam,
  handle("Error fetching watchlist", async (req, res) => {
    const items = await watchlist.find({ email: req.params.email.toLowerCase() }).toArray();
    if (items.length === 0) return res.send([]);

    const ids = items.map((item) => toObjectId(item.movieId)).filter(Boolean);
    res.send(await movies.find({ _id: { $in: ids } }).toArray());
  })
);

// Add a movie to the logged-in user's watchlist
router.post(
  "/watchlist",
  verifyToken,
  handle("Error adding to watchlist", async (req, res) => {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).send({ message: "movieId is required" });

    const key = { email: req.user.email, movieId: movieId.toString() };
    if (await watchlist.findOne(key)) return res.status(409).send({ message: "Movie already in watchlist" });

    const result = await watchlist.insertOne({ ...key, addedAt: new Date() });
    res.status(201).send({ message: "Added to watchlist", result });
  })
);

// Remove a movie from a watchlist
router.delete(
  "/watchlist/:email/:movieId",
  verifyToken,
  sameUserParam,
  handle("Error removing from watchlist", async (req, res) => {
    const { email, movieId } = req.params;
    const result = await watchlist.deleteOne({ email: email.toLowerCase(), movieId: movieId.toString() });
    if (result.deletedCount === 0) return res.status(404).send({ message: "Movie not found in watchlist" });
    res.send({ message: "Removed from watchlist", result });
  })
);

// Watchlist size for a user
router.get(
  "/stats/watchlist-count/:email",
  verifyToken,
  sameUserParam,
  handle("Error fetching watchlist count", async (req, res) => {
    res.send({ watchlistCount: await watchlist.countDocuments({ email: req.params.email.toLowerCase() }) });
  })
);

module.exports = router;
