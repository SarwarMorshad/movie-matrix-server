const { collections } = require("../config/db");
const { tmdbGet } = require("../services/tmdb");
const { HOUR, handleTmdb, pageOf } = require("../utils/tmdbShape");
const { escapeRegex } = require("../utils/http");
const { toCard: filmCard } = require("./film.controller");
const { toCard: seriesCard } = require("./tv.controller");

const { movies } = collections;

// One search box for the whole site: TMDB films and series, plus the members' own movies.

const TYPES = ["all", "film", "series"];
const MEMBER_FIELDS = { title: 1, posterUrl: 1, releaseYear: 1, rating: 1, genre: 1 };

// TMDB result -> card; people and titles without a poster are dropped
const toTitle = (t, type) => {
  if (!t.poster_path) return null;
  if (type === "film" || t.media_type === "movie") return filmCard(t);
  if (type === "series" || t.media_type === "tv") return seriesCard(t);
  return null;
};

const searchMembers = (q, limit) =>
  movies
    .find({ title: { $regex: escapeRegex(q), $options: "i" } }, { projection: MEMBER_FIELDS })
    .sort({ rating: -1 })
    .limit(limit)
    .toArray();

// GET /search?q=&type=all|film|series&page=
// -> { query, results: [film/series cards], members: [movies], page, totalPages, total }
// Members' movies come with page 1 only.
const search = handleTmdb("Error searching", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  const type = TYPES.includes(req.query.type) ? req.query.type : "all";
  const page = pageOf(req);
  if (!q) return res.send({ query: "", results: [], members: [], page: 1, totalPages: 1, total: 0 });

  const path = { all: "/search/multi", film: "/search/movie", series: "/search/tv" }[type];
  const [data, members] = await Promise.all([
    tmdbGet(path, { query: q, page, include_adult: false }, HOUR),
    page === 1 ? searchMembers(q, 12) : [],
  ]);

  res.send({
    query: q,
    results: (data.results || []).map((t) => toTitle(t, type)).filter(Boolean),
    members,
    page: data.page || page,
    totalPages: Math.min(data.total_pages || 1, 500),
    total: data.total_results || 0,
  });
});

module.exports = { search };
