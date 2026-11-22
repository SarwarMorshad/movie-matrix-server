const { collections } = require("../config/db");
const { handle, toObjectId } = require("../utils/http");
const { TmdbError } = require("../services/tmdb");
const { fetchSeriesCard } = require("./tv.controller");
const { fetchFilmCard } = require("./film.controller");

const { watchlist, movies } = collections;

// Watchlist ("My List") documents:
//   movie:  { email, movieId, addedAt }                                   (movieId = our MongoDB id)
//   series: { email, mediaType: "series", tmdbId, series: {card}, addedAt } (card saved from TMDB)
//   film:   { email, mediaType: "film", tmdbId, film: {card}, addedAt }     (a movie from TMDB)

// A user's saved movies, as full movie documents (used by older clients and the movie page)
const getWatchlist = handle("Error fetching watchlist", async (req, res) => {
  const items = await watchlist.find({ email: req.user.email, movieId: { $exists: true } }).toArray();
  if (items.length === 0) return res.send([]);

  const ids = items.map((item) => toObjectId(item.movieId)).filter(Boolean);
  res.send(await movies.find({ _id: { $in: ids } }).toArray());
});

// Everything on My List, newest first: { items: [{ type: "movie" | "series" | "film", addedAt, ...card }] }
const getMyList = handle("Error fetching My List", async (req, res) => {
  const items = await watchlist.find({ email: req.user.email }).sort({ addedAt: -1 }).toArray();

  const movieIds = items.filter((i) => i.movieId).map((i) => toObjectId(i.movieId)).filter(Boolean);
  const movieDocs = await movies.find({ _id: { $in: movieIds } }).toArray();
  const moviesById = Object.fromEntries(movieDocs.map((m) => [String(m._id), m]));

  const result = items
    .map((i) => {
      if (i.mediaType === "series" && i.series) return { type: "series", addedAt: i.addedAt, ...i.series };
      if (i.mediaType === "film" && i.film) return { type: "film", addedAt: i.addedAt, ...i.film };
      const movie = moviesById[i.movieId];
      return movie ? { type: "movie", addedAt: i.addedAt, ...movie } : null; // skip movies deleted since
    })
    .filter(Boolean);

  res.send({ items: result });
});

// Add a movie to the logged-in user's list
const addToWatchlist = handle("Error adding to watchlist", async (req, res) => {
  const { movieId } = req.body;
  if (!movieId) return res.status(400).send({ message: "movieId is required" });

  const key = { email: req.user.email, movieId: movieId.toString() };
  if (await watchlist.findOne(key)) return res.status(409).send({ message: "Movie already in watchlist" });

  const result = await watchlist.insertOne({ ...key, addedAt: new Date() });
  res.status(201).send({ message: "Added to watchlist", result });
});

const removeFromWatchlist = handle("Error removing from watchlist", async (req, res) => {
  const result = await watchlist.deleteOne({ email: req.user.email, movieId: req.params.movieId.toString() });
  if (result.deletedCount === 0) return res.status(404).send({ message: "Movie not found in watchlist" });
  res.send({ message: "Removed from watchlist", result });
});

// Add a TMDB title (series or film) to the logged-in user's list. The card is
// fetched from TMDB here, so the client can't save made-up titles or posters.
const addTmdbTitle = (mediaType, idField, fetchCard, label) =>
  handle(`Error adding ${label} to My List`, async (req, res) => {
    const tmdbId = Number(req.body[idField]);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) return res.status(400).send({ message: `${idField} is required` });

    const key = { email: req.user.email, mediaType, tmdbId };
    if (await watchlist.findOne(key)) return res.status(409).send({ message: `${label} already in My List` });

    let card;
    try {
      card = await fetchCard(tmdbId);
    } catch (error) {
      if (error instanceof TmdbError) return res.status(error.status).send({ message: error.message });
      throw error;
    }

    const result = await watchlist.insertOne({ ...key, [mediaType]: card, addedAt: new Date() });
    res.status(201).send({ message: "Added to My List", result });
  });

const removeTmdbTitle = (mediaType, param, label) =>
  handle(`Error removing ${label} from My List`, async (req, res) => {
    const tmdbId = Number(req.params[param]);
    const result = await watchlist.deleteOne({ email: req.user.email, mediaType, tmdbId });
    if (result.deletedCount === 0) return res.status(404).send({ message: `${label} not found in My List` });
    res.send({ message: "Removed from My List", result });
  });

const addSeriesToList = addTmdbTitle("series", "seriesId", fetchSeriesCard, "Series");
const removeSeriesFromList = removeTmdbTitle("series", "seriesId", "Series");
const addFilmToList = addTmdbTitle("film", "filmId", fetchFilmCard, "Film");
const removeFilmFromList = removeTmdbTitle("film", "filmId", "Film");

const getWatchlistCount = handle("Error fetching watchlist count", async (req, res) => {
  res.send({ watchlistCount: await watchlist.countDocuments({ email: req.user.email }) });
});

module.exports = {
  getWatchlist,
  getMyList,
  addToWatchlist,
  removeFromWatchlist,
  addSeriesToList,
  removeSeriesFromList,
  addFilmToList,
  removeFilmFromList,
  getWatchlistCount,
};
