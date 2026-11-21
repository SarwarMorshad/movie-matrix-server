const { tmdbGet, image, TmdbError } = require("../services/tmdb");

// TV series from TMDB, reshaped into the simple objects the client uses.

const HOUR = 3600;
const LISTS = ["trending", "popular", "top_rated", "airing_today", "on_the_air"];
const SORTS = { popular: "popularity.desc", rating: "vote_average.desc", newest: "first_air_date.desc" };

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

// One series in a list or grid
const toCard = (t) => ({
  id: t.id,
  type: "series",
  title: t.name,
  year: yearOf(t.first_air_date),
  rating: round1(t.vote_average),
  overview: t.overview || "",
  language: t.original_language || null,
  genreIds: t.genre_ids || (t.genres || []).map((g) => g.id),
  posterUrl: image(t.poster_path, "w500"),
  backdropUrl: image(t.backdrop_path, "w1280"),
});

// TMDB page -> { results, page, totalPages, total }. TMDB serves at most 500 pages.
const toPage = (data) => ({
  results: (data.results || []).filter((t) => t.poster_path).map(toCard),
  page: data.page,
  totalPages: Math.min(data.total_pages || 1, 500),
  total: data.total_results || 0,
});

// GET /tv/lists/:list?page=  (trending | popular | top_rated | airing_today | on_the_air)
const getList = handleTmdb("Error fetching TV list", async (req, res) => {
  const { list } = req.params;
  if (!LISTS.includes(list)) return res.status(400).send({ message: `List must be one of: ${LISTS.join(", ")}` });
  const path = list === "trending" ? "/trending/tv/week" : `/tv/${list}`;
  res.send(toPage(await tmdbGet(path, { page: pageOf(req) }, 6 * HOUR)));
});

// GET /tv/genres -> [{ id, name }]
const getGenres = handleTmdb("Error fetching TV genres", async (req, res) => {
  const data = await tmdbGet("/genre/tv/list", {}, 7 * 24 * HOUR);
  res.send(data.genres || []);
});

// GET /tv/discover?genre=<id>&sort=popular|rating|newest&page=
const discover = handleTmdb("Error discovering TV", async (req, res) => {
  const params = { page: pageOf(req), sort_by: SORTS[req.query.sort] || SORTS.popular };
  const genre = positiveInt(req.query.genre);
  if (genre) params.with_genres = genre;
  // Without a vote floor, "top rated" fills up with shows that have one 10/10 vote
  if (req.query.sort === "rating") params["vote_count.gte"] = 200;
  if (req.query.sort === "newest") params["first_air_date.lte"] = new Date().toISOString().slice(0, 10);
  res.send(toPage(await tmdbGet("/discover/tv", params, 6 * HOUR)));
});

// GET /tv/search?q=&page=
const search = handleTmdb("Error searching TV", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.send({ results: [], page: 1, totalPages: 1, total: 0 });
  res.send(toPage(await tmdbGet("/search/tv", { query: q, page: pageOf(req) }, HOUR)));
});

// GET /tv/:id -> full series details with seasons, cast, trailer and similar shows
const getSeries = handleTmdb("Error fetching series", async (req, res) => {
  const id = positiveInt(req.params.id);
  if (!id) return res.status(400).send({ message: "Invalid series id" });

  const t = await tmdbGet(`/tv/${id}`, { append_to_response: "credits,videos,recommendations,content_ratings" }, 24 * HOUR);

  const videos = t.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");
  const usRating = t.content_ratings?.results?.find((r) => r.iso_3166_1 === "US")?.rating || null;

  res.send({
    ...toCard(t),
    tagline: t.tagline || "",
    genres: (t.genres || []).map((g) => g.name),
    status: t.status,
    firstAirDate: t.first_air_date || null,
    lastAirDate: t.last_air_date || null,
    numberOfSeasons: t.number_of_seasons,
    numberOfEpisodes: t.number_of_episodes,
    episodeRuntime: t.episode_run_time?.[0] || null,
    contentRating: usRating,
    networks: (t.networks || []).map((n) => n.name),
    createdBy: (t.created_by || []).map((c) => c.name),
    voteCount: t.vote_count,
    trailerKey: trailer?.key || null, // YouTube video id
    seasons: (t.seasons || [])
      .filter((s) => s.season_number > 0 && s.episode_count > 0) // skip "Specials"
      .map((s) => ({
        number: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        year: yearOf(s.air_date),
        overview: s.overview || "",
        posterUrl: image(s.poster_path, "w342"),
      })),
    cast: (t.credits?.cast || []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.character,
      photoUrl: image(c.profile_path, "w185"),
    })),
    similar: (t.recommendations?.results || []).filter((s) => s.poster_path).slice(0, 10).map(toCard),
  });
});

// GET /tv/:id/season/:number -> the season's episodes
const getSeason = handleTmdb("Error fetching season", async (req, res) => {
  const id = positiveInt(req.params.id);
  const number = positiveInt(req.params.number);
  if (!id || number === null) return res.status(400).send({ message: "Invalid series or season" });

  const s = await tmdbGet(`/tv/${id}/season/${number}`, {}, 24 * HOUR);
  res.send({
    number: s.season_number,
    name: s.name,
    overview: s.overview || "",
    year: yearOf(s.air_date),
    posterUrl: image(s.poster_path, "w342"),
    episodes: (s.episodes || []).map((e) => ({
      number: e.episode_number,
      name: e.name,
      overview: e.overview || "",
      airDate: e.air_date || null,
      runtime: e.runtime || null,
      rating: round1(e.vote_average),
      stillUrl: image(e.still_path, "w300"),
    })),
  });
});

module.exports = { getList, getGenres, discover, search, getSeries, getSeason };
