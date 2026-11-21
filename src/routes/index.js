// Every API endpoint, in one place. Handlers live in src/controllers.
//
// Access:  public       – anyone
//          verifyToken  – logged-in user (Firebase ID token)
//          owner checks for movies/reviews happen inside the controllers

const express = require("express");
const { verifyToken } = require("../middleware/auth");

const stats = require("../controllers/stats.controller");
const movie = require("../controllers/movie.controller");
const review = require("../controllers/review.controller");
const watchlist = require("../controllers/watchlist.controller");
const user = require("../controllers/user.controller");
const tv = require("../controllers/tv.controller");

const router = express.Router();

// ---------- Health & stats ----------
router.get("/", stats.healthCheck);
router.get("/keep-alive", stats.keepAlive);
router.get("/stats/movies-count", stats.getMoviesCount);
router.get("/stats/users-count", stats.getUsersCount);
router.get("/stats/reviews-count", stats.getReviewsCount);
router.get("/stats/genres", stats.getGenreCounts);
router.get("/stats/languages", stats.getLanguageCounts);

// ---------- Movies ----------
router.get("/movies", movie.getAllMovies);
router.get("/movies-top-rated", movie.getTopRatedMovies); // ?limit=N, default 5
router.get("/movies-recent", movie.getRecentMovies); // ?limit=N, default 6
router.get("/movies-browse", movie.browseMovies); // ?search&genre&language&minRating&sort&page&limit
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

// ---------- Watchlist / My List (always the logged-in user's own list) ----------
router.get("/watchlist/me", verifyToken, watchlist.getWatchlist); // saved movies only
router.get("/watchlist/me/all", verifyToken, watchlist.getMyList); // movies + series, newest first
router.post("/watchlist", verifyToken, watchlist.addToWatchlist); // { movieId }
router.delete("/watchlist/me/:movieId", verifyToken, watchlist.removeFromWatchlist);
router.post("/watchlist/series", verifyToken, watchlist.addSeriesToList); // { seriesId } (TMDB id)
router.delete("/watchlist/me/series/:seriesId", verifyToken, watchlist.removeSeriesFromList);
router.get("/stats/watchlist-count/me", verifyToken, watchlist.getWatchlistCount);

// ---------- TV series (from TMDB, cached in MongoDB) ----------
router.get("/tv/lists/:list", tv.getList); // trending | popular | top_rated | airing_today | on_the_air; ?page
router.get("/tv/genres", tv.getGenres);
router.get("/tv/discover", tv.discover); // ?genre=<id>&sort=popular|rating|newest&page
router.get("/tv/search", tv.search); // ?q=&page
router.get("/tv/:id", tv.getSeries);
router.get("/tv/:id/season/:number", tv.getSeason);

// ---------- Users ----------
router.post("/users", verifyToken, user.saveUser);
router.get("/users/me", verifyToken, user.getMe);

module.exports = router;
