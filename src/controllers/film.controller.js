const { tmdbGet, image } = require("../services/tmdb");
const { HOUR, handleTmdb, round1, yearOf, pageOf, positiveInt, pickTrailerKey, toPage } = require("../utils/tmdbShape");

// Movies from TMDB ("films", to keep them apart from the members' movies in
// MongoDB), reshaped into the simple objects the client uses.

const LISTS = ["trending", "popular", "top_rated", "now_playing", "upcoming"];

// One film in a list or row
const toCard = (m) => ({
  id: m.id,
  type: "film",
  title: m.title,
  year: yearOf(m.release_date),
  rating: round1(m.vote_average),
  overview: m.overview || "",
  language: m.original_language || null,
  genreIds: m.genre_ids || (m.genres || []).map((g) => g.id),
  posterUrl: image(m.poster_path, "w500"),
  backdropUrl: image(m.backdrop_path, "w1280"),
});

// GET /films/lists/:list?page=  (trending | popular | top_rated | now_playing | upcoming)
const getList = handleTmdb("Error fetching film list", async (req, res) => {
  const { list } = req.params;
  if (!LISTS.includes(list)) return res.status(400).send({ message: `List must be one of: ${LISTS.join(", ")}` });
  const path = list === "trending" ? "/trending/movie/week" : `/movie/${list}`;
  res.send(toPage(await tmdbGet(path, { page: pageOf(req) }, 6 * HOUR), toCard));
});

// GET /films/:id -> full film details with cast, trailer and similar films
const getFilm = handleTmdb("Error fetching film", async (req, res) => {
  const id = positiveInt(req.params.id);
  if (!id) return res.status(400).send({ message: "Invalid film id" });

  const m = await tmdbGet(`/movie/${id}`, { append_to_response: "credits,videos,recommendations,release_dates" }, 24 * HOUR);

  // US age rating, e.g. "PG-13"
  const usRelease = m.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  const certification = usRelease?.release_dates?.find((d) => d.certification)?.certification || null;

  res.send({
    ...toCard(m),
    tagline: m.tagline || "",
    genres: (m.genres || []).map((g) => g.name),
    status: m.status,
    releaseDate: m.release_date || null,
    runtime: m.runtime || null,
    contentRating: certification,
    directors: (m.credits?.crew || []).filter((c) => c.job === "Director").map((c) => c.name),
    countries: (m.production_countries || []).map((c) => c.name),
    voteCount: m.vote_count,
    trailerKey: pickTrailerKey(m.videos?.results), // YouTube video id
    cast: (m.credits?.cast || []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.character,
      photoUrl: image(c.profile_path, "w185"),
    })),
    similar: (m.recommendations?.results || []).filter((s) => s.poster_path).slice(0, 12).map(toCard),
  });
});

module.exports = { getList, getFilm };
