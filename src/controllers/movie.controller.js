const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");
const { isOwnerOrAdmin } = require("../middleware/auth");
const { cleanMovieInput } = require("../utils/movieInput");

const { movies, reviews } = collections;

// Loads the movie in :id and checks the caller added it (or is an admin).
// Sends the error response itself and returns null when not allowed.
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

const getAllMovies = handle("Error fetching movies", async (req, res) => {
  res.send(await movies.find().toArray());
});

// ?limit=N (1-50) lets the client ask for more rows; defaults keep old behaviour
const readLimit = (req, fallback) => {
  const n = parseInt(req.query.limit, 10);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 50) : fallback;
};

const getTopRatedMovies = handle("Error fetching top rated movies", async (req, res) => {
  res.send(await movies.find().sort({ rating: -1 }).limit(readLimit(req, 5)).toArray());
});

const getRecentMovies = handle("Error fetching recent movies", async (req, res) => {
  res.send(await movies.find().sort({ _id: -1 }).limit(readLimit(req, 6)).toArray());
});

// Filtered, sorted, paginated list for the All Movies page.
//   ?search=  title contains (case-insensitive)   ?genre=  exact genre
//   ?language=  exact language                   ?minRating=  number 0-10
//   ?sort=  rating (default) | newest | title     ?page=  1+   ?limit=  1-50 (default 20)
// Returns { movies, total, page, totalPages, limit }
const SORTS = {
  rating: { rating: -1, _id: -1 },
  newest: { releaseYear: -1, _id: -1 },
  added: { _id: -1 },
  title: { title: 1 },
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const browseMovies = handle("Error browsing movies", async (req, res) => {
  const { search, genre, language, minRating, sort } = req.query;
  const filter = {};
  if (search?.trim()) filter.title = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: "i" };
  if (genre) filter.genre = String(genre);
  if (language) filter.language = String(language);
  const min = parseFloat(minRating);
  if (Number.isFinite(min) && min > 0) filter.rating = { $gte: min };

  const limit = readLimit(req, 20);
  const total = await movies.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), totalPages);

  const results = await movies
    .find(filter)
    .sort(SORTS[sort] || SORTS.rating)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  res.send({ movies: results, total, page, totalPages, limit });
});

// Single movie with its approved reviews.
//   rating          the movie's own rating (as entered when it was added)
//   communityRating average of member reviews, or null when there are none
//   averageRating   kept for older clients: communityRating, else rating
const getMovieById = handle("Error fetching movie", async (req, res) => {
  const id = req.params.id;
  const _id = toObjectId(id);
  if (!_id) return res.status(400).send({ message: "Invalid movie id" });

  const movie = await movies.findOne({ _id });
  if (!movie) return res.status(404).send({ message: "Movie not found" });

  const movieReviews = await reviews.find({ movieId: id, moderated: true }).sort({ createdAt: -1 }).toArray();
  const communityRating = movieReviews.length
    ? parseFloat((movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length).toFixed(1))
    : null;

  res.send({
    ...movie,
    reviews: movieReviews,
    communityRating,
    averageRating: communityRating ?? movie.rating,
    reviewCount: movieReviews.length,
  });
});

// Movies added by the logged-in user (My Collection)
const getMyMovies = handle("Error fetching user movies", async (req, res) => {
  res.send(await movies.find({ addedBy: req.user.email }).toArray());
});

// The owner is always the logged-in user; only known, checked fields are stored
const createMovie = handle("Error adding movie", async (req, res) => {
  const { movie, error } = cleanMovieInput(req.body);
  if (error) return res.status(400).send({ message: error });
  res.status(201).send(await movies.insertOne({ ...movie, addedBy: req.user.email, createdAt: new Date() }));
});

const updateMovie = handle("Error updating movie", async (req, res) => {
  const _id = await loadOwnedMovie(req, res);
  if (!_id) return;

  const { movie, error } = cleanMovieInput(req.body);
  if (error) return res.status(400).send({ message: error });

  const result = await movies.updateOne({ _id }, { $set: { ...movie, updatedAt: new Date() } });
  if (result.matchedCount === 0) return res.status(404).send({ message: "Movie not found" });
  res.send(result);
});

// Deletes the movie and its reviews
const deleteMovie = handle("Error deleting movie", async (req, res) => {
  const _id = await loadOwnedMovie(req, res);
  if (!_id) return;

  await reviews.deleteMany({ movieId: req.params.id });
  const result = await movies.deleteOne({ _id });
  if (result.deletedCount === 0) return res.status(404).send({ message: "Movie not found" });
  res.send(result);
});

module.exports = {
  getAllMovies,
  getTopRatedMovies,
  getRecentMovies,
  browseMovies,
  getMovieById,
  getMyMovies,
  createMovie,
  updateMovie,
  deleteMovie,
};
