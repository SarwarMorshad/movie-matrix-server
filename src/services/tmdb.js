// Small client for The Movie Database (TMDB) API.
// The key never leaves the server. Responses are cached in MongoDB so repeat
// visits are fast and we stay well inside TMDB's rate limits.
//
// Auth: TMDB_ACCESS_TOKEN (the "API Read Access Token", preferred) or TMDB_API_KEY (v3 key).

const { db } = require("../config/db");

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p";

const cache = db.collection("tmdb_cache");
let cacheIndexReady = null;

class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const isConfigured = () => Boolean(process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY);

// Builds a full image URL, e.g. image("/abc.jpg", "w500"). Returns null for missing paths.
const image = (path, size = "w500") => (path ? `${IMAGE_URL}/${size}${path}` : null);

async function ensureCacheIndex() {
  // Documents remove themselves once expiresAt has passed
  cacheIndexReady ??= cache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
  return cacheIndexReady;
}

/**
 * GET a TMDB path with query params, cached for ttlSeconds.
 *   await tmdbGet("/tv/popular", { page: 2 }, 6 * 3600)
 */
async function tmdbGet(path, params = {}, ttlSeconds = 6 * 3600) {
  if (!isConfigured()) throw new TmdbError("TV data isn't configured on the server", 503);

  const query = new URLSearchParams({ language: "en-US", ...params });
  if (!process.env.TMDB_ACCESS_TOKEN) query.set("api_key", process.env.TMDB_API_KEY);
  const key = `${path}?${[...query].filter(([k]) => k !== "api_key").map(([k, v]) => `${k}=${v}`).join("&")}`;

  await ensureCacheIndex();
  const hit = await cache.findOne({ _id: key });
  if (hit && hit.expiresAt > new Date()) return hit.data;

  const res = await fetch(`${BASE_URL}${path}?${query}`, {
    headers: process.env.TMDB_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` } : {},
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404) throw new TmdbError("Not found", 404);
  if (!res.ok) throw new TmdbError(`TMDB request failed (${res.status})`, 502);

  const data = await res.json();
  await cache.updateOne(
    { _id: key },
    { $set: { data, expiresAt: new Date(Date.now() + ttlSeconds * 1000) } },
    { upsert: true }
  );
  return data;
}

module.exports = { tmdbGet, image, isConfigured, TmdbError };
