// Every API endpoint, in one place. Handlers live in src/controllers.
//
// Access:  public       – anyone
//          verifyToken  – logged-in user (Firebase ID token)
//          sameUserParam – :email must be the caller's own (or caller is admin)
//          owner checks for movies/reviews happen inside the controllers

const express = require("express");
const { verifyToken, sameUserParam } = require("../middleware/auth");

const stats = require("../controllers/stats.controller");
const movie = require("../controllers/movie.controller");
const review = require("../controllers/review.controller");
const watchlist = require("../controllers/watchlist.controller");
const user = require("../controllers/user.controller");

const router = express.Router();

// ---------- Health & stats ----------
router.get("/", stats.healthCheck);
router.get("/keep-alive", stats.keepAlive);
router.get("/stats/movies-count", stats.getMoviesCount);
router.get("/stats/users-count", stats.getUsersCount);
router.get("/stats/reviews-count", stats.getReviewsCount);

// ---------- Movies ----------
router.get("/movies", movie.getAllMovies);
router.get("/movies-top-rated", movie.getTopRatedMovies);
router.get("/movies-recent", movie.getRecentMovies);
router.get("/movies/:id", movie.getMovieById);
router.get("/my-movies", verifyToken, movie.getMyMovies);
router.post("/movies", verifyToken, movie.createMovie);
router.put("/movies/:id", verifyToken, movie.updateMovie); // owner or admin
router.delete("/movies/:id", verifyToken, movie.deleteMovie); // owner or admin

// ---------- Reviews ----------
router.get("/reviews/:movieId", review.getMovieReviews);
router.get("/my-reviews", verifyToken, review.getMyReviews);
router.post("/reviews", verifyToken, review.createReview);
router.put("/reviews/:id", verifyToken, review.updateReview); // owner or admin
router.delete("/reviews/:id", verifyToken, review.deleteReview); // owner or admin

// ---------- Watchlist ----------
// "me" routes take the user from the token. They must come before the
// :email routes so "me" isn't read as an email.
router.get("/watchlist/me", verifyToken, watchlist.getWatchlist);
router.delete("/watchlist/me/:movieId", verifyToken, watchlist.removeFromWatchlist);
router.get("/stats/watchlist-count/me", verifyToken, watchlist.getWatchlistCount);
router.post("/watchlist", verifyToken, watchlist.addToWatchlist);
// Older email routes, kept until the new client is live. Users can only
// pass their own email (admins any).
router.get("/watchlist/:email", verifyToken, sameUserParam, watchlist.getWatchlist);
router.delete("/watchlist/:email/:movieId", verifyToken, sameUserParam, watchlist.removeFromWatchlist);
router.get("/stats/watchlist-count/:email", verifyToken, sameUserParam, watchlist.getWatchlistCount);

// ---------- Users ----------
router.post("/users", verifyToken, user.saveUser);
router.get("/users/me", verifyToken, user.getMe);

module.exports = router;
