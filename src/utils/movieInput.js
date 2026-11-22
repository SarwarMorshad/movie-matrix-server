// Checks a movie sent by a member (add or edit) and keeps only the fields
// members may set. Returns { movie } or { error }.

const GENRES = [
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western",
];

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const isHttpUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const cleanMovieInput = (body = {}) => {
  const thisYear = new Date().getFullYear();
  const movie = {
    title: text(body.title, 150),
    genre: text(body.genre, 40),
    releaseYear: Number(body.releaseYear),
    director: text(body.director, 100),
    cast: text(body.cast, 400),
    rating: Number(body.rating),
    duration: Number(body.duration),
    plotSummary: text(body.plotSummary, 2000),
    posterUrl: text(body.posterUrl, 500),
    language: text(body.language, 40),
    country: text(body.country, 60),
  };

  if (!movie.title) return { error: "Title is required" };
  if (!GENRES.includes(movie.genre)) return { error: "Pick a genre from the list" };
  if (!Number.isInteger(movie.releaseYear) || movie.releaseYear < 1888 || movie.releaseYear > thisYear + 5) {
    return { error: `Release year must be between 1888 and ${thisYear + 5}` };
  }
  if (!movie.director) return { error: "Director is required" };
  if (!movie.cast) return { error: "Cast is required" };
  if (!Number.isFinite(movie.rating) || movie.rating < 0 || movie.rating > 10) {
    return { error: "Rating must be between 0 and 10" };
  }
  movie.rating = Math.round(movie.rating * 10) / 10;
  if (!Number.isInteger(movie.duration) || movie.duration < 1 || movie.duration > 900) {
    return { error: "Duration must be between 1 and 900 minutes" };
  }
  if (movie.plotSummary.length < 10) return { error: "Plot summary must be at least 10 characters" };
  if (!isHttpUrl(movie.posterUrl)) return { error: "Poster URL must be a link starting with http:// or https://" };
  if (!movie.language) return { error: "Language is required" };
  if (!movie.country) return { error: "Country is required" };

  return { movie };
};

module.exports = { cleanMovieInput, GENRES };
