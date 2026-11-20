const express = require("express");
const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");
const { refreshMovieRating } = require("../utils/ratings");

const router = express.Router();
const { reviews } = collections;

// Approved reviews for a movie
router.get(
  "/reviews/:movieId",
  handle("Error fetching reviews", async (req, res) => {
    res.send(await reviews.find({ movieId: req.params.movieId, moderated: true }).sort({ createdAt: -1 }).toArray());
  })
);

// A user's own reviews
router.get(
  "/my-reviews",
  handle("Error fetching user reviews", async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).send({ message: "Email is required" });
    res.send(await reviews.find({ userEmail: email }).sort({ createdAt: -1 }).toArray());
  })
);

// Add a review
router.post(
  "/reviews",
  handle("Error adding review", async (req, res) => {
    const { movieId, rating, comment, userEmail, userName, userPhoto } = req.body;

    if (!movieId || !rating || !userEmail) {
      return res.status(400).send({ message: "Movie ID, rating, and user email are required" });
    }
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
      userName: userName || "Anonymous",
      userPhoto: userPhoto || null,
      createdAt: new Date(),
      moderated: true, // auto-approved for now
    };
    const result = await reviews.insertOne(review);
    await refreshMovieRating(movieId);

    res.status(201).send({ message: "Review added successfully", review: { ...review, _id: result.insertedId } });
  })
);

// Update a review (owner only)
router.put(
  "/reviews/:id",
  handle("Error updating review", async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).send({ message: "Invalid review id" });

    const { rating, comment, userEmail } = req.body;
    const review = await reviews.findOne({ _id });
    if (!review) return res.status(404).send({ message: "Review not found" });
    if (review.userEmail !== userEmail) {
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

// Delete a review (owner only)
router.delete(
  "/reviews/:id",
  handle("Error deleting review", async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).send({ message: "Invalid review id" });

    const userEmail = req.query.email;
    if (!userEmail) return res.status(400).send({ message: "User email is required" });

    const review = await reviews.findOne({ _id });
    if (!review) return res.status(404).send({ message: "Review not found" });
    if (review.userEmail !== userEmail) {
      return res.status(403).send({ message: "You can only delete your own reviews" });
    }

    const result = await reviews.deleteOne({ _id });
    await refreshMovieRating(review.movieId);

    res.send({ message: "Review deleted successfully", result });
  })
);

module.exports = router;
