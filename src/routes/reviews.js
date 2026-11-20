const express = require("express");
const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");
const { refreshMovieRating } = require("../utils/ratings");
const { verifyToken, isOwnerOrAdmin } = require("../middleware/auth");

const router = express.Router();
const { reviews } = collections;

// Approved reviews for a movie
router.get(
  "/reviews/:movieId",
  handle("Error fetching reviews", async (req, res) => {
    res.send(await reviews.find({ movieId: req.params.movieId, moderated: true }).sort({ createdAt: -1 }).toArray());
  })
);

// The logged-in user's reviews
router.get(
  "/my-reviews",
  verifyToken,
  handle("Error fetching user reviews", async (req, res) => {
    res.send(await reviews.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray());
  })
);

// Add a review as the logged-in user
router.post(
  "/reviews",
  verifyToken,
  handle("Error adding review", async (req, res) => {
    const { movieId, rating, comment, userName, userPhoto } = req.body;
    const userEmail = req.user.email;

    if (!movieId || !rating) {
      return res.status(400).send({ message: "Movie ID and rating are required" });
    }
    const movieObjectId = toObjectId(movieId);
    const movieExists = movieObjectId && (await collections.movies.countDocuments({ _id: movieObjectId }, { limit: 1 }));
    if (!movieExists) return res.status(404).send({ message: "Movie not found" });
    if (rating < 1 || rating > 10) {
      return res.status(400).send({ message: "Rating must be between 1 and 10" });
    }
    if (await reviews.findOne({ movieId, userEmail })) {
      return res.status(409).send({ message: "You have already reviewed this movie" });
    }

    const review = {
      movieId,
      rating: parseFloat(rating),
      comment: comment || "",
      userEmail,
      userName: userName || req.user.name || "Anonymous",
      userPhoto: userPhoto || req.user.picture || null,
      createdAt: new Date(),
      moderated: true, // auto-approved for now
    };
    const result = await reviews.insertOne(review);
    await refreshMovieRating(movieId);

    res.status(201).send({ message: "Review added successfully", review: { ...review, _id: result.insertedId } });
  })
);

// Update a review (owner or admin)
router.put(
  "/reviews/:id",
  verifyToken,
  handle("Error updating review", async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).send({ message: "Invalid review id" });

    const { rating, comment } = req.body;
    const review = await reviews.findOne({ _id });
    if (!review) return res.status(404).send({ message: "Review not found" });
    if (!isOwnerOrAdmin(req.user, review.userEmail)) {
      return res.status(403).send({ message: "You can only update your own reviews" });
    }
    if (rating && (rating < 1 || rating > 10)) {
      return res.status(400).send({ message: "Rating must be between 1 and 10" });
    }

    const result = await reviews.updateOne(
      { _id },
      {
        $set: {
          rating: rating ? parseFloat(rating) : review.rating,
          comment: comment !== undefined ? comment : review.comment,
          updatedAt: new Date(),
        },
      }
    );
    await refreshMovieRating(review.movieId);

    res.send({ message: "Review updated successfully", result });
  })
);

// Delete a review (owner or admin)
router.delete(
  "/reviews/:id",
  verifyToken,
  handle("Error deleting review", async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).send({ message: "Invalid review id" });

    const review = await reviews.findOne({ _id });
    if (!review) return res.status(404).send({ message: "Review not found" });
    if (!isOwnerOrAdmin(req.user, review.userEmail)) {
      return res.status(403).send({ message: "You can only delete your own reviews" });
    }

    const result = await reviews.deleteOne({ _id });
    await refreshMovieRating(review.movieId);

    res.send({ message: "Review deleted successfully", result });
  })
);

module.exports = router;
