const { tmdbGet, image } = require("../services/tmdb");
const { HOUR, handleTmdb, round1, yearOf, pageOf, positiveInt, pickTrailerKey, pickLogoPath, toPage: toPageOf } = require("../utils/tmdbShape");

// TV series from TMDB, reshaped into the simple objects the client uses.

const LISTS = ["trending", "popular", "top_rated", "airing_today", "on_the_air"];
const SORTS = { popular: "popularity.desc", rating: "vote_average.desc", newest: "first_air_date.desc" };

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

const toPage = (data) => toPageOf(data, toCard);

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

  const t = await tmdbGet(`/tv/${id}`, { append_to_response: "credits,videos,recommendations,content_ratings,images", include_image_language: "en,null" }, 24 * HOUR);

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
    trailerKey: pickTrailerKey(t.videos?.results), // YouTube video id
    logoUrl: image(pickLogoPath(t.images?.logos), "w500"), // title artwork, or null
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

// Card details for one series (used when saving a series to My List).
// Throws TmdbError (404 when the series doesn't exist).
const fetchSeriesCard = async (id) => toCard(await tmdbGet(`/tv/${id}`, {}, 24 * HOUR));

module.exports = { getList, getGenres, discover, search, getSeries, getSeason, fetchSeriesCard, toCard };
