const express = require("express");
const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");
const { verifyToken, isOwnerOrAdmin } = require("../middleware/auth");

const router = express.Router();
const { movies, reviews } = collections;

// Get all movies
router.get(
  "/movies",
  handle("Error fetching movies", async (req, res) => {
    res.send(await movies.find().toArray());
  })
);

// Top rated movies (top 5)
router.get(
  "/movies-top-rated",
  handle("Error fetching top rated movies", async (req, res) => {
    res.send(await movies.find().sort({ rating: -1 }).limit(5).toArray());
  })
);

// Recently added movies (latest 6)
router.get(
  "/movies-recent",
  handle("Error fetching recent movies", async (req, res) => {
    res.send(await movies.find().sort({ _id: -1 }).limit(6).toArray());
  })
);

// Single movie, with its approved reviews and average rating
router.get(
  "/movies/:id",
  handle("Error fetching movie", async (req, res) => {
    const id = req.params.id;
    const _id = toObjectId(id);
    if (!_id) return res.status(400).send({ message: "Invalid movie id" });

    const movie = await movies.findOne({ _id });
    if (!movie) return res.status(404).send({ message: "Movie not found" });

    const movieReviews = await reviews.find({ movieId: id, moderated: true }).sort({ createdAt: -1 }).toArray();

    let averageRating = movie.rating;
    if (movieReviews.length > 0) {
      averageRating = (movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length).toFixed(1);
    }

    res.send({
      ...movie,
      reviews: movieReviews,
      averageRating: parseFloat(averageRating),
      reviewCount: movieReviews.length,
    });
  })
);

// Movies added by the logged-in user (My Collection)
router.get(
  "/my-movies",
  verifyToken,
  handle("Error fetching user movies", async (req, res) => {
    res.send(await movies.find({ addedBy: req.user.email }).toArray());
  })
);

// Add a movie. The owner is always the logged-in user.
router.post(
  "/movies",
  verifyToken,
  handle("Error adding movie", async (req, res) => {
    // Ignore fields the client must not set itself
    const { _id, addedBy, reviewCount, ...fields } = req.body;
    const movie = { ...fields, addedBy: req.user.email };
    if (!movie.title || !movie.genre || !movie.rating) {
      return res.status(400).send({ message: "Missing required fields" });
    }
    res.status(201).send(await movies.insertOne(movie));
  })
);

// Only the user who added a movie, or an admin, may change or delete it
async function loadOwnedMovie(req, res) {
  const _id = toObjectId(req.params.id);
  if (!_id) {
    res.status(400).send({ message: "Invalid movie id" });
    return null;
  }
  const movie = await movies.findOne({ _id }, { projection: { addedBy: 1 } });
  if (!movie) {
    res.status(404).send({ message: "Movie not found" });
    return null;
  }
  if (!isOwnerOrAdmin(req.user, movie.addedBy)) {
    res.status(403).send({ message: "You can only change movies you added" });
    return null;
  }
  return _id;
}

// Update a movie
router.put(
  "/movies/:id",
  verifyToken,
  handle("Error updating movie", async (req, res) => {
    const _id = await loadOwnedMovie(req, res);
    if (!_id) return;

    const m = req.body;
    const result = await movies.updateOne(
      { _id },
      {
        $set: {
          title: m.title,
          genre: m.genre,
          releaseYear: m.releaseYear,
          director: m.director,
          cast: m.cast,
          rating: m.rating,
          duration: m.duration,
          plotSummary: m.plotSummary,
          posterUrl: m.posterUrl,
          language: m.language,
          country: m.country,
        },
      }
    );
    if (result.matchedCount === 0) return res.status(404).send({ message: "Movie not found" });
    res.send(result);
  })
);

// Delete a movie and its reviews
router.delete(
  "/movies/:id",
  verifyToken,
  handle("Error deleting movie", async (req, res) => {
    const _id = await loadOwnedMovie(req, res);
    if (!_id) return;

    await reviews.deleteMany({ movieId: req.params.id });
    const result = await movies.deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).send({ message: "Movie not found" });
    res.send(result);
  })
);

module.exports = router;
