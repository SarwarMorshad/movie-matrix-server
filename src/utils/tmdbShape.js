const { TmdbError } = require("../services/tmdb");

// Small helpers shared by the TMDB controllers (TV series and films).

const HOUR = 3600;

// Wraps a handler: TMDB errors keep their status (404, 502, 503), others are 500
const handleTmdb = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof TmdbError) return res.status(error.status).send({ message: error.message });
    console.error(`${label}:`, error);
    res.status(500).send({ message: label, error: error.message });
  }
};

const round1 = (n) => (typeof n === "number" ? Math.round(n * 10) / 10 : null);
const yearOf = (date) => (date ? Number(date.slice(0, 4)) : null);
const pageOf = (req) => Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 500);
const positiveInt = (value) => (/^\d{1,9}$/.test(String(value)) ? Number(value) : null);

// Best YouTube trailer from a TMDB videos list: official trailer, any trailer, then a teaser
const pickTrailerKey = (videos = []) =>
  (
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser")
  )?.key || null;

// Best title logo (transparent artwork of the title) from a TMDB images list:
// English first, then one without text language. Needs append_to_response=images
// with include_image_language=en,null.
const pickLogoPath = (logos = []) =>
  (logos.find((l) => l.iso_639_1 === "en") || logos.find((l) => !l.iso_639_1))?.file_path || null;

// TMDB page -> { results, page, totalPages, total }, keeping only items with a poster.
// TMDB serves at most 500 pages.
const toPage = (data, toCard) => ({
  results: (data.results || []).filter((t) => t.poster_path).map(toCard),
  page: data.page,
  totalPages: Math.min(data.total_pages || 1, 500),
  total: data.total_results || 0,
});

module.exports = { HOUR, handleTmdb, round1, yearOf, pageOf, positiveInt, pickTrailerKey, pickLogoPath, toPage };
