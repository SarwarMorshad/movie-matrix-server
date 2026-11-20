const express = require("express");
const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");

const router = express.Router();
const { watchlist, movies } = collections;

// A user's watchlist, as full movie documents
router.get(
  "/watchlist/:email",
  handle("Error fetching watchlist", async (req, res) => {
    const items = await watchlist.find({ email: req.params.email }).toArray();
    if (items.length === 0) return res.send([]);

    const ids = items.map((item) => toObjectId(item.movieId)).filter(Boolean);
    res.send(await movies.find({ _id: { $in: ids } }).toArray());
  })
);

// Add a movie to a watchlist
router.post(
  "/watchlist",
  handle("Error adding to watchlist", async (req, res) => {
    const { email, movieId } = req.body;
    if (!email || !movieId) return res.status(400).send({ message: "Email and movieId are required" });

    const key = { email, movieId: movieId.toString() };
    if (await watchlist.findOne(key)) return res.status(409).send({ message: "Movie already in watchlist" });

    const result = await watchlist.insertOne({ ...key, addedAt: new Date() });
    res.status(201).send({ message: "Added to watchlist", result });
  })
);

// Remove a movie from a watchlist
router.delete(
  "/watchlist/:email/:movieId",
  handle("Error removing from watchlist", async (req, res) => {
    const { email, movieId } = req.params;
    const result = await watchlist.deleteOne({ email, movieId: movieId.toString() });
    if (result.deletedCount === 0) return res.status(404).send({ message: "Movie not found in watchlist" });
    res.send({ message: "Removed from watchlist", result });
  })
);

// Watchlist size for a user
router.get(
  "/stats/watchlist-count/:email",
  handle("Error fetching watchlist count", async (req, res) => {
    res.send({ watchlistCount: await watchlist.countDocuments({ email: req.params.email }) });
  })
);

module.exports = router;
